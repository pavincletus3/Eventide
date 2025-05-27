import type { Timestamp } from "firebase/firestore";

export type UserRole = "student" | "admin" | "organizer" | "coadmin" | string;

export interface UserProfile {
  uid: string; // Corresponds to Firebase Auth UID and Firestore document ID
  email: string | null;
  role: UserRole;
  name?: string; // Optional, for future profile completion
  photoURL?: string; // Optional, for profile picture
  createdAt: Timestamp;
  updatedAt: Timestamp;
  phone?: string;
  department?: string;
  registerNo?: string;
  batchYear?: string; // Student's batch year
  // Add any other profile fields you might need in the future
  // e.g., bio?: string;
}
