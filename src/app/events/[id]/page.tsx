"use client";

import type { NextPage } from "next";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Image from "next/image";
import {
  doc,
  getDoc,
  Timestamp,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import type { UserProfile } from "@/types/user";
import type { Registration } from "@/types/registration";
import type { Event as EventType } from "@/types/event";
import { format } from "date-fns";
import {
  ArrowLeft,
  CalendarDays,
  Users,
  MapPin,
  AlertTriangle,
  Info,
  Ticket,
  FileText,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const EventDetailPage: NextPage = () => {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string | undefined;

  const [event, setEvent] = useState<EventType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { user, initialLoading: authInitialLoading } = useAuth();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  const [registering, setRegistering] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [registrationCount, setRegistrationCount] = useState(0);

  // Fetch event details on component mount
  useEffect(() => {
    if (!eventId) {
      setError("Event ID is missing.");
      setLoading(false);
      return;
    }

    const fetchEvent = async () => {
      setLoading(true);
      setError(null);
      try {
        const eventDocRef = doc(db, "events", eventId);
        const docSnap = await getDoc(eventDocRef);

        if (docSnap.exists()) {
          setEvent({ id: docSnap.id, ...docSnap.data() } as EventType);
        } else {
          setError("Event not found. It might have been moved or deleted.");
          setEvent(null);
        }
      } catch (err) {
        console.error("Error fetching event:", err);
        setError("Failed to load event details. Please try again later.");
        setEvent(null);
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, [eventId]);

  // Fetch user profile and registration status
  useEffect(() => {
    const fetchData = async () => {
      if (authInitialLoading || !user || !eventId) return;

      // 1. Fetch user profile to check for 'student' role
      try {
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);
        setUserProfile(
          userDocSnap.exists()
            ? ({
                id: userDocSnap.id,
                ...userDocSnap.data(),
              } as unknown as UserProfile)
            : null
        );
      } catch (err) {
        console.error("Error fetching user profile:", err);
        setUserProfile(null);
      }

      // 2. Fetch relevant registrations for the event
      try {
        const registrationsRef = collection(db, "registrations");
        // Query for registrations that are either 'pending' or 'approved'
        const q = query(
          registrationsRef,
          where("eventId", "==", eventId),
          where("status", "in", ["pending", "approved"])
        );

        const querySnapshot = await getDocs(q);
        const registrations = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Registration[];

        // Set the count of active registrations
        setRegistrationCount(registrations.length);

        // Check if the current student is already registered
        const userRegistration = registrations.find(
          (reg) => reg.studentId === user.uid
        );
        setIsRegistered(!!userRegistration);
      } catch (err) {
        console.error("Error fetching registrations:", err);
        // Reset state in case of an error
        setRegistrationCount(0);
        setIsRegistered(false);
      }
    };

    fetchData();
  }, [user, authInitialLoading, eventId]);

  const handleRegistration = async () => {
    if (!user || !eventId || !event) return;

    setRegistering(true);
    try {
      // Create a new document in the 'registrations' collection
      await addDoc(collection(db, "registrations"), {
        eventId: eventId,
        studentId: user.uid,
        status: "pending", // Default status upon registration
        registeredAt: serverTimestamp(),
        qrCodeData: `${eventId}-${user.uid}`, // Simple unique identifier for QR code
      });

      // Update UI state immediately for better UX
      setIsRegistered(true);
      setRegistrationCount((prevCount) => prevCount + 1);
      // TODO: Implement a user-friendly success message (e.g., a toast notification)
      console.log("Successfully registered!");
    } catch (error) {
      console.error("Registration failed:", error);
      // TODO: Implement a user-friendly error message
    } finally {
      setRegistering(false);
    }
  };

  const formatEventDate = (date: Timestamp | Date | undefined): string => {
    if (!date) return "Date TBD";
    try {
      const jsDate = date instanceof Timestamp ? date.toDate() : date;
      return format(jsDate, "EEEE, MMMM d, yyyy 'at' h:mm a");
    } catch (e) {
      console.error("Failed to format date:", e);
      return "Invalid Date";
    }
  };

  const getStatusBadgeVariant = (status?: string) => {
    switch (status) {
      case "published":
        return "default";
      case "draft":
        return "secondary";
      case "completed":
        return "outline";
      case "archived":
        return "destructive";
      default:
        return "secondary";
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Skeleton className="h-10 w-40 mb-6" />
        <Skeleton className="w-full h-72 md:h-96 rounded-lg mb-6" />
        <Skeleton className="h-10 w-3/4 mb-4" />
        <Skeleton className="h-6 w-1/2 mb-2" />
        <Skeleton className="h-6 w-1/3 mb-6" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl text-center">
        <AlertTriangle className="mx-auto h-16 w-16 text-destructive mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Error Loading Event</h2>
        <p className="text-muted-foreground mb-6">{error}</p>
        <Button onClick={() => router.push("/events")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Events
        </Button>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl text-center">
        <Info className="mx-auto h-16 w-16 text-primary mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Event Not Found</h2>
        <p className="text-muted-foreground mb-6">
          The event you are looking for is no longer available.
        </p>
        <Button onClick={() => router.push("/events")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Events
        </Button>
      </div>
    );
  }

  const isEventFull = registrationCount >= (event.maxParticipants || Infinity);

  const renderRegistrationButton = () => {
    // Don't show button if auth is loading, user is not a student, or event is not published
    if (
      authInitialLoading ||
      userProfile?.role !== "student" ||
      event.status !== "published"
    ) {
      return null;
    }

    return (
      <div className="px-6 pb-6 flex flex-col items-center">
        <Separator className="my-4" />
        {event.maxParticipants && (
          <p className="text-sm text-muted-foreground mb-4">
            {registrationCount} / {event.maxParticipants} spots filled
          </p>
        )}

        {isRegistered ? (
          <Button disabled className="w-full md:w-auto">
            Registered
          </Button>
        ) : isEventFull ? (
          <Button disabled variant="secondary" className="w-full md:w-auto">
            Registration Full
          </Button>
        ) : (
          <Button
            onClick={handleRegistration}
            disabled={registering}
            className="w-full md:w-auto"
          >
            {registering ? "Registering..." : "Register for Event"}
          </Button>
        )}
      </div>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Button
        variant="outline"
        onClick={() => router.push("/events")}
        className="mb-8 print:hidden"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Events
      </Button>

      <Card className="overflow-hidden shadow-xl">
        <div className="relative w-full h-72 md:h-96 bg-muted">
          {event.imageUrl ? (
            <Image
              src={event.imageUrl}
              alt={event.name}
              fill
              className="object-cover"
              priority
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-muted">
              <Ticket className="w-16 h-16 text-muted-foreground" />
            </div>
          )}
        </div>

        <CardHeader>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <Badge variant={getStatusBadgeVariant(event.status)}>
              {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
            </Badge>
          </div>
          <CardTitle className="text-3xl">{event.name}</CardTitle>
        </CardHeader>

        <CardContent>
          <div className="space-y-6">
            <div className="flex items-start gap-2">
              <CalendarDays className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">Event Date</p>
                <p className="text-sm text-muted-foreground">
                  {formatEventDate(event.date)}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <MapPin className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">Location</p>
                <p className="text-sm text-muted-foreground">{event.venue}</p>
              </div>
            </div>

            {event.maxParticipants && (
              <div className="flex items-start gap-2">
                <Users className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Capacity</p>
                  <p className="text-sm text-muted-foreground">
                    {event.maxParticipants} participants
                  </p>
                </div>
              </div>
            )}

            {event.brochureUrl && (
              <div className="flex items-start gap-2">
                <FileText className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Event Brochure</p>
                  <div className="flex gap-2 mt-1">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          Preview
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl h-[80vh]">
                        <DialogHeader>
                          <DialogTitle className="flex items-center justify-between">
                            <span>Event Brochure Preview</span>
                          </DialogTitle>
                        </DialogHeader>
                        <div className="flex-1 overflow-auto flex flex-col items-center justify-center">
                          <BrochurePreview url={event.brochureUrl} />
                        </div>
                      </DialogContent>
                    </Dialog>
                    <a
                      href={event.brochureUrl || ""}
                      download
                      target="_blank"
                      rel="noopener noreferrer"
                      title="If the file opens in a new tab, right-click and choose 'Save link as...'"
                    >
                      <Button variant="outline" size="sm">
                        Download
                      </Button>
                    </a>
                  </div>
                </div>
              </div>
            )}

            <div className="pt-4">
              <p className="text-sm font-medium mb-2">Description</p>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {event.description}
              </p>
            </div>
          </div>
        </CardContent>

        {renderRegistrationButton()}
      </Card>
    </div>
  );
};

function BrochurePreview({ url }: { url: string }) {
  const [error, setError] = useState(false);
  const isPdf = url.toLowerCase().includes(".pdf");

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full p-8">
        <p className="text-destructive mb-2">Could not preview this file.</p>
        <Button variant="outline" onClick={() => window.open(url, "_blank")}>
          Download Brochure
        </Button>
      </div>
    );
  }

  if (isPdf) {
    return (
      <iframe
        src={url}
        className="w-full h-[70vh] border rounded"
        title="Brochure PDF Preview"
        onError={() => setError(true)}
      />
    );
  }

  return (
    <img
      src={url}
      alt="Brochure Preview"
      className="max-h-[70vh] w-auto object-contain border rounded"
      onError={() => setError(true)}
    />
  );
}

export default EventDetailPage;
