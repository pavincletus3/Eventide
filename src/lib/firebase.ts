
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
// import { getFirestore } from 'firebase/firestore';
// import { getStorage } from 'firebase/storage';

// Your web app's Firebase configuration, directly embedded
const firebaseConfig = {
  apiKey: "AIzaSyBwnnhe7kvgpcn68R6KcybthpFaanWmOv4",
  authDomain: "eventide-71ffa.firebaseapp.com",
  projectId: "eventide-71ffa",
  storageBucket: "eventide-71ffa.firebasestorage.app", // Corrected from firebasestorage.app
  messagingSenderId: "696187290200",
  appId: "1:696187290200:web:15159f032cd6af8630002d"
  // measurementId is optional, if you have one and need it, add it here
  // measurementId: "G-XXXXXXXXXX" 
};

// Initialize Firebase
let app: FirebaseApp;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

const auth: Auth = getAuth(app);
// const db = getFirestore(app);
// const storage = getStorage(app);

export { app, auth }; // db, storage };
