"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Event } from "@/types/event";
import { useAuth } from "@/contexts/AuthContext";
import EventForm from "@/components/event/EventForm";
import { Loader2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { use } from "react";

interface EditEventPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function EditEventPage({ params }: EditEventPageProps) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEvent = async () => {
      if (!user) {
        router.replace("/login?redirect=/events/" + id + "/edit");
        return;
      }

      try {
        const eventDoc = await getDoc(doc(db, "events", id));

        if (!eventDoc.exists()) {
          setError("Event not found");
          return;
        }

        const eventData = eventDoc.data() as Omit<Event, "id">;

        // Check if the current user is the organizer
        if (eventData.organizerId !== user.uid) {
          setError("You do not have permission to edit this event");
          return;
        }

        setEvent({
          id: eventDoc.id,
          ...eventData,
        });
      } catch (err: any) {
        console.error("Error fetching event:", err);
        setError(err.message || "Failed to load event");
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, [id, user, router]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Loading event details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <ShieldAlert className="h-16 w-16 text-destructive mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Error</h2>
        <p className="text-muted-foreground">{error}</p>
        <Button onClick={() => router.push("/events")} className="mt-4">
          Back to Events
        </Button>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <ShieldAlert className="h-16 w-16 text-destructive mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Event Not Found</h2>
        <p className="text-muted-foreground">
          The event you're looking for doesn't exist or has been removed.
        </p>
        <Button onClick={() => router.push("/events")} className="mt-4">
          Back to Events
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <EventForm
        initialData={event}
        mode="edit"
        onSuccess={() => router.push(`/events/${id}`)}
      />
    </div>
  );
}
