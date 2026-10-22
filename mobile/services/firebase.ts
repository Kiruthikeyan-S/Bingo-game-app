import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  initializeAuth,
  getAuth,
  Auth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInAnonymously,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
// @ts-ignore - React Native persistence from @firebase/auth
import { getReactNativePersistence } from '@firebase/auth';
import {
  getFirestore,
  Firestore,
  doc,
  setDoc,
  getDoc,
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  onSnapshot,
} from 'firebase/firestore';
import { getStorage, FirebaseStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const firebaseConfig = {
  apiKey: "AIzaSyAlF1KHm5yJ7vmX6f-kahNu_B1upX9BAUo",
  authDomain: "gamehub-3d.firebaseapp.com",
  projectId: "gamehub-3d",
  storageBucket: "gamehub-3d.firebasestorage.app",
  messagingSenderId: "635984638138",
  appId: "1:635984638138:web:0ef2185d53aafe09c19283",
  measurementId: "G-N5Q34GKEJN"
};

// Singleton initialization
const app: FirebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

let auth: Auth;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch {
  auth = getAuth(app);
}

const db: Firestore = getFirestore(app);
const storage: FirebaseStorage = getStorage(app);

export {
  app,
  auth,
  db,
  storage,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInAnonymously,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged,
  FirebaseUser,
  doc,
  setDoc,
  getDoc,
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  onSnapshot,
  ref,
  uploadBytes,
  getDownloadURL,
};
