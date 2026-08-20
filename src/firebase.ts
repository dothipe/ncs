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
  enableIndexedDbPersistence
} from "firebase/firestore";

import firebaseConfig from "../firebase-applet-config.json";

// Initialize App
const app = initializeApp(firebaseConfig);

// Initialize Authentication
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Initialize Firestore targeting the custom Database ID with long-polling enabled to stay persistent in sandboxed iframes
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
}, firebaseConfig.firestoreDatabaseId);

// Enable Offline Persistence for robust network-resilient scoring
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === "failed-precondition") {
    // Multiple tabs open, persistence can only be enabled in one tab at a time.
    console.warn("Firestore offline persistence failed-precondition: Multiple tabs open.");
  } else if (err.code === "unimplemented") {
    // The current browser does not support all of the features required to enable persistence.
    console.warn("Firestore offline persistence unimplemented: Browser not supported.");
  } else {
    console.warn("Firestore offline persistence could not be enabled:", err);
  }
});

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
  serverTimestamp
};
export type { User };
