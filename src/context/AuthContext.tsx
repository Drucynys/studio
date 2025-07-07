
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
import { doc, setDoc, getDoc, getFirestore, collection, onSnapshot, query, where, deleteDoc } from 'firebase/firestore';
import { app } from '@/lib/firebase';
import { PokemonCard } from '@/types';
import { useToast } from '@/hooks/use-toast';

const auth = getAuth(app);
const db = getFirestore(app);

export type PrivacySetting = 'everyone' | 'onRequest';

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
  notificationsCount: number;
  following: string[]; // List of UIDs the user is following
  loadingFollowing: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [userCollection, setUserCollection] = useState<PokemonCard[]>([]);
  const [loadingCollection, setLoadingCollection] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [privacySetting, setPrivacySetting] = useState<PrivacySetting | null>(null);
  const [notificationsCount, setNotificationsCount] = useState(0);
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
    await setDoc(userDocRef, { displayName: newName }, { merge: true });
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


      return () => {
        unsubscribeCards();
        unsubscribeFollowing();
      };
    } else {
      setUserCollection([]);
      setFollowing([]);
      setLoadingCollection(false);
      setLoadingFollowing(false);
    }
  }, [user, toast]);

  const value = {
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
    notificationsCount,
    following,
    loadingFollowing,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
