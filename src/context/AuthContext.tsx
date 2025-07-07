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
} from 'firebase/auth';
import { doc, setDoc, getDoc, getFirestore, collection, onSnapshot, query, where, deleteDoc } from 'firebase/firestore';
import { app } from '@/lib/firebase';
import { PokemonCard } from '@/types';
import { useToast } from '@/hooks/use-toast';

const auth = getAuth(app);
const db = getFirestore(app);

export interface AuthContextType {
  user: User | null;
  loading: boolean;
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
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [userCollection, setUserCollection] = useState<PokemonCard[]>([]);
  const [loadingCollection, setLoadingCollection] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

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

      // If the user signed up with email, their Auth profile won't have a displayName.
      // We update it here to ensure it's available immediately in the UI.
      if (!newUser.displayName) {
        try {
          await updateProfile(newUser, { displayName });
          console.log("Firebase Auth profile updated with displayName:", displayName);
        } catch (authError) {
          console.error("Error updating Auth profile:", authError);
          // Non-fatal, we can still proceed with Firestore.
        }
      }

      const userProfileData = {
        uid: newUser.uid,
        email: newUser.email,
        displayName: displayName,
        createdAt: new Date(),
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
  };

  const addCardToCollection = async (card: Omit<PokemonCard, 'id' | 'userId'>) => {
    if (!user) throw new Error("You must be logged in to add cards.");
    
    const userCardsRef = collection(db, 'users', user.uid, 'cards');
    const newCardRef = doc(userCardsRef); // Create a new document reference with a unique ID
    
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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      setLoadingCollection(true);
      const collRef = collection(db, "users", user.uid, "cards");
      const q = query(collRef); // Prepare a query
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const userCards = snapshot.docs.map(doc => doc.data() as PokemonCard);
        // Sort by timestamp if available
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
      return () => unsubscribe();
    } else {
      setUserCollection([]);
      setLoadingCollection(false);
    }
  }, [user, toast]);

  const value = {
    user,
    loading,
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
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
