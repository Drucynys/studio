// src/context/AuthContext.tsx
"use client";

import React, { createContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { 
  getAuth, 
  onAuthStateChanged, 
  User, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  UserCredential,
  updateProfile,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updateEmail,
  updatePassword,
} from 'firebase/auth';
import { doc, setDoc, getDoc, getFirestore, collection, onSnapshot, query, where, deleteDoc, orderBy, writeBatch } from 'firebase/firestore';
import { app } from '@/lib/firebase';
import { PokemonCard } from '@/types';
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
  isAuthModalOpen: boolean;
  openAuthModal: () => void;
  closeAuthModal: () => void;
  signUp: (email: string, pass: string) => Promise<any>;
  signIn: (email: string, pass: string) => Promise<any>;
  signInWithGoogle: () => Promise<any>;
  logOut: () => Promise<void>;
  addCardToCollection: (card: Omit<PokemonCard, 'id' | 'userId'>) => Promise<void>;
  updateCardInCollection: (card: PokemonCard) => Promise<void>;
  removeCardFromCollection: (cardId: string) => Promise<void>;
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
  const [loadingCollection, setLoadingCollection] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [privacySetting, setPrivacySetting] = useState<PrivacySetting | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(true);
  const [following, setFollowing] = useState<string[]>([]);
  const [loadingFollowing, setLoadingFollowing] = useState(true);


  const openAuthModal = () => setIsAuthModalOpen(true);
  const closeAuthModal = () => setIsAuthModalOpen(false);
  
  const handleAuthSuccess = useCallback(async (userCredential: UserCredential) => {
    const newUser = userCredential.user;
    if (!newUser) return;

    const userDocRef = doc(db, "users", newUser.uid);
    const docSnap = await getDoc(userDocRef);

    if (!docSnap.exists()) {
      console.log(`User document for ${newUser.uid} not found. Creating...`);
      
      const displayName = newUser.displayName || newUser.email?.split('@')[0] || 'New User';

      if (!newUser.displayName) {
        try {
          await updateProfile(newUser, { displayName });
          console.log("Firebase Auth profile updated with displayName:", displayName);
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

      console.log("Attempting to write this user data to Firestore:", userProfileData);

      try {
        await setDoc(userDocRef, userProfileData);
        console.log(`User document for ${newUser.uid} created successfully.`);
        toast({
          title: 'Welcome!',
          description: 'Your user profile has been created.',
        });
      } catch (error: any) {
        console.error("FATAL: Error creating user document in Firestore:", error);
        
        let description = 'Could not create your user profile in the database.';
        if (error.message) {
            description = error.message;
        }

        toast({
          variant: 'destructive',
          title: 'Account Setup Failed',
          description: description,
          duration: 9000,
        });

        await signOut(auth);
        return; 
      }
    } else {
        const data = docSnap.data();
        if (!data.displayName_lowercase && data.displayName) {
            try {
                await setDoc(userDocRef, { displayName_lowercase: data.displayName.toLowerCase() }, { merge: true });
                console.log(`Backfilled displayName_lowercase for user ${newUser.uid}.`);
            } catch (error) {
                console.error("Error backfilling displayName_lowercase:", error);
            }
        }
      console.log(`User document for ${newUser.uid} already exists.`);
    }
    
    closeAuthModal();
  }, [toast]);

  const signUp = async (email: string, pass: string) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
    await handleAuthSuccess(userCredential);
    return userCredential;
  };

  const signIn = async (email: string, pass: string) => {
    const userCredential = await signInWithEmailAndPassword(auth, email, pass);
    await handleAuthSuccess(userCredential);
    return userCredential;
  };

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    const userCredential = await signInWithPopup(auth, provider);
    await handleAuthSuccess(userCredential);
    return userCredential;
  };

  const logOut = async () => {
    await signOut(auth);
    setUserCollection([]);
    setFollowing([]);
    router.push('/');
  };

  const addCardToCollection = async (card: Omit<PokemonCard, 'id' | 'userId'>) => {
    if (!user) throw new Error("You must be logged in to add cards.");
    
    const userCardsRef = collection(db, 'users', user.uid, 'cards');
    const newCardRef = doc(userCardsRef);
    
    const cardDataWithMetadata = {
      ...card,
      id: newCardRef.id,
      userId: user.uid,
      timestamp: new Date()
    };
    
    await setDoc(newCardRef, cardDataWithMetadata);
  };

  const updateCardInCollection = async (card: PokemonCard) => {
     if (!user || user.uid !== card.userId) throw new Error("Not authorized to update this card.");
     const cardRef = doc(db, 'users', user.uid, 'cards', card.id);
     await setDoc(cardRef, card, { merge: true });
  };
  
  const removeCardFromCollection = async (cardId: string) => {
      if (!user) throw new Error("You must be logged in to remove cards.");
      const cardRef = doc(db, 'users', user.uid, 'cards', cardId);
      await deleteDoc(cardRef);
  };

  const updateUserDisplayName = async (newName: string) => {
    if (!user) throw new Error("User not logged in.");
    await updateProfile(user, { displayName: newName });
    const userDocRef = doc(db, "users", user.uid);
    await setDoc(userDocRef, { 
        displayName: newName,
        displayName_lowercase: newName.toLowerCase()
    }, { merge: true });
  };
  
  const reauthenticate = async (password: string) => {
    if (!user || !user.email) throw new Error("User not found or email is missing.");
    const credential = EmailAuthProvider.credential(user.email, password);
    await reauthenticateWithCredential(user, credential);
  };

  const updateUserEmail = async (newEmail: string) => {
    if (!user) throw new Error("User not logged in.");
    await updateEmail(user, newEmail);
    const userDocRef = doc(db, "users", user.uid);
    await setDoc(userDocRef, { email: newEmail }, { merge: true });
  };
  
  const updateUserPassword = async (newPassword: string) => {
    if (!user) throw new Error("User not logged in.");
    await updatePassword(user, newPassword);
    await signOut(auth);
  };
  
  const updateUserPrivacySetting = async (setting: PrivacySetting) => {
    if (!user) throw new Error("User not logged in.");
    const userDocRef = doc(db, "users", user.uid);
    await setDoc(userDocRef, { followSetting: setting }, { merge: true });
  };

  const markNotificationsAsRead = async (notificationsToUpdate: Notification[]) => {
    if (!user || notificationsToUpdate.length === 0) return;

    try {
      const batch = writeBatch(db);
      notificationsToUpdate.forEach(notification => {
        const notificationRef = doc(db, 'users', user.uid, 'notifications', notification.id);
        batch.update(notificationRef, { read: true });
      });
      await batch.commit();
      console.log(`${notificationsToUpdate.length} notifications marked as read.`);
    } catch (error) {
      console.error("Error marking notifications as read: ", error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not update notifications.'
      });
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      const userDocRef = doc(db, 'users', user.uid);
      const unsubscribeUser = onSnapshot(userDocRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setRole(data.role || 'user');
          setPrivacySetting(data.followSetting || 'everyone');
        } else {
          setRole('user');
          setPrivacySetting('everyone');
        }
      }, (error) => {
        console.error("Error fetching user data: ", error);
        setRole(null);
        setPrivacySetting(null);
      });
      
      return () => unsubscribeUser();
    } else {
      setRole(null);
      setPrivacySetting(null);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      setLoadingCollection(true);
      const collRef = collection(db, "users", user.uid, "cards");
      const q = query(collRef);
      const unsubscribeCards = onSnapshot(q, (snapshot) => {
        const userCards = snapshot.docs.map(doc => doc.data() as PokemonCard);
        userCards.sort((a, b) => {
          const timeA = a.timestamp?.toMillis ? a.timestamp.toMillis() : 0;
          const timeB = b.timestamp?.toMillis ? b.timestamp.toMillis() : 0;
          return timeB - timeA;
        });
        setUserCollection(userCards);
        setLoadingCollection(false);
      }, (error) => {
        console.error("Error fetching collection:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not load your collection.'});
        setLoadingCollection(false);
      });

      setLoadingFollowing(true);
      const followingRef = collection(db, "users", user.uid, "following");
      const unsubscribeFollowing = onSnapshot(followingRef, (snapshot) => {
        const followingUIDs = snapshot.docs.map(doc => doc.id);
        setFollowing(followingUIDs);
        setLoadingFollowing(false);
      }, (error) => {
        console.error("Error fetching following list:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not load your following list.' });
        setLoadingFollowing(false);
      });

      setLoadingNotifications(true);
      const notificationsRef = collection(db, "users", user.uid, "notifications");
      const qNotifications = query(notificationsRef, orderBy("timestamp", "desc"));
      const unsubscribeNotifications = onSnapshot(qNotifications, (snapshot) => {
        const allNotifications = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
        const unread = allNotifications.filter(n => !n.read);
        setNotifications(unread);
        setLoadingNotifications(false);
      }, (fallbackError) => {
          console.error("Notification query failed:", fallbackError);
          toast({ variant: 'destructive', title: 'Error', description: 'Could not load your notifications.' });
          setLoadingNotifications(false);
      });

      return () => {
        unsubscribeCards();
        unsubscribeFollowing();
        unsubscribeNotifications();
      };
    } else {
      setUserCollection([]);
      setFollowing([]);
      setNotifications([]);
      setLoadingCollection(false);
      setLoadingFollowing(false);
      setLoadingNotifications(false);
    }
  }, [user, toast]);

  const value: AuthContextType = {
    user,
    loading,
    role,
    collection: userCollection,
    loadingCollection,
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
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
