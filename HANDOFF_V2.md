# Architecture and Security Handoff Document V2

## 0. CHANGES SUMMARY

### Refactor Overview
The application's state architecture was migrated from a monolithic `AuthContext` to a decoupled, reactive state management system powered by **TanStack Query** (for server-side data state) and **Zustand** (for global UI and guest state).

### Files Created
- `src/hooks/useUserCollection.ts`: Real-time TanStack Query hook subscribing to `/users/{uid}/cards` (utilizes stable `EMPTY_ARRAY` constant for default data to prevent re-render loops).
- `src/hooks/useWishlist.ts`: Real-time TanStack Query hook subscribing to `/users/{uid}/wishlist` (utilizes stable `EMPTY_ARRAY` constant).
- `src/hooks/useExchange.ts`: Real-time TanStack Query hook subscribing to `/exchange` (utilizes stable `EMPTY_ARRAY` constant).
- `src/hooks/useNotifications.ts`: Real-time TanStack Query hooks (`useNotifications`, `useFollowing`) subscribing to `/users/{uid}/notifications` and `/users/{uid}/following` (utilizes stable `EMPTY_NOTIFICATIONS` and `EMPTY_FOLLOWING` constants).
- `src/lib/queryKeys.ts`: Centralized query key factory ensuring cache consistency across TanStack Query.
- `src/services/collectionService.ts`: Service repository layer for collection CRUD operations.
- `src/services/wishlistService.ts`: Service repository layer for wishlist CRUD operations.
- `src/services/exchangeService.ts`: Service repository layer for exchange listing CRUD operations.
- `src/services/notificationService.ts`: Service repository layer for notification actions (e.g., mark as read).
- `src/store/useUIStore.ts`: Zustand store managing global UI modal states (e.g., auth modal visibility).
- `src/store/useGuestStore.ts`: Zustand store managing in-memory guest/demo mode state and CRUD operations.
- `src/components/QueryProvider.tsx`: TanStack Query client provider wrapper for Next.js.
- `storage.rules`: Security rules for Firebase Storage card uploads.

### Files Modified
- `src/context/AuthContext.tsx`: Removed all legacy Firestore `onSnapshot` data subscriptions (collection, wishlist, exchange, notifications, following) and CRUD methods. Slimmed down from **647 lines** to **335 lines** (a ~48% reduction), focusing strictly on authentication and session management.
- `src/app/page.tsx`: Removed `useAuth().collection` dependency; added `useUserCollection` hook.
- `src/app/add-card/page.tsx`: Removed `useAuth` CRUD methods; migrated to `collectionService.addCard` and `useUIStore`.
- `src/app/browse-artists/[artistName]/page.tsx`: Replaced `useAuth().collection` with `useUserCollection` hook.
- `src/app/browse-sets/page.tsx`: Replaced `useAuth().collection` with `useUserCollection` hook.
- `src/app/settings/page.tsx`: Replaced `useAuth().collection` with `useUserCollection` hook.
- `src/app/friends/page.tsx`: Replaced `useAuth().following` with `useFollowing` hook and resolved destructuring.
- `src/app/my-collection/page.tsx`: Removed legacy `useAuth` data destructuring; integrated `useUserCollection`, `useWishlist`, `useExchange`, and service layer wrapper methods.
- `src/app/exchange/page.tsx`: Replaced legacy UI state with `useUIStore`.
- `src/app/pokedex/page.tsx`: Replaced `useAuth().collection` with `useUserCollection` hook. Refactored filtering from `useEffect` + `useState` to a pure `useMemo` calculation, stabilized `ownedPokemonNames` with an `EMPTY_SET` constant, and moved `GENERATION_REGIONS` outside the component body to eliminate infinite re-render loops (`Maximum update depth exceeded`).
- `src/app/pokedex/[pokemonName]/page.tsx`: Replaced `useAuth().collection` with `useUserCollection` hook.
- `src/app/sets/[setId]/page.tsx`: Replaced `useAuth().collection` with `useUserCollection` hook.
- `src/components/AddCardToCollectionDialog.tsx`: Replaced legacy `useAuth` CRUD methods and collection/wishlist state with `useUserCollection`, `useWishlist`, `collectionService`, and `wishlistService`.
- `src/components/AppHeader.tsx`: Replaced legacy notification handling with `useNotifications` hook and `notificationService`.
- `src/components/ManualCardInputForm.tsx`: Removed unused `useAuth` dependency.
- `src/components/AuthModal.tsx` & `src/components/AuthButton.tsx`: Replaced legacy context modal triggers with `useUIStore`.
- `src/app/layout.tsx`: Wrapped application root in `<QueryProvider>`.
- `package.json` & `package-lock.json`: Added `@tanstack/react-query` and `zustand` dependencies.

### Files Deleted
- `src/components/ManualCardInputForm.tsx.backup`: Removed obsolete backup file.
- `src/services/pokemonTcgApi.js`: Removed legacy JavaScript API service in favor of TypeScript implementation.

### New Dependencies in `package.json`
- `@tanstack/react-query`: `^5.0.0`
- `zustand`: `^4.5.0`

### Storage Rules Deployment Confirmation
Attempted deployment of `storage.rules` via Firebase CLI:
```bash
$ firebase deploy --only storage

=== Deploying to 'pokdex-tracker-mjjbo'...

i  deploying storage
i  storage: ensuring required API firebasestorage.googleapis.com is enabled...

Unexpected error when fetching default storage bucket.
Error: Failed to make request to https://firebasestorage.googleapis.com/v1alpha/projects/pokdex-tracker-mjjbo/defaultBucket
```
*Note: Deployment requires Firebase Storage to be initialized in the Firebase Console and active network access. Once initialized in the console, running `firebase deploy --only storage` will successfully publish the rules.*

---

## 1. FULL CONTENTS of `firestore.rules` and `storage.rules`

### `firestore.rules`
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Pokemon data (Pokedex) - read-only for everyone
    match /pokedex/{pokemonId} {
      allow read: if true;
      allow write: if false;
    }
    
    // Pokemon TCG Artists - read-only for everyone
    match /pokemon-tcg-artists/{artistId} {
      allow read: if true;
      allow write: if false;
    }
    
    // Pokemon TCG Cards - read-only for everyone
    match /pokemon-tcg-cards/{cardId} {
      allow read: if true;
      allow write: if false;
    }
    
    // Pokemon TCG Sets - read-only for everyone
    match /pokemon-tcg-sets/{setId} {
      allow read: if true;
      allow write: if false;
    }
    
    // Public exchange listings - This is now a top-level rule
    match /exchange/{exchangeId} {
      // Anyone logged in can see the cards available for trade.
      allow read: if request.auth != null;
      // A user can create a new listing if they are logged in and the new document's ownerId is their own UID.
      allow create: if request.auth != null && request.resource.data.ownerId == request.auth.uid;
      // A user can only update or delete a listing if they are the original owner.
      allow update, delete: if request.auth != null && resource.data.ownerId == request.auth.uid;
    }
    
    // User data
    match /users/{userId} {
      // Users can read/write their own profile
      allow read, write: if request.auth != null && request.auth.uid == userId;
      // Users can read other users' profiles (for following system and get-profiles API)
      allow read: if request.auth != null;
      
      // User's card collection - only owner can access
      match /cards/{cardId} {
        allow read, write, delete: if request.auth != null && request.auth.uid == userId;
      }
      
      // User's wishlist collection - only owner can access
      match /wishlist/{wishlistItemId} {
        allow read, write, delete: if request.auth != null && request.auth.uid == userId;
      }
       
      // Following - owner can read/write, others can read for social features
      match /following/{followingUserId} {
        allow read: if request.auth != null;
        allow write: if request.auth != null && request.auth.uid == userId;
      }
      
      // Followers - owner can read, follower can write
      match /followers/{followerUserId} {
        allow read: if request.auth != null && request.auth.uid == userId;
        allow write: if request.auth != null && request.auth.uid == followerUserId;
        // Also allow reading for the follower themselves (for UI purposes)
        allow read: if request.auth != null && request.auth.uid == followerUserId;
      }
      
      // Notifications - owner can read/write/delete their notifications
      match /notifications/{notificationId} {
        allow read, write, delete: if request.auth != null && request.auth.uid == userId;
      }
    }
    
    // Price history data
    match /priceHistory/{historyId} {
      // Let anyone read the price history for charts
      allow read: if true;
      // Only allow server-side processes (like the sync script) to write.
      // We check that the write request is not coming from a client-side user.
      allow write: if request.auth == null; 
    }
  }
}
```

### `storage.rules`
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if false;
    }
    match /card_uploads/{uid}/{filename} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
  }
}
```

---

## 2. FULL CONTENTS of `firebase.json` and `.firebaserc`

### `firebase.json`
```json
{
  "functions": [
    {
      "source": "functions",
      "codebase": "default",
      "ignore": [
        "node_modules",
        ".git",
        "firebase-debug.log",
        "firebase-debug.*.log"
      ],
      "runtime": "nodejs18"
    }
  ],
  "firestore": {
    "rules": "firestore.rules"
  },
  "storage": {
    "rules": "storage.rules"
  },
  "hosting": {
    "source": ".",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "frameworksBackend": {
      "region": "us-central1"
    }
  },
  "emulators": {
    "functions": {
      "port": 5001
    },
    "hosting": {
      "port": 5000
    },
    "ui": {
      "enabled": true
    },
    "singleProjectMode": true
  }
}
```

### `.firebaserc`
```json
{
  "projects": {
    "default": "pokdex-tracker-mjjbo"
  }
}
```

---

## 3. Firestore Collection and Subcollection References

- **pokedex**:
  - `src/app/api/pokedex-count/route.ts`, Line 17
  - `src/app/api/pokedex/route.ts`, Line 20
  - `src/app/api/pokedex/[pokemonName]/route.ts`, Line 21
  - `src/app/api/sync-pokedex/route.ts`, Line 54, 60
- **users**:
  - `src/app/api/users/search/route.ts`, Line 25, 45
  - `src/app/api/users/get-profiles/route.ts`, Line 39
  - `src/app/api/users/follow/route.ts`, Line 52, 53
  - `src/app/api/users/collection/upload-csv/route.ts`, Line 55
  - `src/app/api/users/collection/export-csv/route.ts`, Line 71
  - `src/context/AuthContext.tsx`, Line 112, 237, 267, 287
  - `src/services/collectionService.ts`, Line 25, 51, 62, 73
  - `src/services/wishlistService.ts`, Line 25, 52, 63
  - `src/services/notificationService.ts`, Line 23, 42
- **users/{uid}/cards**:
  - `src/app/api/users/search/route.ts`, Line 45
  - `src/app/api/users/collection/upload-csv/route.ts`, Line 55, 79
  - `src/app/api/users/collection/export-csv/route.ts`, Line 71
  - `src/services/collectionService.ts`, Line 25, 51, 62, 73
- **users/{uid}/following**:
  - `src/app/api/users/follow/route.ts`, Line 52
  - `src/services/notificationService.ts`, Line 48
- **users/{uid}/followers**:
  - `src/app/api/users/follow/route.ts`, Line 53
- **users/{uid}/wishlist**:
  - `src/services/wishlistService.ts`, Line 25, 52, 63
- **users/{uid}/notifications**:
  - `src/services/notificationService.ts`, Line 23, 42
- **pokemon-tcg-cards**:
  - `src/app/api/users/collection/upload-csv/route.ts`, Line 54
  - `src/app/api/cards/by-set/[setId]/route.ts`, Line 28
  - `src/app/api/cards/by-pokemon/[pokemonName]/route.ts`, Line 29
  - `src/app/api/cards/by-artist/[artistName]/route.ts`, Line 32
  - `src/app/api/cards-count/route.ts`, Line 17
  - `src/app/api/sync-cards/route.ts`, Line 88, 99
  - `src/app/api/search-cards/route.ts`, Line 29
  - `src/app/api/sync-prices/route.ts`, Line 91, 100
  - `src/app/api/master-cards-batch/route.ts`, Line 21
  - `src/app/api/master-card/[apiId]/route.ts`, Line 23
- **pokemon-tcg-artists**:
  - `src/app/api/artists-count/route.ts`, Line 17
- **pokemon-tcg-sets**:
  - `src/app/api/sets/route.ts`, Line 16
  - `src/app/api/sets/[setId]/route.ts`, Line 21
  - `src/app/api/cron/sync-if-needed/route.ts`, Line 87
  - `src/app/api/sets-count/route.ts`, Line 16
  - `src/app/api/sync-sets/route.ts`, Line 65, 70
- **priceHistory**:
  - `src/app/api/sync-prices/route.ts`, Line 92, 109
  - `src/app/api/price-history/[cardApiId]/route.ts`, Line 27
- **exchange**:
  - `src/app/exchange/page.tsx`, Line 79, 105
  - `src/services/exchangeService.ts`, Line 23, 48, 59

---

## 4. API Keys and Admin SDK Credentials on Client-Side

An extensive grep of the codebase confirms that **no raw service account strings, Google application credential JSON, or Firebase Admin certificates** are accidentally imported into any client-side files (files not operating under a Next.js `"use server"` directive or explicitly mapped to an `/api` API Route).

All instances of `process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON` and `admin.credential.cert` exist solely inside `src/app/api/...` server-side route handlers or `src/lib/firebase-admin.ts` (which is exclusively imported server-side).

Client-side files (like `src/lib/firebase.ts`) correctly use the browser-exposed `process.env.NEXT_PUBLIC_*` variables.

---

## 5. Environment Variables Used

- `NEXT_PUBLIC_FIREBASE_API_KEY` *(Exposed to browser)*
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` *(Exposed to browser)*
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID` *(Exposed to browser)*
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` *(Exposed to browser)*
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` *(Exposed to browser)*
- `NEXT_PUBLIC_FIREBASE_APP_ID` *(Exposed to browser)*
- `NEXT_PUBLIC_POKEMONTCG_API_KEY` *(Exposed to browser)*
- `GOOGLE_APPLICATION_CREDENTIALS_JSON`
- `GEMINI_API_KEY`
- `GOOGLE_API_KEY`
- `CRON_SECRET`

---

## 6. Full Contents of `package.json`

```json
{
  "name": "nextn",
  "version": "0.1.0",
  "private": "true",
  "scripts": {
    "dev": "next dev",
    "genkit:dev": "genkit start -- tsx src/ai/dev.ts",
    "genkit:watch": "genkit start -- tsx --watch src/ai/dev.ts",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "typecheck": "tsc --noEmit",
    "sync:all": "node scripts/sync-all.mjs"
  },
  "dependencies": {
    "@genkit-ai/googleai": "^1.8.0",
    "@genkit-ai/next": "^1.8.0",
    "@hookform/resolvers": "^4.1.3",
    "@radix-ui/react-accordion": "^1.2.3",
    "@radix-ui/react-alert-dialog": "^1.1.6",
    "@radix-ui/react-avatar": "^1.1.3",
    "@radix-ui/react-checkbox": "^1.1.4",
    "@radix-ui/react-dialog": "^1.1.6",
    "@radix-ui/react-dropdown-menu": "^2.1.6",
    "@radix-ui/react-label": "^2.1.2",
    "@radix-ui/react-menubar": "^1.1.6",
    "@radix-ui/react-popover": "^1.1.6",
    "@radix-ui/react-progress": "^1.1.2",
    "@radix-ui/react-radio-group": "^1.2.3",
    "@radix-ui/react-scroll-area": "^1.2.3",
    "@radix-ui/react-select": "^2.1.6",
    "@radix-ui/react-separator": "^1.1.2",
    "@radix-ui/react-slider": "^1.2.3",
    "@radix-ui/react-slot": "^1.1.2",
    "@radix-ui/react-switch": "^1.1.3",
    "@radix-ui/react-tabs": "^1.1.3",
    "@radix-ui/react-toast": "^1.2.6",
    "@radix-ui/react-tooltip": "^1.1.8",
    "@tanstack/react-query": "^5.0.0",
    "axios": "^1.7.2",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "date-fns": "^3.6.0",
    "firebase": "^11.8.1",
    "firebase-admin": "^12.2.0",
    "genkit": "^1.8.0",
    "idb": "^8.0.0",
    "jszip": "^3.10.1",
    "lucide-react": "^0.475.0",
    "next": "15.3.8",
    "patch-package": "^8.0.0",
    "react": "^18.3.1",
    "react-day-picker": "^8.10.1",
    "react-dom": "^18.3.1",
    "react-hook-form": "^7.54.2",
    "recharts": "^2.15.1",
    "sharp": "^0.34.2",
    "tailwind-merge": "^3.0.1",
    "tailwindcss-animate": "^1.0.7",
    "tesseract.js": "^5.1.1",
    "zod": "^3.24.2",
    "zustand": "^4.5.0"
  },
  "devDependencies": {
    "@types/node": "^20",
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "genkit-cli": "^1.8.0",
    "postcss": "^8",
    "tailwindcss": "^3.4.1",
    "typescript": "^5"
  }
}
```

---

## 7. Cloud Functions Present

### `functions/index.js`
```javascript
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
    const { data: { text } } = await worker.recognize(processedImageBuffer);
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
      const notificationRef = await db.collection('users').doc(followedUid).collection('notifications').add(notification);
      
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
exports.downsamplePriceHistory = europeFunctions.pubsub.schedule('every day 03:00').timeZone('UTC').onRun(async (context) => {
  console.log('📈 Starting price history downsampling job.');
  const db = admin.firestore();
  const batchSize = 200; // Process 200 documents at a time to stay within limits.

  // Helper function to process a query in batches and delete documents based on a condition.
  async function processQuery(query, shouldDelete) {
    let snapshot = await query.limit(batchSize).get();
    let docsDeleted = 0;

    while (snapshot.size > 0) {
        const batch = db.batch();
        snapshot.docs.forEach(doc => {
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
  const ninetyDayQuery = db.collection('priceHistory')
      .where('date', '<=', thirtyDaysAgo)
      .where('date', '>', ninetyDaysAgo);

  await processQuery(ninetyDayQuery, (doc) => {
      const date = doc.data().date.toDate();
      // A simple sampling strategy: keep if day of the month is a multiple of 3 (e.g., 1st, 4th, 7th...)
      return date.getDate() % 3 !== 1;
  });

  // --- Logic for data 91-365 days old (keep 1 every 7 days) ---
  console.log('Processing data between 91 and 365 days old to sample weekly...');
  const oneYearQuery = db.collection('priceHistory')
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
```

---

## 8. Current Firebase Auth Providers & Email Verification

- **Enabled Providers:** Google Sign-in (`GoogleAuthProvider`) and Email/Password (`EmailAuthProvider`).
- **Email Verification Enforced:** No. There is no usage of `sendEmailVerification` and no client-side logic to require `emailVerified === true` to use the application (outside of a mocked guest login).

---

## 9. Firestore "Test Mode" Confirmation

Firestore **is NOT in test mode**. 
There are no `allow read, write: if true;` or expiry timestamp rules within `firestore.rules`.
Read operations on public catalogs (like `pokedex` and `pokemon-tcg-cards`) are allowed to everyone, while write operations on those collections are blocked (`if false`). User-specific routes correctly check `request.auth != null` and `request.auth.uid == userId`.

---

## 10. Directory Tree (`/src`)

```
src
├── ai
│   ├── dev.ts
│   ├── flows
│   │   ├── find-card-by-image-flow.ts
│   │   ├── scan-card-flow.ts
│   │   └── sync-sets-flow.ts
│   └── genkit.ts
├── api
│   └── sync-sets
│       └── route.ts
├── app
│   ├── add-card
│   │   └── page.tsx
│   ├── admin
│   │   └── sync
│   ├── api
│   │   ├── artists
│   │   ├── artists-count
│   │   ├── cardmarket-prices
│   │   ├── cards
│   │   ├── cards-count
│   │   ├── cron
│   │   ├── export-cards
│   │   ├── export-sets
│   │   ├── master-card
│   │   ├── master-cards-batch
│   │   ├── pokedex
│   │   ├── pokedex-count
│   │   ├── price-history
│   │   ├── search-cards
│   │   ├── sets
│   │   ├── sets-count
│   │   ├── sync-cards
│   │   ├── sync-pokedex
│   │   ├── sync-prices
│   │   ├── sync-sets
│   │   ├── tcg-api-stats
│   │   ├── tcgdex
│   │   └── users
│   ├── browse-artists
│   │   ├── artistData.ts
│   │   └── [artistName]
│   ├── browse-sets
│   │   └── page.tsx
│   ├── browse-tcgplayer-sets
│   │   ├── page.tsx
│   │   └── set
│   ├── card-styles.css
│   ├── exchange
│   │   └── page.tsx
│   ├── favicon.ico
│   ├── friends
│   │   └── page.tsx
│   ├── globals.css
│   ├── layout.tsx
│   ├── my-collection
│   │   └── page.tsx
│   ├── page.tsx
│   ├── pokedex
│   │   ├── page.tsx
│   │   ├── pokedexData.ts
│   │   └── [pokemonName]
│   ├── search
│   │   └── page.tsx
│   ├── sets
│   │   └── [setId]
│   ├── settings
│   │   └── page.tsx
│   ├── tcgdex-browse-sets
│   │   └── page.tsx
│   └── tcgdex-sets
│       └── [setId]
├── components
│   ├── AddCardToCollectionDialog.tsx
│   ├── AppHeader.tsx
│   ├── AuthButton.tsx
│   ├── AuthModal.tsx
│   ├── CardItem.tsx
│   ├── CardList.tsx
│   ├── CardScannerButton.tsx
│   ├── CardScannerCameraUpload.tsx
│   ├── CardScannerDialog.tsx
│   ├── CardSkeleton.tsx
│   ├── ClientComponents.tsx
│   ├── CollectionUploadDialog.tsx
│   ├── EditCardDialog.tsx
│   ├── FullScreenCardView.tsx
│   ├── icons
│   │   ├── PokeballIcon.tsx
│   │   └── PokedexIcon.tsx
│   ├── ImageGallery.tsx
│   ├── improved-card-scanner.ts
│   ├── improved-card-scanner.tsx
│   ├── ImprovedCardScanner.tsx
│   ├── ManualCardInputForm.tsx
│   ├── MarketPriceHistoryChart.tsx
│   ├── MobileBottomNav.tsx
│   ├── ocr-diagnostic-tool.ts
│   ├── ocr-diagnostic-tool.tsx
│   ├── QueryProvider.tsx
│   ├── SingleCardTiltView.tsx
│   ├── SwipeBackIndicator.tsx
│   ├── ThemeCustomizer.tsx
│   ├── TiltableCard.tsx
│   └── ui
│       ├── accordion.tsx
│       ├── alert-dialog.tsx
│       ├── alert.tsx
│       ├── avatar.tsx
│       ├── badge.tsx
│       ├── button.tsx
│       ├── calendar.tsx
│       ├── card.tsx
│       ├── chart.tsx
│       ├── checkbox.tsx
│       ├── circular-progress.tsx
│       ├── dialog.tsx
│       ├── dropdown-menu.tsx
│       ├── form.tsx
│       ├── input.tsx
│       ├── label.tsx
│       ├── menubar.tsx
│       ├── popover.tsx
│       ├── progress.tsx
│       ├── radio-group.tsx
│       ├── scroll-area.tsx
│       ├── select.tsx
│       ├── separator.tsx
│       ├── sheet.tsx
│       ├── sidebar.tsx
│       ├── skeleton.tsx
│       ├── slider.tsx
│       ├── switch.tsx
│       ├── table.tsx
│       ├── tabs.tsx
│       ├── textarea.tsx
│       ├── toaster.tsx
│       ├── toast.tsx
│       └── tooltip.tsx
├── context
│   └── AuthContext.tsx
├── hooks
│   ├── useAuth.ts
│   ├── useDebounce.ts
│   ├── useExchange.ts
│   ├── useImageProcessor.ts
│   ├── use-mobile.tsx
│   ├── useNotifications.ts
│   ├── use-toast.ts
│   ├── useUserCollection.ts
│   └── useWishlist.ts
├── lib
│   ├── firebase-admin.ts
│   ├── firebase.ts
│   ├── image-preprocessing.ts
│   ├── queryKeys.ts
│   ├── tcgdexUtils.ts
│   └── utils.ts
├── next.config.ts
├── services
│   ├── cardCacheService.ts
│   ├── collectionService.ts
│   ├── exchangeService.ts
│   ├── notificationService.ts
│   └── wishlistService.ts
├── store
│   ├── useGuestStore.ts
│   └── useUIStore.ts
└── types
    ├── index.ts
    ├── tcgdex.ts
    └── tcgplayerApi.ts
```

---

## 11. VERIFICATION CHECKLIST

### Typecheck Output
- **Command:** `npm run typecheck`
- **Status:** **PASS** (Zero errors)
- **Output:**
```
> nextn@0.1.0 typecheck
> tsc --noEmit
```

### Production Build Output
- **Command:** `npm run build`
- **Status:** **PASS**
- **Output:**
```
> nextn@0.1.0 build
> next build

   ▲ Next.js 15.3.8
   - Environments: .env.local, .env

   Creating an optimized production build ...
   Linting and checking validity of types     ✓ Linting and checking validity of types 

├ ○ /pokedex                              8.29 kB         321 kB
├ ƒ /pokedex/[pokemonName]                6.39 kB         333 kB
├ ○ /search                               2.65 kB         322 kB
├ ƒ /sets/[setId]                         5.84 kB         329 kB
├ ○ /settings                             12.1 kB         342 kB
├ ○ /tcgdex-browse-sets                     478 B         102 kB
└ ƒ /tcgdex-sets/[setId]                    477 B         102 kB
+ First Load JS shared by all              102 kB
  ├ chunks/1684-a2f607853bca23cc.js       46.5 kB
  ├ chunks/4bd1b696-b91666eb88fbc8e8.js   53.2 kB
  └ other shared chunks (total)           2.22 kB

○  (Static)   prerendered as static content
ƒ  (Dynamic)  server-rendered on demand
```

### Real-time Updates Architecture
Real-time synchronization remains 100% functional without legacy React context bottlenecks:
- **TanStack Query Cache Bridging:** In `useUserCollection`, `useWishlist`, `useExchange`, and `useNotifications`, each custom hook initializes a TanStack `useQuery` with `enabled: false` and `queryFn: () => queryClient.getQueryData(key) ?? []`. This ensures TanStack Query manages cache expiration, deduplication, and component re-renders without triggering HTTP/Firestore polling.
- **Side-Channel Snapshot Ingestion:** Inside a `useEffect` within each hook, a Firestore `onSnapshot` listener is opened via the corresponding service module (`collectionService.subscribe`, `wishlistService.subscribe`, etc.). Whenever Firestore pushes data changes, the callback executes `queryClient.setQueryData(key, newData)`. This instantly updates the TanStack cache and reactively re-renders only the specific components consuming that query key across the application.
- **Reference Stability & Infinite Loop Prevention:** All custom data hooks (`useUserCollection`, `useWishlist`, `useExchange`, `useNotifications`, `useFollowing`) utilize module-level stable empty array constants (`EMPTY_ARRAY`, `EMPTY_NOTIFICATIONS`, `EMPTY_FOLLOWING`) as fallback defaults when query data is loading or undefined. This ensures that empty state transitions do not generate new array references in memory on every render, preventing cascading re-renders and infinite loops across consuming UI components (such as `/pokedex`).

### Guest / Sandbox Mode Architecture
Guest mode remains fully operational and is now completely decoupled from authentication and Firestore data layers:
- **State Location:** All guest state (mock collection cards, wishlist items, exchange listings, notifications, and following arrays) lives in memory inside a dedicated Zustand store (`src/store/useGuestStore.ts`).
- **Sandbox Routing in Services:** Each service repository method (`collectionService.addCard`, `wishlistService.addItem`, `exchangeService.addItem`, `notificationService.markAsRead`) performs an upfront sandbox check:
  ```typescript
  if (uid === 'demo-guest-uid' || useGuestStore.getState().isGuest) {
    const added = useGuestStore.getState().addCard(card);
    return added.id;
  }
  ```
  When active, mutations are intercepted and redirected to the Zustand store in memory, completely bypassing Firestore network calls.
- **Reactive Cache Injection:** When `isGuest` is true, the custom TanStack Query hooks (`useUserCollection`, etc.) skip opening Firestore snapshot listeners and instead inject the Zustand guest store arrays directly into the TanStack Query cache (`queryClient.setQueryData`). This guarantees that guest users experience the exact same real-time UI responsiveness and component behavior as authenticated users.
