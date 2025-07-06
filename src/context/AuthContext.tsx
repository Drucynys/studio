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
  getAdditionalUserInfo
} from 'firebase/auth';
import { doc, setDoc, getDoc, getFirestore, collection, onSnapshot, writeBatch, getDocs, query, where, deleteDoc } from 'firebase/firestore';
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
  
  const migrateLocalCollectionToFirestore = useCallback(async (userId: string) => {
    const localDataRaw = localStorage.getItem('pokemonCards');
    if (!localDataRaw) return;

    try {
      const localCards: PokemonCard[] = JSON.parse(localDataRaw);
      if (!Array.isArray(localCards) || localCards.length === 0) return;

      toast({
        title: "Migrating Collection...",
        description: `Found ${localCards.length} cards in your browser. Moving them to your new account...`,
      });

      const batch = writeBatch(db);
      const userCardsRef = collection(db, 'users', userId, 'cards');

      localCards.forEach(card => {
        const docRef = doc(userCardsRef); // Auto-generate ID
        batch.set(docRef, { ...card, id: docRef.id, userId });
      });

      await batch.commit();

      toast({
        title: "Migration Successful!",
        description: "Your local collection is now saved to your account.",
        className: "bg-green-100 text-green-900",
      });
      
      // Backup and clear local storage
      localStorage.setItem('pokemonCards_backup', localDataRaw);
      localStorage.removeItem('pokemonCards');

    } catch (error) {
      console.error("Failed to migrate local collection:", error);
      toast({
        variant: "destructive",
        title: "Migration Failed",
        description: "Could not move your local cards to your account. They are still saved in this browser.",
      });
    }
  }, [toast]);

  const handleAuthSuccess = useCallback(async (userCredential: any) => {
    const newUser = userCredential.user;
    const userDocRef = doc(db, "users", newUser.uid);
    const info = getAdditionalUserInfo(userCredential);

    // If it's a new user, create their document and migrate data
    if (info?.isNewUser) {
      await setDoc(userDocRef, {
        email: newUser.email,
        displayName: newUser.displayName || newUser.email?.split('@')[0] || 'New User',
        createdAt: new Date().toISOString(),
        uid: newUser.uid,
      });
      await migrateLocalCollectionToFirestore(newUser.uid);
    } else {
      // For existing users, we can just ensure their doc is there or update a lastLogin timestamp
      await setDoc(userDocRef, { lastLogin: new Date().toISOString() }, { merge: true });
    }
    
    closeAuthModal();
  }, [migrateLocalCollectionToFirestore]);

  const signUp = async (email: string, pass: string) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
    await handleAuthSuccess(userCredential);
    return userCredential;
  };

  const signIn = async (email: string, pass: string) => {
    const userCredential = await signInWithEmailAndPassword(auth, email, pass);
    // For regular sign-in, we can't reliably know if it's their "first" time
    // without a DB read, so we ensure the doc exists here too.
    const userDocRef = doc(db, "users", userCredential.user.uid);
    const docSnap = await getDoc(userDocRef);
    if (!docSnap.exists()) {
        await setDoc(userDocRef, {
            email: userCredential.user.email,
            displayName: userCredential.user.displayName || userCredential.user.email?.split('@')[0],
            createdAt: new Date().toISOString(),
            uid: userCredential.user.uid,
        });
    }
    closeAuthModal();
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
    
    // TEMPORARILY SIMPLIFIED: Always add a new card without checking for duplicates.
    // This helps isolate the permission issue.
    const newCardRef = doc(userCardsRef);
    await setDoc(newCardRef, { ...card, id: newCardRef.id, userId: user.uid });
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
      const unsubscribe = onSnapshot(collRef, (snapshot) => {
        const userCards = snapshot.docs.map(doc => doc.data() as PokemonCard);
        setUserCollection(userCards.sort((a, b) => (b.timestamp as any) - (a.timestamp as any) || 0)); // Sort by timestamp if available
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
