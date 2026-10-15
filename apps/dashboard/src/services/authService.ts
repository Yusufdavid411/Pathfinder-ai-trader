import {
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';

import { getFirebaseAuth } from './firebaseConfig';

export async function signInWithEmail(email: string, password: string): Promise<User> {
  const credential = await signInWithEmailAndPassword(getFirebaseAuth(), email, password);
  return credential.user;
}

export async function signInWithGoogle(): Promise<User> {
  const provider = new GoogleAuthProvider();
  const credential = await signInWithPopup(getFirebaseAuth(), provider);
  return credential.user;
}

export async function signOutCurrentUser(): Promise<void> {
  await signOut(getFirebaseAuth());
}
