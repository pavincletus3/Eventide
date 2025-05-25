
// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, ref as storageRef, uploadBytesResumable, getDownloadURL, type Storage } from 'firebase/storage';

// Your web app's Firebase configuration (embedded)
// IMPORTANT: For production, it's highly recommended to move these to environment variables.
// However, as per user request, embedding them directly.
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
const storage: Storage = getStorage(app);

/**
 * Uploads a file to Firebase Storage and returns its download URL.
 * @param file The file to upload.
 * @param path The path in Firebase Storage where the file should be stored (e.g., "event-images/eventId/imageName.jpg").
 * @returns A promise that resolves with the download URL of the uploaded file.
 */
const uploadFileAndGetURL = (file: File, path: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const fileRef = storageRef(storage, path);
    const uploadTask = uploadBytesResumable(fileRef, file);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        // Optional: observe state change events such as progress, pause, and resume
        // Get task progress, including the number of bytes uploaded and the total number of bytes to be uploaded
        // const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        // console.log('Upload is ' + progress + '% done');
      },
      (error) => {
        // Handle unsuccessful uploads
        console.error("Upload failed:", error);
        reject(error);
      },
      () => {
        // Handle successful uploads on complete
        getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
          resolve(downloadURL);
        }).catch(reject);
      }
    );
  });
};


export { app, auth, db, storage, uploadFileAndGetURL };
