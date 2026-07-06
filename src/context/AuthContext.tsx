// src/context/AuthContext.tsx
"use client";

import React, { createContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';
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
import { doc, setDoc, getDoc, getFirestore, onSnapshot } from 'firebase/firestore';
import { app } from '@/lib/firebase';
import { useUIStore } from '@/store/useUIStore';
import { useGuestStore } from '@/store/useGuestStore';
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

/**
 * AuthContextType — slimmed down to auth-only concerns.
 *
 * Data subscriptions (collection, wishlist, exchange, notifications, following)
 * are now served by dedicated hooks in src/hooks/.
 */
export interface AuthContextType {
  user: User | null;
  loading: boolean;
  role: string | null;
  privacySetting: PrivacySetting | null;

  // Auth actions
  signUp: (email: string, pass: string) => Promise<any>;
  signIn: (email: string, pass: string) => Promise<any>;
  signInWithGoogle: () => Promise<any>;
  logOut: () => Promise<void>;
  loginAsDemoGuest: () => void;

  // Profile actions
  updateUserDisplayName: (newName: string) => Promise<void>;
  reauthenticate: (password: string) => Promise<void>;
  updateUserEmail: (newEmail: string) => Promise<void>;
  updateUserPassword: (newPassword: string) => Promise<void>;
  updateUserPrivacySetting: (setting: PrivacySetting) => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const { toast } = useToast();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [privacySetting, setPrivacySetting] = useState<PrivacySetting | null>(null);

  // ─── Guest / Demo Mode ───────────────────────────────────────────────
  const loginAsDemoGuest = useCallback(() => {
    setUser({
      uid: 'demo-guest-uid',
      email: 'guest@poketrkr.com',
      displayName: 'Demo Trainer',
      emailVerified: true,
      isAnonymous: true,
      providerData: [],
      metadata: {},
    } as any);
    setRole('user');
    setPrivacySetting('everyone');
    useGuestStore.getState().activateGuestMode();
    useUIStore.getState().closeAuthModal();
    toast({
      title: "Demo Mode Enabled",
      description: "Welcome! You are exploring the app with a temporary Guest Account. Changes will be saved locally in memory.",
    });
  }, [toast]);

  // ─── Auth Success Handler ────────────────────────────────────────────
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

      useUIStore.getState().closeAuthModal();
    } catch (error: any) {
      console.error("Auth success handler failed:", error);
      toast({
        variant: 'destructive',
        title: 'Login Issue',
        description: 'There was an issue completing your login.',
      });
      throw error;
    }
  }, [toast]);

  // ─── Auth Methods ────────────────────────────────────────────────────
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
    useGuestStore.getState().deactivateGuestMode();
    await signOut(auth);
    router.push('/');
  }, [router]);

  // ─── Profile Methods ─────────────────────────────────────────────────
  const updateUserDisplayName = useCallback(async (newName: string) => {
    if (!user) throw new Error("User not logged in.");
    if (user.uid === 'demo-guest-uid') {
      setUser(prev => prev ? { ...prev, displayName: newName } : null);
      toast({
        title: "Display Name Updated",
        description: `Name successfully updated to ${newName} in sandbox memory.`,
      });
      return;
    }
    await updateProfile(user, { displayName: newName });
    await setDoc(doc(db, "users", user.uid), {
      displayName: newName,
      displayName_lowercase: newName.toLowerCase()
    }, { merge: true });
  }, [user, toast]);

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
    if (user.uid === 'demo-guest-uid') {
      setPrivacySetting(setting);
      toast({
        title: "Privacy Setting Updated",
        description: `Your visibility has been set to ${setting} in sandbox memory.`,
      });
      return;
    }
    await setDoc(doc(db, "users", user.uid), { followSetting: setting }, { merge: true });
  }, [user, toast]);

  // ─── Auth State Listener ─────────────────────────────────────────────
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

  // ─── User Profile Listener (role + privacy only) ─────────────────────
  useEffect(() => {
    if (!user) {
      setRole(null);
      setPrivacySetting(null);
      return;
    }

    if (user.uid === 'demo-guest-uid') {
      return;
    }

    const unsub = onSnapshot(doc(db, 'users', user.uid), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setRole(data.role || 'user');
        setPrivacySetting(data.followSetting || 'everyone');
      }
    });

    return () => unsub();
  }, [user?.uid]);

  // ─── Context Value ───────────────────────────────────────────────────
  const value = useMemo(() => ({
    user,
    loading,
    role,
    privacySetting,
    signUp,
    signIn,
    signInWithGoogle,
    logOut,
    loginAsDemoGuest,
    updateUserDisplayName,
    reauthenticate,
    updateUserEmail,
    updateUserPassword,
    updateUserPrivacySetting,
  }), [
    user, loading, role, privacySetting,
    signUp, signIn, signInWithGoogle, logOut, loginAsDemoGuest,
    updateUserDisplayName, reauthenticate, updateUserEmail, updateUserPassword,
    updateUserPrivacySetting,
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
