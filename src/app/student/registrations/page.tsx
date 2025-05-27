"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
} from "firebase/firestore";
import type { Registration } from "@/types/registration";
import type { Event as EventType } from "@/types/event";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  ArrowLeft,
  CalendarDays,
  MapPin,
  Users,
  Download,
  FileCheck,
} from "lucide-react";
import { format } from "date-fns";
import { QRCodeDisplay } from "@/components/QRCodeDisplay";
import type { Timestamp } from "firebase/firestore";

interface RegistrationWithEvent extends Registration {
  event?: EventType;
}

export default function StudentRegistrationsPage() {
  const router = useRouter();
  const { user, initialLoading: authLoading } = useAuth();
  const [registrations, setRegistrations] = useState<RegistrationWithEvent[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRegistrations = useCallback(async () => {
    if (!user) return;

    try {
      const registrationsQuery = query(
        collection(db, "registrations"),
        where("studentId", "==", user.uid)
      );
      const querySnapshot = await getDocs(registrationsQuery);

      const registrationsWithEvents = await Promise.all(
        querySnapshot.docs.map(async (regDoc) => {
          const registration = {
            id: regDoc.id,
            ...regDoc.data(),
          } as Registration;
          let event: EventType | undefined;

          try {
            const eventDoc = await getDoc(
              doc(db, "events", registration.eventId)
            );
            if (eventDoc.exists()) {
              event = { id: eventDoc.id, ...eventDoc.data() } as EventType;
            }
          } catch (err) {
            console.error("Error fetching event:", err);
          }

          return { ...registration, event };
        })
      );

      setRegistrations(registrationsWithEvents);
    } catch (err) {
      console.error("Error fetching registrations:", err);
      setError("Failed to load registrations. Please try again later.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/login?redirect=/student/registrations");
      return;
    }

    fetchRegistrations();
  }, [user, authLoading, router, fetchRegistrations]);

  const formatEventDate = (timestamp: Timestamp | undefined): string => {
    if (!timestamp) return "Date TBD";
    try {
      const date = timestamp.toDate();
      return format(date, "EEEE, MMMM d, yyyy 'at' h:mm a");
    } catch (e) {
      console.error("Failed to format date:", e);
      return "Invalid Date";
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="ml-2">Loading your registrations...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-2">Error</h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={() => router.push("/events")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Events
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">My Registrations</h1>

      {registrations.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">
            You haven't registered for any events yet.
          </p>
          <Button onClick={() => router.push("/events")}>Browse Events</Button>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {registrations.map((registration) => (
            <Card key={registration.id} className="overflow-hidden">
              <CardHeader>
                <CardTitle className="text-xl">
                  {registration.event?.name || "Event Name Not Found"}
                </CardTitle>
                <Badge
                  variant={
                    registration.status === "approved"
                      ? "default"
                      : registration.status === "pending"
                      ? "secondary"
                      : "destructive"
                  }
                >
                  {registration.status.charAt(0).toUpperCase() +
                    registration.status.slice(1)}
                </Badge>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start gap-2">
                    <CalendarDays className="w-5 h-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Event Date</p>
                      <p className="text-sm text-muted-foreground">
                        {formatEventDate(registration.event?.date)}
                      </p>
                    </div>
                  </div>

                  {registration.event?.venue && (
                    <div className="flex items-start gap-2">
                      <MapPin className="w-5 h-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">Location</p>
                        <p className="text-sm text-muted-foreground">
                          {registration.event.venue}
                        </p>
                      </div>
                    </div>
                  )}

                  {registration.event?.maxParticipants && (
                    <div className="flex items-start gap-2">
                      <Users className="w-5 h-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">Capacity</p>
                        <p className="text-sm text-muted-foreground">
                          {registration.event.maxParticipants} participants
                        </p>
                      </div>
                    </div>
                  )}

                  {registration.status === "approved" && (
                    <div className="pt-4 border-t">
                      <p className="text-sm font-medium mb-2">
                        Check-in QR Code
                      </p>
                      <QRCodeDisplay
                        data={registration.qrCodeData}
                        size={150}
                      />
                    </div>
                  )}

                  {registration.status === "attended" && (
                    <div className="pt-4 border-t">
                      <p className="text-sm font-medium mb-2">Certificate</p>
                      {registration.certificateUrl ? (
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() =>
                            window.open(registration.certificateUrl, "_blank")
                          }
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Download Certificate
                        </Button>
                      ) : (
                        <div className="flex flex-col items-center justify-center p-4 bg-muted rounded-lg space-y-2">
                          <div className="flex items-center">
                            <FileCheck className="w-4 h-4 mr-2 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">
                              Event certificate will be sent to your email later
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
