
// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

// Your web app's Firebase configuration (embedded as per previous step)
// IMPORTANT: For production, it's highly recommended to move these to environment variables
// and load them as shown in previous examples, rather than hardcoding.
const firebaseConfig = {
  apiKey: "AIzaSyBwnnhe7kvgpcn68R6KcybthpFaanWmOv4",
  authDomain: "eventide-71ffa.firebaseapp.com",
  projectId: "eventide-71ffa",
  storageBucket: "eventide-71ffa.firebasestorage.app",
  messagingSenderId: "696187290200",
  appId: "1:696187290200:web:15159f032cd6af8630002d"
};

// Initialize Firebase
let app: FirebaseApp;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

const auth: Auth = getAuth(app);
const db: Firestore = getFirestore(app);
// const storage = getStorage(app); // If you need Firebase Storage

export { app, auth, db }; // db, storage };
