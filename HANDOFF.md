# Architecture and Security Handoff Document

## 1. FIREBASE CONFIGURATION FILES
For the complete and up-to-date configuration, refer to the actual files in the repository:
- **Firestore Rules**: `firestore.rules`
- **Storage Rules**: `storage.rules` 
- **Firebase Configuration**: `firebase.json`
- **Firebase Project Alias**: `.firebaserc`

## 2. FIRESTORE COLLECTION AND SUBCOLLECTION REFERENCES
See the inline comments in API route files for specific Firestore usage:
- **pokedex**: `src/app/api/pokedex-count/route.ts`, `src/app/api/pokedex/route.ts`, etc.
- **users**: `src/app/api/users/search/route.ts`, `src/context/AuthContext.tsx`, etc.
- **users/{uid}/cards**: `src/services/collectionService.ts`, etc.
- **Complete reference**: Search the codebase for collection names to find all usages.

## 3. API KEYS AND ADMIN SDK CREDENTIALS ON CLIENT-SIDE
An extensive grep of the codebase confirms that **no raw service account strings, Google application credential JSON, or Firebase Admin certificates** are accidentally imported into any client-side files.

All instances of `process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON` and `admin.credential.cert` exist solely inside server-side route handlers (`src/app/api/...`) or `src/lib/firebase-admin.ts` (exclusively imported server-side).

Client-side files (like `src/lib/firebase.ts`) correctly use browser-exposed `process.env.NEXT_PUBLIC_*` variables.

## 4. ENVIRONMENT VARIABLES USED
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

## 5. CURRENT FIREBASE AUTH PROVIDERS & EMAIL VERIFICATION
- **Enabled Providers:** Google Sign-in (`GoogleAuthProvider`) and Email/Password (`EmailAuthProvider`).
- **Email Verification Enforced:** No. There is no usage of `sendEmailVerification` and no client-side logic to require `emailVerified === true` to use the application (outside of a mocked guest login).

## 6. FIRESTORE "TEST MODE" CONFIRMATION
Firestore **is NOT in test mode**. 
There are no `allow read, write: if true;` or expiry timestamp rules within `firestore.rules`.
Read operations on public catalogs (like `pokedex` and `pokemon-tcg-cards`) are allowed to everyone, while write operations on those collections are blocked (`if false`). User-specific routes correctly check `request.auth != null` and `request.auth.uid == userId`.