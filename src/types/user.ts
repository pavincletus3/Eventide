
import type { Timestamp } from 'firebase/firestore';

export type UserRole = 'student' | 'admin' | 'organizer' | 'coadmin' | string;

export interface UserProfile {
  uid: string; // Corresponds to Firebase Auth UID and Firestore document ID
  email: string | null;
  role: UserRole; 
  name?: string; // Optional, for future profile completion
  createdAt: Timestamp;
  updatedAt: Timestamp;
  // Add any other profile fields you might need in the future
  // e.g., photoURL?: string;
  // e.g., bio?: string;
}
