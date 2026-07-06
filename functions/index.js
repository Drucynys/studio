const functions = require('firebase-functions');
const admin = require('firebase-admin');
const sharp = require('sharp'); // Import sharp for image processing
const axios = require('axios'); // Keep axios, though currently not used for OCR

// Initialize admin with the correct region
admin.initializeApp();
const db = admin.firestore();

// Set the region to a supported European region close to your Firestore
const europeFunctions = functions.region('europe-west1');

/**
 * Firebase Cloud Function to process newly uploaded Pokémon card images.
 * Triggers on new image uploads to /card_uploads/{uid}/{filename}
 * Performs image preprocessing (grayscale, crop) and OCR to extract text,
 * then saves the extracted text to Firestore.
 */
exports.processCardUpload = europeFunctions.storage.object().onFinalize(async (object) => {
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

  // Check if the file is in the correct path (card_uploads/{uid}/{filename})
  const filePathParts = filePath.split('/');
  if (filePathParts.length !== 3 || filePathParts[0] !== 'card_uploads') {
    console.log('File not in card_uploads directory, skipping:', filePath);
    return null;
  }
  const uid = filePathParts[1];
  const filename = filePathParts[2];

  console.log(`Processing file: ${filePath} for user: ${uid}`);

  const bucket = admin.storage().bucket(fileBucket);
  const file = bucket.file(filePath);

  let extractedText = '';
  let worker;
  let pokemonName = null;
  let cardNumber = null;

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

    // --- OCR with Tesseract.js v5 ---
    console.log('Initializing Tesseract worker...');
    const { createWorker } = await import('tesseract.js');
    worker = await createWorker('eng');
    console.log('Tesseract worker initialized.');

    // Perform OCR on the processed image buffer
    const {
      data: { text },
    } = await worker.recognize(processedImageBuffer);
    extractedText = text;
    console.log('OCR complete. Extracted text:', extractedText);

    // --- Extract Pokémon name and card number using regex ---
    const details = extractCardDetails(extractedText);
    pokemonName = details.pokemonName;
    cardNumber = details.cardNumber;
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

/**
 * Cloud Function to create a notification when a user gains a new follower.
 * Triggers when a document is created in any user's 'followers' subcollection.
 */
exports.notifyOnNewFollower = europeFunctions.firestore
  .document('users/{followedUid}/followers/{followerUid}')
  .onCreate(async (snap, context) => {
    const { followedUid, followerUid } = context.params;
    console.log(`🔔 TRIGGER: User ${followerUid} started following user ${followedUid}`);
    console.log(`📄 Snap data:`, snap.data());

    try {
      // Get the follower's display name
      console.log(`🔍 Looking up follower: ${followerUid}`);
      const followerDoc = await db.collection('users').doc(followerUid).get();

      if (!followerDoc.exists) {
        console.error(`❌ Follower user document ${followerUid} not found.`);
        return null;
      }

      const followerData = followerDoc.data();
      const followerDisplayName = followerData.displayName || 'A new user';
      console.log(`👤 Follower display name: ${followerDisplayName}`);

      // Create the notification document
      const notification = {
        type: 'new_follower',
        followerUid: followerUid,
        followerDisplayName: followerDisplayName,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        read: false,
      };

      console.log(`📝 Creating notification:`, notification);

      // Add the notification to the 'notifications' subcollection
      const notificationRef = await db
        .collection('users')
        .doc(followedUid)
        .collection('notifications')
        .add(notification);

      console.log(`✅ Notification created with ID: ${notificationRef.id} for user ${followedUid}`);
      return null;
    } catch (error) {
      console.error('❌ Error creating new follower notification:', error);
      console.error('Error details:', error.code, error.message);
      return null;
    }
  });

/**
 * A scheduled function that runs daily to downsample the priceHistory collection
 * to save on storage costs, while preserving historical trends.
 * - Keeps daily data for the last 30 days.
 * - Keeps data every 3 days for 31-90 days old.
 * - Keeps weekly data for 91-365 days old.
 * - Deletes data older than 365 days.
 */
exports.downsamplePriceHistory = europeFunctions.pubsub
  .schedule('every day 03:00')
  .timeZone('UTC')
  .onRun(async (context) => {
    console.log('📈 Starting price history downsampling job.');
    const db = admin.firestore();
    const batchSize = 200; // Process 200 documents at a time to stay within limits.

    // Helper function to process a query in batches and delete documents based on a condition.
    async function processQuery(query, shouldDelete) {
      let snapshot = await query.limit(batchSize).get();
      let docsDeleted = 0;

      while (snapshot.size > 0) {
        const batch = db.batch();
        snapshot.docs.forEach((doc) => {
          if (shouldDelete(doc)) {
            batch.delete(doc.ref);
            docsDeleted++;
          }
        });
        await batch.commit();

        if (snapshot.docs.length < batchSize) {
          break; // Last batch
        }

        const lastVisible = snapshot.docs[snapshot.docs.length - 1];
        snapshot = await query.startAfter(lastVisible).limit(batchSize).get();
      }
      console.log(`Deleted ${docsDeleted} documents for the current query.`);
    }

    const now = new Date();
    const daysAgo = (days) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    const thirtyDaysAgo = admin.firestore.Timestamp.fromDate(daysAgo(30));
    const ninetyDaysAgo = admin.firestore.Timestamp.fromDate(daysAgo(90));
    const oneYearAgo = admin.firestore.Timestamp.fromDate(daysAgo(365));

    // --- Logic for data 31-90 days old (keep 1 every 3 days) ---
    console.log('Processing data between 31 and 90 days old to sample every 3 days...');
    const ninetyDayQuery = db
      .collection('priceHistory')
      .where('date', '<=', thirtyDaysAgo)
      .where('date', '>', ninetyDaysAgo);

    await processQuery(ninetyDayQuery, (doc) => {
      const date = doc.data().date.toDate();
      // A simple sampling strategy: keep if day of the month is a multiple of 3 (e.g., 1st, 4th, 7th...)
      return date.getDate() % 3 !== 1;
    });

    // --- Logic for data 91-365 days old (keep 1 every 7 days) ---
    console.log('Processing data between 91 and 365 days old to sample weekly...');
    const oneYearQuery = db
      .collection('priceHistory')
      .where('date', '<=', ninetyDaysAgo)
      .where('date', '>', oneYearAgo);

    await processQuery(oneYearQuery, (doc) => {
      const date = doc.data().date.toDate();
      // Keep if it's the first day of the week (Sunday).
      return date.getDay() !== 0; // 0 = Sunday
    });

    // --- Logic for data older than 365 days (delete all) ---
    console.log('Deleting data older than 1 year...');
    const deleteQuery = db.collection('priceHistory').where('date', '<=', oneYearAgo);
    await processQuery(deleteQuery, (doc) => true); // Delete all matched documents

    console.log('✅ Price history downsampling job finished.');
    return null;
  });
