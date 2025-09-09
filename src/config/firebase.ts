// src/config/firebase.ts
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, User } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, collection, addDoc, query, where, orderBy, getDocs, Timestamp } from 'firebase/firestore';

// Workaround for TypeScript env issue
const getEnvVar = (name: string): string => {
  return (import.meta as any).env[name] || '';
};

const firebaseConfig = {
  apiKey: getEnvVar('VITE_FIREBASE_API_KEY'),
  authDomain: getEnvVar('VITE_FIREBASE_AUTH_DOMAIN'),
  projectId: getEnvVar('VITE_FIREBASE_PROJECT_ID'),
  storageBucket: getEnvVar('VITE_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: getEnvVar('VITE_FIREBASE_MESSAGING_SENDER_ID'),
  appId: getEnvVar('VITE_FIREBASE_APP_ID'),
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Auth providers
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// Auth functions
export const signInWithGoogle = () => signInWithPopup(auth, googleProvider);
export const signInWithEmail = (email: string, password: string) => 
  signInWithEmailAndPassword(auth, email, password);
export const signUpWithEmail = (email: string, password: string) => 
  createUserWithEmailAndPassword(auth, email, password);
export const logOut = () => signOut(auth);

// User profile functions
export const createUserProfile = async (user: User | null, additionalData?: any) => {
  if (!user) return;
  
  const userRef = doc(db, 'users', user.uid);
  const userSnap = await getDoc(userRef);
  
  if (!userSnap.exists()) {
    const { displayName, email, photoURL } = user;
    const createdAt = Timestamp.now();
    
    try {
      await setDoc(userRef, {
        displayName: displayName || email?.split('@')[0] || 'User',
        email,
        photoURL,
        createdAt,
        ...additionalData
      });
    } catch (error) {
      console.error('Error creating user profile:', error);
    }
  }
  
  return userRef;
};

export const getUserProfile = async (userId: string) => {
  const userRef = doc(db, 'users', userId);
  const userSnap = await getDoc(userRef);
  return userSnap.exists() ? userSnap.data() : null;
};

// Parlay storage functions
export const saveParlayToUser = async (userId: string, parlayData: any) => {
  try {
    const parlayRef = await addDoc(collection(db, 'parlays'), {
      userId,
      ...parlayData,
      savedAt: Timestamp.now(),
    });
    return parlayRef.id;
  } catch (error) {
    console.error('Error saving parlay:', error);
    throw error;
  }
};

export const getUserParlays = async (userId: string) => {
  try {
    const parlaysQuery = query(
      collection(db, 'parlays'),
      where('userId', '==', userId),
      orderBy('savedAt', 'desc')
    );
    const querySnapshot = await getDocs(parlaysQuery);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error fetching user parlays:', error);
    return [];
  }
};