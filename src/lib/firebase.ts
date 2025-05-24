
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
// import { getFirestore } from 'firebase/firestore';
// import { getStorage } from 'firebase/storage';

const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
const messagingSenderId = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;
const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;
const measurementId = process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID;

if (!apiKey) {
  throw new Error(
    "Firebase config error: NEXT_PUBLIC_FIREBASE_API_KEY is missing. " +
    "Please ensure your .env.local file in the project root contains this value and that you have restarted your Next.js development server after changes."
  );
}
if (!authDomain) {
  throw new Error(
    "Firebase config error: NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN is missing. " +
    "Please ensure your .env.local file is correctly set up and you have restarted your server."
  );
}
if (!projectId) {
  throw new Error(
    "Firebase config error: NEXT_PUBLIC_FIREBASE_PROJECT_ID is missing. " +
    "Please ensure your .env.local file is correctly set up and you have restarted your server."
  );
}

const firebaseConfig = {
  apiKey: apiKey,
  authDomain: authDomain,
  projectId: projectId,
  storageBucket: storageBucket,
  messagingSenderId: messagingSenderId,
  appId: appId,
  measurementId: measurementId,
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
