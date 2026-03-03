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
          const profile: UserProfile = {
            uid: firebaseUser.uid,
            username: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Player',
            email: firebaseUser.email || '',
            photoURL: firebaseUser.photoURL,
            totalWins: 0,
            totalLosses: 0,
            totalGames: 0,
            totalPoints: 0,
            createdAt: Date.now(),
          };
          await setDoc(ref, profile);
          setUserProfile(profile);
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
