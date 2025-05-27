import type { Timestamp } from "firebase/firestore";

export type RegistrationStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "attended";

export interface Registration {
  id?: string; // Firestore document ID
  eventId: string;
  studentId: string; // User UID of the student
  status: RegistrationStatus;
  registeredAt: Timestamp;
  checkedInAt?: Timestamp | null;
  qrCodeData: string;
  certificateUrl?: string; // URL to the generated certificate PDF
  // Potentially other fields like notes, feedback, etc. could be added later
}
