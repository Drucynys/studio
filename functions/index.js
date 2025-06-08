const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { createWorker } = require('tesseract.js');
const sharp = require('sharp'); // Import sharp for image processing
const axios = require('axios'); // Keep axios, though currently not used for OCR

admin.initializeApp();
const db = admin.firestore();

/**
 * Firebase Cloud Function to process newly uploaded Pokémon card images.
 * Triggers on new image uploads to /card_uploads/{uid}/{filename}
 * Performs image preprocessing (grayscale, crop) and OCR to extract text,
 * then saves the extracted text to Firestore.
 */
exports.processCardUpload = functions.storage.object().matches({
  // You might want to specify your bucket name here if not using the default
  // bucket: 'your-firebase-storage-bucket-name',
  destination: '/card_uploads/{uid}/{filename}',
}).onFinalize(async (object) => {
  const fileBucket = object.bucket; // The Storage bucket that contains the file.
  const filePath = object.name; // File path in the bucket.
  const contentType = object.contentType; // File content type.
  const resourceState = object.resourceState; // The resourceState is 'exists' or 'not_exists'

  // Exit if this is a deletion or a move
  if (resourceState === 'not_exists') {
    console.log('File deleted.');
    return null;
  }

  // Exit if the file is not an image.
  if (!contentType.startsWith('image/')) {
    console.log('This is not an image.');
    return null;
  }

  // Get the uid from the file path
  const filePathParts = filePath.split('/');
  if (filePathParts.length !== 3 || filePathParts[0] !== 'card_uploads') {
      console.error('Invalid file path structure:', filePath);
      return null;
  }
  const uid = filePathParts[1];
  const filename = filePathParts[2];

  console.log(`Processing file: ${filePath} for user: ${uid}`);

  const bucket = admin.storage().bucket(fileBucket);
  const file = bucket.file(filePath);

  let extractedText = '';
  let worker;

  try {
    // Download the image file buffer
    const [imageBuffer] = await file.download();
    console.log('Image downloaded successfully.');

    // --- Image Preprocessing with Sharp ---
    // Convert to grayscale and crop the top 30%
    const image = sharp(imageBuffer);
    const metadata = await image.metadata();
    const cropHeight = Math.floor(metadata.height * 0.3);

    const processedImageBuffer = await image
      .grayscale() // Convert to grayscale
      // .contrast(1) // Optional: Increase contrast (adjust value as needed)
      .extract({ top: 0, left: 0, width: metadata.width, height: cropHeight }) // Crop top 30%
      .toBuffer(); // Generate the processed buffer

    console.log('Image preprocessed (grayscale, cropped).');
    // --- End Image Preprocessing ---

    // Initialize Tesseract worker
    worker = createWorker();
    await worker.load();
    // Assuming English text on cards. You might need to handle other languages.
    await worker.loadLanguage('eng');
    await worker.initialize('eng');
    console.log('Tesseract worker initialized.');

    // Perform OCR on the processed image buffer
    const { data: { text } } = await worker.recognize(processedImageBuffer);
    extractedText = text;
    console.log('OCR complete. Extracted text:', extractedText);

    // --- Extract Pokémon name and card number using regex ---
    const { pokemonName, cardNumber } = extractCardDetails(extractedText);
    console.log(`Extracted details - Pokémon Name: ${pokemonName}, Card Number: ${cardNumber}`);
    // --- End Extraction ---


  } catch (error) {
    console.error('Error during image processing or OCR:', error);
    extractedText = `OCR Failed: ${error.message}`;

  } finally {
      // Terminate the worker to free up resources
      if (worker) {
          await worker.terminate();
          console.log('Tesseract worker terminated.');
      }
  }

  // Save the extracted text to Firestore
  try {
    const cardData = {
      filename: filename,
      originalImagePath: filePath, // Store the original image path
      extractedText: extractedText,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      pokemonName: pokemonName || null, // Store extracted Pokémon name (or null if not found)
      cardNumber: cardNumber || null, // Store extracted card number (or null if not found)
    };

    await db.collection('users').doc(uid).collection('cards').add(cardData);
    console.log(`Extracted text saved to Firestore for user ${uid}.`);

  } catch (error) {
    console.error('Error saving to Firestore:', error);
    // Handle Firestore saving error
  }

  return null; // Cloud Functions should return null or a Promise
});

/**
 * Function to extract Pokémon name and card number from extracted text.
 * This is a basic implementation and may need refinement based on typical OCR output.
 * @param {string} text - The text extracted by OCR.
 * @returns {{pokemonName: string | null, cardNumber: string | null}} - Extracted details.
 */
function extractCardDetails(text) {
  let pokemonName = null;
  let cardNumber = null;

  // Basic regex to find potential Pokémon names (assuming capitalized words)
  // This is a simplistic approach and might require a more comprehensive list or dictionary
  const pokemonNameMatch = text.match(/[A-Z][a-z]+(?: [A-Z][a-z]+)*/);
  if (pokemonNameMatch) {
    // Consider potential false positives and refine this logic
    // For now, take the first match as a potential name
    pokemonName = pokemonNameMatch[0];
  }

  // Basic regex to find potential card numbers (e.g., 123/456, SWSH001)
  const cardNumberMatch = text.match(/\d+\/\d+|\w+\d+/);
  if (cardNumberMatch) {
    cardNumber = cardNumberMatch[0];
  }

  // Further refinement might involve comparing extracted names against a known list of Pokémon.

  return { pokemonName, cardNumber };
}
