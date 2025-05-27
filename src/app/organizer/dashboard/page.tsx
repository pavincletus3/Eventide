"use client";

import type { NextPage } from "next";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  getDoc, // Ensured import for fetching a single document
  orderBy,
  doc,
  updateDoc,
  serverTimestamp,
  getCountFromServer,
  Timestamp,
} from "firebase/firestore";
import type { UserProfile } from "@/types/user";
import type { Event as EventType, EventStatus } from "@/types/event";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  ShieldAlert,
  CalendarPlus,
  ListOrdered,
  Eye,
  CheckCircle,
  Archive,
  Edit3,
  AlertTriangle,
  Camera,
  FileText,
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface EventWithRegistrationCounts extends EventType {
  pendingRegistrations: number;
  approvedRegistrations: number;
}

const OrganizerDashboardPage: NextPage = () => {
  const { user, initialLoading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [events, setEvents] = useState<EventWithRegistrationCounts[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingEventId, setUpdatingEventId] = useState<string | null>(null);

  const fetchUserProfileAndAuthorize = useCallback(async (uid: string) => {
    setLoading(true);
    try {
      // Firestore uses UID as document ID in 'users' collection
      const userDocRef = doc(db, "users", uid);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        const profile = {
          uid: userDocSnap.id,
          ...userDocSnap.data(),
        } as UserProfile;
        setUserProfile(profile);
        if (["organizer", "coadmin", "admin"].includes(profile.role)) {
          setIsAuthorized(true);
          return profile.role;
        }
      }
      setIsAuthorized(false);
      return null;
    } catch (err) {
      console.error("Error fetching user profile:", err);
      setError("Failed to verify user authorization.");
      setIsAuthorized(false);
      return null;
    }
  }, []);

  const fetchEvents = useCallback(
    async (role: string | null, uid: string | null) => {
      if (!role || !uid) {
        setLoading(false);
        return;
      }

      setError(null);
      try {
        let eventsQuery;
        const eventsCollectionRef = collection(db, "events");
        if (role === "admin") {
          eventsQuery = query(
            eventsCollectionRef,
            orderBy("createdAt", "desc")
          );
        } else {
          // organizer or coadmin
          eventsQuery = query(
            eventsCollectionRef,
            where("organizerId", "==", uid),
            orderBy("createdAt", "desc")
          );
        }

        const querySnapshot = await getDocs(eventsQuery);
        const fetchedEventsPromises = querySnapshot.docs.map(
          async (docSnap) => {
            const eventData = {
              id: docSnap.id,
              ...docSnap.data(),
            } as EventType;

            let pendingCount = 0;
            let approvedCount = 0;

            if (eventData.id) {
              const pendingQuery = query(
                collection(db, "registrations"),
                where("eventId", "==", eventData.id),
                where("status", "==", "pending")
              );
              const approvedQuery = query(
                collection(db, "registrations"),
                where("eventId", "==", eventData.id),
                where("status", "==", "approved")
              );

              const pendingSnap = await getCountFromServer(pendingQuery);
              const approvedSnap = await getCountFromServer(approvedQuery);

              pendingCount = pendingSnap.data().count;
              approvedCount = approvedSnap.data().count;
            }

            return {
              ...eventData,
              pendingRegistrations: pendingCount,
              approvedRegistrations: approvedCount,
            } as EventWithRegistrationCounts;
          }
        );

        const resolvedEvents = await Promise.all(fetchedEventsPromises);
        setEvents(resolvedEvents);
      } catch (err: any) {
        console.error("Error fetching events:", err);
        setError(`Failed to load events. (${err.message})`);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/login?redirect=/organizer/dashboard");
      return;
    }
    fetchUserProfileAndAuthorize(user.uid).then((role) => {
      if (role && ["organizer", "coadmin", "admin"].includes(role)) {
        fetchEvents(role, user.uid);
      } else if (role) {
        router.replace("/");
      } else {
        // If role is null (profile not found or other issue)
        setIsAuthorized(false); // Ensure isAuthorized is false if role couldn't be determined
        setLoading(false); // Stop loading
        setError("Could not verify user role. Profile may be missing.");
        router.replace("/");
      }
    });
  }, [user, authLoading, router, fetchUserProfileAndAuthorize, fetchEvents]);

  const handleUpdateEventStatus = async (
    eventId: string,
    newStatus: EventStatus
  ) => {
    setUpdatingEventId(eventId);
    try {
      const eventDocRef = doc(db, "events", eventId);
      await updateDoc(eventDocRef, {
        status: newStatus,
        updatedAt: serverTimestamp(),
      });
      toast({
        title: "Success",
        description: `Event status updated to ${newStatus}.`,
      });
      setEvents((prevEvents) =>
        prevEvents.map((event) =>
          event.id === eventId
            ? { ...event, status: newStatus, updatedAt: Timestamp.now() }
            : event
        )
      );
    } catch (err: any) {
      console.error(`Error updating event status to ${newStatus}:`, err);
      toast({
        variant: "destructive",
        title: "Error",
        description: `Failed to update event status. ${err.message}`,
      });
    } finally {
      setUpdatingEventId(null);
    }
  };

  const formatEventDate = (date: Timestamp | Date | undefined): string => {
    if (!date) return "Date TBD";
    const jsDate = date instanceof Timestamp ? date.toDate() : date;
    return format(jsDate, "PPp");
  };

  const getStatusBadgeVariant = (status?: EventStatus) => {
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

  if (authLoading || loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Loading dashboard...</p>
      </div>
    );
  }

  if (!isAuthorized && !authLoading && !loading) {
    // Added !loading to ensure it's not a flicker
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <ShieldAlert className="h-16 w-16 text-destructive mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Access Denied</h2>
        <p className="text-muted-foreground">
          {error || "You do not have permission to view this page."}
        </p>
        <Button onClick={() => router.push("/")} className="mt-4">
          Go to Homepage
        </Button>
      </div>
    );
  }

  if (error && !loading) {
    // Show error only if not loading
    return (
      <div className="text-center text-destructive py-10">
        <AlertTriangle className="mx-auto h-12 w-12 mb-2" />
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <Card className="shadow-xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ListOrdered className="h-6 w-6 text-primary" />
              <CardTitle className="text-2xl font-bold text-primary">
                Event Management
              </CardTitle>
            </div>
            {(userProfile?.role === "admin" ||
              userProfile?.role === "coadmin" ||
              userProfile?.role === "organizer") && (
              <Button asChild>
                <Link href="/events/create">
                  <CalendarPlus className="mr-2 h-4 w-4" /> Create New Event
                </Link>
              </Button>
            )}
          </div>
          <CardDescription>
            Manage your events, view registrations, and update event statuses.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {events.length === 0 && !loading ? (
            <p className="text-center text-muted-foreground py-10">
              {userProfile?.role === "admin"
                ? "No events found in the system."
                : "You have not created any events yet."}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event Name</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Registrations (Pending/Approved)</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell className="font-medium">{event.name}</TableCell>
                    <TableCell>{formatEventDate(event.date)}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(event.status)}>
                        {event.status?.charAt(0).toUpperCase() +
                          event.status?.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {event.pendingRegistrations} Pending /{" "}
                      {event.approvedRegistrations} Approved
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      {(userProfile?.role === "admin" ||
                        userProfile?.role === "coadmin" ||
                        event.organizerId === user?.uid) && (
                        <>
                          <Button
                            asChild
                            variant="outline"
                            size="sm"
                            className="mr-2"
                          >
                            <Link
                              href={`/organizer/event/${event.id}/registrations`}
                            >
                              <Eye className="mr-1 h-4 w-4" /> Manage
                              Registrations
                            </Link>
                          </Button>
                          <Button
                            asChild
                            variant="outline"
                            size="sm"
                            className="mr-2 text-primary border-primary hover:bg-blue-50 hover:text-blue-700"
                          >
                            <Link
                              href={`/organizer/events/${event.id}/scan-attendance`}
                            >
                              <Camera className="mr-1 h-4 w-4" /> Scan
                              Attendance
                            </Link>
                          </Button>
                          <Button
                            asChild
                            variant="outline"
                            size="sm"
                            className="mr-2 text-violet-700 border-violet-700 hover:bg-violet-50 hover:text-violet-800"
                          >
                            <Link
                              href={`/organizer/events/${event.id}/certificate-template`}
                            >
                              <FileText className="mr-1 h-4 w-4" /> Certificate
                              Template
                            </Link>
                          </Button>
                        </>
                      )}
                      {updatingEventId === event.id ? (
                        <Loader2 className="h-5 w-5 animate-spin inline-flex" />
                      ) : (
                        <>
                          {event.status === "draft" &&
                            (userProfile?.role === "admin" ||
                              userProfile?.role === "coadmin" ||
                              event.organizerId === user?.uid) && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-green-600 border-green-600 hover:bg-green-50 hover:text-green-700"
                                  >
                                    <CheckCircle className="mr-1 h-4 w-4" />{" "}
                                    Publish
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>
                                      Confirm Publish
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to publish the event
                                      "{event.name}"? It will become visible to
                                      students.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>
                                      Cancel
                                    </AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() =>
                                        handleUpdateEventStatus(
                                          event.id!,
                                          "published"
                                        )
                                      }
                                      className="bg-green-600 hover:bg-green-700"
                                    >
                                      Publish Event
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                          {event.status === "published" &&
                            (userProfile?.role === "admin" ||
                              userProfile?.role === "coadmin" ||
                              event.organizerId === user?.uid) && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-amber-600 border-amber-600 hover:bg-amber-50 hover:text-amber-700"
                                  >
                                    <Archive className="mr-1 h-4 w-4" /> Archive
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>
                                      Confirm Archive
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to archive the event
                                      "{event.name}"? It will be hidden from
                                      public view and new registrations will be
                                      disabled.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>
                                      Cancel
                                    </AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() =>
                                        handleUpdateEventStatus(
                                          event.id!,
                                          "archived"
                                        )
                                      }
                                      className="bg-amber-600 hover:bg-amber-700"
                                    >
                                      Archive Event
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                          {event.status === "archived" &&
                            (userProfile?.role === "admin" ||
                              userProfile?.role === "coadmin" ||
                              event.organizerId === user?.uid) && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-blue-600 border-blue-600 hover:bg-blue-50 hover:text-blue-700"
                                  >
                                    <Edit3 className="mr-1 h-4 w-4" /> Set to
                                    Draft
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>
                                      Confirm Set to Draft
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to set the event "
                                      {event.name}" back to draft? You can then
                                      edit and re-publish it.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>
                                      Cancel
                                    </AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() =>
                                        handleUpdateEventStatus(
                                          event.id!,
                                          "draft"
                                        )
                                      }
                                      className="bg-blue-600 hover:bg-blue-700"
                                    >
                                      Set to Draft
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default OrganizerDashboardPage;
