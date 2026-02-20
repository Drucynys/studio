// src/context/AuthContext.tsx
"use client";

import React, { createContext, useState, useEffect, ReactNode, useCallback, useRef, useMemo } from 'react';
import { 
  getAuth, 
  onAuthStateChanged, 
  User, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  UserCredential,
  updateProfile,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updateEmail,
  updatePassword,
} from 'firebase/auth';
import { doc, setDoc, getDoc, getFirestore, collection, onSnapshot, query, where, deleteDoc, orderBy, writeBatch, serverTimestamp, addDoc } from 'firebase/firestore';
import { app } from '@/lib/firebase';
import { PokemonCard, WishlistItem, ExchangeItem } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

const auth = getAuth(app);
const db = getFirestore(app);

export type PrivacySetting = 'everyone' | 'onRequest';

export interface Notification {
  id: string;
  type: 'new_follower';
  followerUid: string;
  followerDisplayName: string;
  timestamp: any; // Firestore Timestamp
  read: boolean;
}

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  role: string | null;
  collection: PokemonCard[];
  loadingCollection: boolean;
  wishlist: WishlistItem[];
  loadingWishlist: boolean;
  myExchangeItems: ExchangeItem[];
  loadingMyExchangeItems: boolean;
  isAuthModalOpen: boolean;
  openAuthModal: () => void;
  closeAuthModal: () => void;
  signUp: (email: string, pass: string) => Promise<any>;
  signIn: (email: string, pass: string) => Promise<any>;
  signInWithGoogle: () => Promise<any>;
  logOut: () => Promise<void>;
  addCardToCollection: (card: Omit<PokemonCard, 'id' | 'userId' | 'timestamp'>) => Promise<void>;
  updateCardInCollection: (card: PokemonCard) => Promise<void>;
  removeCardFromCollection: (cardId: string) => Promise<void>;
  addCardToWishlist: (card: Omit<WishlistItem, 'id' | 'userId' | 'timestamp'>) => Promise<void>;
  removeCardFromWishlist: (wishlistItemId: string) => Promise<void>;
  moveCardFromWishlistToCollection: (item: WishlistItem) => Promise<void>;
  addCardToExchange: (card: PokemonCard) => Promise<void>;
  removeCardFromExchange: (exchangeItemId: string) => Promise<void>;
  updateUserDisplayName: (newName: string) => Promise<void>;
  reauthenticate: (password: string) => Promise<void>;
  updateUserEmail: (newEmail: string) => Promise<void>;
  updateUserPassword: (newPassword: string) => Promise<void>;
  privacySetting: PrivacySetting | null;
  updateUserPrivacySetting: (setting: PrivacySetting) => Promise<void>;
  notifications: Notification[];
  loadingNotifications: boolean;
  markNotificationsAsRead: (notificationsToUpdate: Notification[]) => Promise<void>;
  following: string[]; // List of UIDs the user is following
  loadingFollowing: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const { toast } = useToast();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [userCollection, setUserCollection] = useState<PokemonCard[]>([]);
  const [loadingCollection, setLoadingCollection] = useState(false);
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [loadingWishlist, setLoadingWishlist] = useState(false);
  const [myExchangeItems, setMyExchangeItems] = useState<ExchangeItem[]>([]);
  const [loadingMyExchangeItems, setLoadingMyExchangeItems] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [privacySetting, setPrivacySetting] = useState<PrivacySetting | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [following, setFollowing] = useState<string[]>([]);
  const [loadingFollowing, setLoadingFollowing] = useState(false);

  const openAuthModal = useCallback(() => setIsAuthModalOpen(true), []);
  const closeAuthModal = useCallback(() => setIsAuthModalOpen(false), []);
  
  const handleAuthSuccess = useCallback(async (userCredential: UserCredential) => {
    const newUser = userCredential.user;
    if (!newUser) return;

    const createTimeout = (ms: number) => new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Operation timeout')), ms)
    );

    try {
      const userDocRef = doc(db, "users", newUser.uid);
      const docSnap = await Promise.race([
        getDoc(userDocRef),
        createTimeout(10000)
      ]) as any;

      if (!docSnap.exists()) {
        const displayName = newUser.displayName || newUser.email?.split('@')[0] || 'New User';

        if (!newUser.displayName) {
          try {
            await Promise.race([
              updateProfile(newUser, { displayName }),
              createTimeout(5000)
            ]);
          } catch (authError) {
            console.error("Error updating Auth profile:", authError);
          }
        }

        const userProfileData = {
          uid: newUser.uid,
          email: newUser.email,
          displayName: displayName,
          displayName_lowercase: displayName.toLowerCase(),
          createdAt: new Date(),
          role: 'user',
          followSetting: 'everyone' as PrivacySetting,
        };

        await Promise.race([
          setDoc(userDocRef, userProfileData),
          createTimeout(10000)
        ]);
        
        toast({
          title: 'Welcome!',
          description: 'Your user profile has been created.',
        });
      } else {
        const data = docSnap.data();
        if (!data.displayName_lowercase && data.displayName) {
          await setDoc(userDocRef, { displayName_lowercase: data.displayName.toLowerCase() }, { merge: true });
        }
      }
      
      closeAuthModal();
    } catch (error: any) {
      console.error("Auth success handler failed:", error);
      toast({
        variant: 'destructive',
        title: 'Login Issue',
        description: 'There was an issue completing your login.',
      });
      throw error;
    }
  }, [toast, closeAuthModal]);

  const signUp = useCallback(async (email: string, pass: string) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
    await handleAuthSuccess(userCredential);
    return userCredential;
  }, [handleAuthSuccess]);

  const signIn = useCallback(async (email: string, pass: string) => {
    const userCredential = await signInWithEmailAndPassword(auth, email, pass);
    await handleAuthSuccess(userCredential);
    return userCredential;
  }, [handleAuthSuccess]);

  const signInWithGoogle = useCallback(async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    
    const isLocalhost = typeof window !== 'undefined' && 
      (window.location.hostname === 'localhost' || 
       window.location.hostname === '127.0.0.1' || 
       window.location.hostname.includes('localhost'));
    
    try {
      if (isLocalhost) {
        await signInWithRedirect(auth, provider);
        return null;
      } else {
        const userCredential = await signInWithPopup(auth, provider);
        await handleAuthSuccess(userCredential);
        return userCredential;
      }
    } catch (error: any) {
      if (error.code === 'auth/popup-blocked' || 
          error.code === 'auth/unauthorized-domain' ||
          error.message?.includes('refused to connect')) {
        await signInWithRedirect(auth, provider);
        return null;
      }
      throw error;
    }
  }, [handleAuthSuccess]);

  const logOut = useCallback(async () => {
    await signOut(auth);
    setUserCollection([]);
    setFollowing([]);
    setWishlist([]);
    setMyExchangeItems([]);
    router.push('/');
  }, [router]);

  const addCardToCollection = useCallback(async (card: Omit<PokemonCard, 'id' | 'userId' | 'timestamp'>) => {
    if (!user) throw new Error("You must be logged in to add cards.");
    const userCardsRef = collection(db, 'users', user.uid, 'cards');
    const newCardRef = doc(userCardsRef);
    await setDoc(newCardRef, {
      ...card,
      id: newCardRef.id,
      userId: user.uid,
      timestamp: serverTimestamp()
    });
  }, [user]);

  const addCardToWishlist = useCallback(async (item: Omit<WishlistItem, 'id' | 'userId' | 'timestamp'>) => {
    if (!user) throw new Error("You must be logged in to add to a wishlist.");
    const userWishlistRef = collection(db, 'users', user.uid, 'wishlist');
    const newWishlistItemRef = doc(userWishlistRef);
    await setDoc(newWishlistItemRef, {
        ...item,
        id: newWishlistItemRef.id,
        userId: user.uid,
        timestamp: serverTimestamp(),
    });
  }, [user]);

  const removeCardFromWishlist = useCallback(async (wishlistItemId: string) => {
    if (!user) throw new Error("You must be logged in.");
    await deleteDoc(doc(db, 'users', user.uid, 'wishlist', wishlistItemId));
  }, [user]);

  const moveCardFromWishlistToCollection = useCallback(async (item: WishlistItem) => {
    await addCardToCollection({
        apiId: item.apiId,
        name: item.name,
        set: item.set,
        cardNumber: item.cardNumber,
        rarity: item.rarity,
        language: 'English',
        variant: null,
        imageUrl: item.imageUrl,
        value: 0,
        quantity: 1,
        artist: item.artist,
    });
    await removeCardFromWishlist(item.id);
  }, [addCardToCollection, removeCardFromWishlist]);

  const updateCardInCollection = useCallback(async (card: PokemonCard) => {
     if (!user || user.uid !== card.userId) throw new Error("Not authorized.");
     await setDoc(doc(db, 'users', user.uid, 'cards', card.id), card, { merge: true });
  }, [user]);
  
  const removeCardFromCollection = useCallback(async (cardId: string) => {
      if (!user) throw new Error("User not logged in.");
      await deleteDoc(doc(db, 'users', user.uid, 'cards', cardId));
  }, [user]);

  const addCardToExchange = useCallback(async (card: PokemonCard) => {
    if (!user) throw new Error("User not logged in.");
    const newRef = doc(collection(db, 'exchange'));
    await setDoc(newRef, {
      ...card,
      ownerId: user.uid,
      ownerDisplayName: user.displayName || user.email?.split('@')[0] || 'Anonymous',
      listedAt: serverTimestamp(),
      exchangeId: newRef.id,
    });
  }, [user]);

  const removeCardFromExchange = useCallback(async (exchangeItemId: string) => {
    if (!user) throw new Error("User not logged in.");
    await deleteDoc(doc(db, 'exchange', exchangeItemId));
  }, [user]);

  const updateUserDisplayName = useCallback(async (newName: string) => {
    if (!user) throw new Error("User not logged in.");
    await updateProfile(user, { displayName: newName });
    await setDoc(doc(db, "users", user.uid), { 
        displayName: newName,
        displayName_lowercase: newName.toLowerCase()
    }, { merge: true });
  }, [user]);
  
  const reauthenticate = useCallback(async (password: string) => {
    if (!user || !user.email) throw new Error("User not found.");
    const credential = EmailAuthProvider.credential(user.email, password);
    await reauthenticateWithCredential(user, credential);
  }, [user]);

  const updateUserEmail = useCallback(async (newEmail: string) => {
    if (!user) throw new Error("User not logged in.");
    await updateEmail(user, newEmail);
    await setDoc(doc(db, "users", user.uid), { email: newEmail }, { merge: true });
  }, [user]);
  
  const updateUserPassword = useCallback(async (newPassword: string) => {
    if (!user) throw new Error("User not logged in.");
    await updatePassword(user, newPassword);
    await signOut(auth);
  }, [user]);
  
  const updateUserPrivacySetting = useCallback(async (setting: PrivacySetting) => {
    if (!user) throw new Error("User not logged in.");
    await setDoc(doc(db, "users", user.uid), { followSetting: setting }, { merge: true });
  }, [user]);

  const markNotificationsAsRead = useCallback(async (notificationsToUpdate: Notification[]) => {
    if (!user || notificationsToUpdate.length === 0) return;
    const batch = writeBatch(db);
    notificationsToUpdate.forEach(n => {
      batch.update(doc(db, 'users', user.uid, 'notifications', n.id), { read: true });
    });
    await batch.commit();
  }, [user]);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Redirect Result Handler
  useEffect(() => {
    let isMounted = true;
    getRedirectResult(auth).then((result) => {
      if (result && isMounted) {
        handleAuthSuccess(result);
      }
    }).catch(console.error);
    return () => { isMounted = false; };
  }, [handleAuthSuccess]);

  // Data Listeners
  useEffect(() => {
    if (!user) {
      setRole(null);
      setPrivacySetting(null);
      setUserCollection([]);
      setWishlist([]);
      setMyExchangeItems([]);
      setFollowing([]);
      setNotifications([]);
      return;
    }

    const uid = user.uid;
    const unsubs: (() => void)[] = [];

    // User Profile
    unsubs.push(onSnapshot(doc(db, 'users', uid), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setRole(data.role || 'user');
        setPrivacySetting(data.followSetting || 'everyone');
      }
    }));

    // Collection
    setLoadingCollection(true);
    unsubs.push(onSnapshot(collection(db, "users", uid, "cards"), (snap) => {
      const cards = snap.docs.map(d => d.data() as PokemonCard);
      cards.sort((a, b) => (b.timestamp?.toMillis?.() || 0) - (a.timestamp?.toMillis?.() || 0));
      setUserCollection(cards);
      setLoadingCollection(false);
    }));

    // Wishlist
    setLoadingWishlist(true);
    unsubs.push(onSnapshot(query(collection(db, "users", uid, "wishlist"), orderBy("timestamp", "desc")), (snap) => {
      setWishlist(snap.docs.map(d => d.data() as WishlistItem));
      setLoadingWishlist(false);
    }));

    // Exchange
    setLoadingMyExchangeItems(true);
    unsubs.push(onSnapshot(query(collection(db, 'exchange'), where('ownerId', '==', uid)), (snap) => {
      setMyExchangeItems(snap.docs.map(d => d.data() as ExchangeItem));
      setLoadingMyExchangeItems(false);
    }));

    // Following
    setLoadingFollowing(true);
    unsubs.push(onSnapshot(collection(db, "users", uid, "following"), (snap) => {
      setFollowing(snap.docs.map(d => d.id));
      setLoadingFollowing(false);
    }));

    // Notifications
    setLoadingNotifications(true);
    unsubs.push(onSnapshot(query(collection(db, "users", uid, "notifications"), orderBy("timestamp", "desc")), (snap) => {
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() } as Notification));
      setNotifications(all.filter(n => !n.read));
      setLoadingNotifications(false);
    }));

    return () => unsubs.forEach(fn => fn());
  }, [user?.uid]);

  const value = useMemo(() => ({
    user,
    loading,
    role,
    collection: userCollection,
    loadingCollection,
    wishlist,
    loadingWishlist,
    myExchangeItems,
    loadingMyExchangeItems,
    isAuthModalOpen,
    openAuthModal,
    closeAuthModal,
    signUp,
    signIn,
    signInWithGoogle,
    logOut,
    addCardToCollection,
    updateCardInCollection,
    removeCardFromCollection,
    addCardToWishlist,
    removeCardFromWishlist,
    moveCardFromWishlistToCollection,
    addCardToExchange,
    removeCardFromExchange,
    updateUserDisplayName,
    reauthenticate,
    updateUserEmail,
    updateUserPassword,
    privacySetting,
    updateUserPrivacySetting,
    notifications,
    loadingNotifications,
    markNotificationsAsRead,
    following,
    loadingFollowing,
  }), [
    user, loading, role, userCollection, loadingCollection, wishlist, loadingWishlist,
    myExchangeItems, loadingMyExchangeItems, isAuthModalOpen, openAuthModal, closeAuthModal,
    signUp, signIn, signInWithGoogle, logOut, addCardToCollection, updateCardInCollection,
    removeCardFromCollection, addCardToWishlist, removeCardFromWishlist,
    moveCardFromWishlistToCollection, addCardToExchange, removeCardFromExchange,
    updateUserDisplayName, reauthenticate, updateUserEmail, updateUserPassword,
    privacySetting, updateUserPrivacySetting, notifications, loadingNotifications,
    markNotificationsAsRead, following, loadingFollowing
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
