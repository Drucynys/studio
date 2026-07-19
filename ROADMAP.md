# PokéTRKR Development Roadmap

## Architecture Pivot Decision
Based on mobile browser hardware limitations, the project has been split into two dedicated platforms:
- **Phase 1: The Web Platform (Next.js)** - A premium desktop/web portal for managing, viewing, and analyzing the card collection.
- **Phase 2: The Mobile Scanner (Expo)** - A dedicated native iOS/Android app built specifically for high-speed, 60fps card scanning using hardware-accelerated ML Kit.

Both platforms will share the exact same Firebase Database and Authentication system.

---

## Phase 1: Finalize Next.js Web Portal
*Goal: Build a beautiful, responsive web catalog using the Liquid Glass design system.*

### 1. Cleanup & Optimization
- [x] **Remove Tesseract.js**: Delete the experimental OCR sandbox and remove `tesseract.js` from `package.json` to reduce bundle size.
- [x] **Clean Sandbox Route**: Remove `src/app/sandbox/scanner` as it is no longer needed for the web version.

### 2. User Authentication & Database
- [x] **Link Auth to Collections**: Ensure that when a user logs in via Firebase Auth, their specific UID is used to fetch and write to their personal Firestore collection document.
- [x] **Manual Add Flow**: Finalize the UI for searching the database and manually adding a card to the collection (since web won't have scanning).

### 3. UI/UX Polish (Liquid Glass)
- [x] **Desktop Grid Optimization**: Ensure the `LazySection` virtualized grid scales beautifully on large desktop monitors.
- [x] **Dashboard Stats**: Build a summary dashboard showing total cards, set completion percentages, and estimated collection value.

---

## Phase 2: Build Native Mobile Scanner (Expo)
*Goal: Create a lightning-fast native app for scanning cards into the database.*

### 1. Project Initialization
- [ ] **Initialize Expo**: Create a new React Native project using `npx create-expo-app`.
- [ ] **Shared Firebase**: Connect the Expo app to the existing Firebase project so scans instantly appear on the Web portal.
- [ ] **Auth Flow**: Implement native Firebase Authentication.

### 2. Native Camera Implementation
- [ ] **Install Vision Camera**: Install `expo-vision-camera` for low-level, high-performance camera access.
- [ ] **UI Overlay**: Build the targeting reticle and frosted-glass UI over the native camera feed.

### 3. Hardware OCR Integration
- [ ] **Install ML Kit**: Add the Google ML Kit text recognition frame processor.
- [ ] **The Processing Loop**: Configure the camera to scan at 60fps, extracting the big text (Pokémon Name) and tiny text (Set Number) simultaneously.
- [ ] **Tie-Breaker UX**: If multiple variants are found (e.g., Reverse Holo vs Normal), pop up a native bottom sheet asking the user to tap the correct version.

### 4. Deployment
- [ ] **TestFlight**: Compile to iOS and deploy via TestFlight for real-world scanning tests.
- [ ] **App Store**: Prepare icons, screenshots, and submit to the Apple App Store.

---

## Phase 3: Global Expansion (TCGdex Migration)
*Goal: Support multi-language cards while maintaining accurate market pricing.*

### 1. API Analysis & Strategy
- **Catalog Data (TCGdex)**: Migrate core card data from `pokemontcg.io` to `tcgdex.dev` to access extensive multi-language support (English, Japanese, French, Spanish, etc.).
- **Pricing Data (Hybrid Approach)**: Since TCGdex is primarily a catalog API and lacks reliable real-time market valuations, implement a hybrid data layer:
  - Use TCGdex for card metadata, imagery, and localization.
  - Maintain a separate pricing service (via PriceCharting API, JustTCG, or retaining limited pokemontcg.io endpoints just for TCGplayer/Cardmarket data) mapped by set/card ID.

### 2. Database Restructuring
- [ ] **Locale Mapping**: Update Firestore schema to support locale-specific card variants (e.g., `cardId_en`, `cardId_jp`).
- [ ] **Sync Scripts**: Rewrite background sync scripts (`sync-cards`, `sync-sets`) to utilize TCGdex REST/GraphQL endpoints.

### 3. UI Implementation
- [ ] **Language Toggle**: Add a global language selector for the catalog and user collection.
- [ ] **Multi-currency Support**: Integrate currency conversion logic tied to the selected regional pricing data (USD, EUR, JPY).
