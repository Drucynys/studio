/**
 * Centralised query-key factory.
 * Every TanStack Query cache entry in the app MUST use a key produced here
 * so we never have key-drift between hooks that read vs. invalidate.
 */
export const queryKeys = {
  /** users/{uid}/cards */
  collection: (uid: string) => ['collection', uid] as const,

  /** users/{uid}/wishlist */
  wishlist: (uid: string) => ['wishlist', uid] as const,

  /** top-level exchange collection (all users) */
  exchange: () => ['exchange'] as const,

  /** users/{uid}/notifications */
  notifications: (uid: string) => ['notifications', uid] as const,

  /** users/{uid}/following */
  following: (uid: string) => ['following', uid] as const,

  /** users/{uid} profile doc (role, privacySetting, etc.) */
  userProfile: (uid: string) => ['userProfile', uid] as const,
} as const;
