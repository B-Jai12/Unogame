'use client';
import { useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useGameStore } from '@/store/useGameStore';
import { UserProfile } from '@/lib/types';

export function useAuth() {
  const { currentUser, userProfile, authLoading, setCurrentUser, setUserProfile, setAuthLoading } =
    useGameStore();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setCurrentUser(firebaseUser);
      if (firebaseUser) {
        const ref = doc(db, 'users', firebaseUser.uid);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          setUserProfile(snap.data() as UserProfile);
        } else {
          // Do NOT automatically create a profile with a guessed username. 
          // Set a stub profile so the UI knows the user is authed but needs a username.
          setUserProfile({
            uid: firebaseUser.uid,
            username: '',
            email: firebaseUser.email || '',
            photoURL: firebaseUser.photoURL || '',
          } as UserProfile);
        }
      } else {
        setUserProfile(null);
      }
      setAuthLoading(false);
    });
    return () => unsub();
  }, [setCurrentUser, setUserProfile, setAuthLoading]);

  return { user: currentUser, userProfile, authLoading };
}
