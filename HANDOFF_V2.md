# Architecture and Security Handoff Document V2

## 0. CHANGES SUMMARY

### Refactor Overview
The application's state architecture was migrated from a monolithic `AuthContext` to a decoupled, reactive state management system powered by **TanStack Query** (for server-side data state) and **Zustand** (for global UI and guest state).

### Key Changes
1. **State Management Migration**: Replaced legacy AuthContext Firestore subscriptions with TanStack Query hooks + Zustand stores
2. **Files Created**: 
   - TanStack Query hooks (`useUserCollection.ts`, `useWishlist.ts`, etc.)
   - Service layers (`collectionService.ts`, `wishlistService.ts`, etc.)
   - Zustand stores (`useUIStore.ts`, `useGuestStore.ts`)
   - Query provider (`QueryProvider.tsx`)
   - Centralized query keys (`queryKeys.ts`)
   - Storage rules (`storage.rules`)
3. **Files Modified**:
   - `src/context/AuthContext.tsx`: Reduced from 647 to 335 lines (~48% reduction) - auth/session only
   - Multiple pages/components: Updated to use new hooks/services
   - `package.json`: Added `@tanstack/react-query` and `zustand`
4. **Files Deleted**: Obsolete backups and legacy JavaScript API service

### Verification
- **Typecheck**: `npm run typecheck` passes with zero errors
- **Production Build**: `npm run build` succeeds
- **Real-time Updates**: 100% functional via TanStack Query cache bridging + Firestore snapshot listeners
- **Guest Mode**: Fully operational via Zustand store with reactive cache injection

For complete details of any section, refer to the specific files mentioned above or search the codebase for relevant terms.