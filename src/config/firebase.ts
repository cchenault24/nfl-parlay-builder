import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  User,
  onAuthStateChanged // Import onAuthStateChanged
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  Timestamp 
} from 'firebase/firestore';

// Your Vite environment variables are already typed. 
// You can ensure this by creating a `vite-env.d.ts` file in your `src` directory with:
// /// <reference types="vite/client" />

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
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
export const onAuthUserChanged = (callback: (user: User | null) => void) => onAuthStateChanged(auth, callback);


// User profile functions
export const createUserProfile = async (user: User, additionalData?: any) => {
  const userRef = doc(db, 'users', user.uid);
  const userSnap = await getDoc(userRef);
  
  if (!userSnap.exists()) {
    const { displayName, email, photoURL } = user;
    const createdAt = Timestamp.now();
    
    try {
      await setDoc(userRef, {
        displayName: displayName || email?.split('@')[0] || 'User',
        email,
        photoURL: photoURL || `https://api.dicebear.com/8.x/initials/svg?seed=${email}`,
        createdAt,
        ...additionalData
      });
    } catch (error) {
      console.error('Error creating user profile:', error);
      throw error;
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

/**
 * Listens for real-time updates to a user's parlays.
 * @param userId The ID of the user.
 * @param callback A function that will be called with the updated list of parlays.
 * @returns The unsubscribe function to detach the listener.
 */
export const getUserParlays = (userId: string, callback: (parlays: any[]) => void) => {
  const parlaysQuery = query(
    collection(db, 'parlays'),
    where('userId', '==', userId),
    orderBy('savedAt', 'desc')
  );

  // onSnapshot returns an unsubscribe function that you can call
  // to detach the listener when the component unmounts.
  const unsubscribe = onSnapshot(parlaysQuery, (querySnapshot) => {
    const parlays = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    callback(parlays);
  }, (error) => {
    console.error('Error fetching user parlays:', error);
    callback([]);
  });

  return unsubscribe;
};
