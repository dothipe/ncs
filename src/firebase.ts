import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  User
} from "firebase/auth";
import { 
  initializeFirestore, 
  persistentLocalCache,
  persistentMultipleTabManager,
  memoryLocalCache,
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp,
  writeBatch
} from "firebase/firestore";

import firebaseConfig from "../firebase-applet-config.json";

// Initialize App
const app = initializeApp(firebaseConfig);

// Initialize Authentication
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Initialize Firestore targeting the custom Database ID with modern multi-tab cache and auto-detect long polling
let localCacheSetting;
try {
  localCacheSetting = persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  });
} catch (e) {
  console.warn("Falling back to memory cache for Firestore:", e);
  localCacheSetting = memoryLocalCache();
}

export const db = initializeFirestore(
  app,
  {
    localCache: localCacheSetting,
    experimentalAutoDetectLongPolling: true,
  },
  firebaseConfig.firestoreDatabaseId
);

export {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp,
  writeBatch
};
export type { User };
