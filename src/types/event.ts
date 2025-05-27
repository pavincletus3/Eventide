import type { Timestamp } from "firebase/firestore";

export type EventStatus = "draft" | "published" | "archived" | "completed";

export interface Event {
  id?: string; // Firestore document ID, will be added client-side if needed after fetch
  name: string;
  description: string;
  date: Timestamp;
  venue: string;
  maxParticipants: number;
  imageUrl?: string | null; // URL from Firebase Storage, or path
  brochureUrl?: string | null; // URL from Firebase Storage for the event brochure
  organizerId: string; // User UID of the creator
  status: EventStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  // Future fields could include:
  // participants: string[]; // List of User UIDs
  // category: string;
  // price: number;
}
