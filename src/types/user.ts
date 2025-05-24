
import type { Timestamp } from 'firebase/firestore';

export interface UserProfile {
  uid: string; // Corresponds to Firebase Auth UID and Firestore document ID
  email: string | null;
  role: 'student' | 'admin' | string; // Extendable with other roles
  name?: string; // Optional, for future profile completion
  createdAt: Timestamp;
  updatedAt: Timestamp;
  // Add any other profile fields you might need in the future
  // e.g., photoURL?: string;
  // e.g., bio?: string;
}
