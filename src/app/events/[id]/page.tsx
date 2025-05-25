"use client";

import type { NextPage } from 'next';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import { doc, getDoc, Timestamp, collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import type { UserProfile } from '@/types/user';
import type { Registration } from '@/types/registration';
import type { Event as EventType } from '@/types/event';
import { format } from 'date-fns';
import { ArrowLeft, CalendarDays, Users, MapPin, AlertTriangle, Info, Ticket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

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
        const eventDocRef = doc(db, 'events', eventId);
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
        const userDocRef = doc(db, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);
        setUserProfile(userDocSnap.exists() ? { id: userDocSnap.id, ...userDocSnap.data() } as unknown as UserProfile : null);
      } catch (err) {
        console.error("Error fetching user profile:", err);
        setUserProfile(null);
      }

      // 2. Fetch relevant registrations for the event
      try {
        const registrationsRef = collection(db, 'registrations');
        // Query for registrations that are either 'pending' or 'approved'
        const q = query(
          registrationsRef,
          where('eventId', '==', eventId),
          where('status', 'in', ['pending', 'approved'])
        );

        const querySnapshot = await getDocs(q);
        const registrations = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Registration[];

        // Set the count of active registrations
        setRegistrationCount(registrations.length);

        // Check if the current student is already registered
        const userRegistration = registrations.find(reg => reg.studentId === user.uid);
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
      await addDoc(collection(db, 'registrations'), {
        eventId: eventId,
        studentId: user.uid,
        status: 'pending', // Default status upon registration
        registeredAt: serverTimestamp(),
        qrCodeData: `${eventId}-${user.uid}`, // Simple unique identifier for QR code
      });

      // Update UI state immediately for better UX
      setIsRegistered(true);
      setRegistrationCount(prevCount => prevCount + 1);
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
      case 'published': return 'default';
      case 'draft': return 'secondary';
      case 'completed': return 'outline';
      case 'archived': return 'destructive';
      default: return 'secondary';
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
        <Button onClick={() => router.push('/events')}>
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
        <p className="text-muted-foreground mb-6">The event you are looking for is no longer available.</p>
        <Button onClick={() => router.push('/events')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Events
        </Button>
      </div>
    );
  }

  const isEventFull = registrationCount >= (event.maxParticipants || Infinity);

  const renderRegistrationButton = () => {
    // Don't show button if auth is loading, user is not a student, or event is not published
    if (authInitialLoading || userProfile?.role !== 'student' || event.status !== 'published') {
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
          <Button onClick={handleRegistration} disabled={registering} className="w-full md:w-auto">
            {registering ? 'Registering...' : 'Register for Event'}
          </Button>
        )}
      </div>
    );
  };


  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Button variant="outline" onClick={() => router.push('/events')} className="mb-8 print:hidden">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Events
      </Button>

      <Card className="overflow-hidden shadow-xl">
        <div className="relative w-full h-72 md:h-96 bg-muted">
          <Image
            src={event.imageUrl || `https://placehold.co/1200x600.png`}
            alt={event.name || 'Event image'}
            fill
            style={{ objectFit: "cover" }}
            className="rounded-t-lg"
            priority
          />
        </div>
        <CardHeader className="pt-6">
          <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-2 mb-2">
            <CardTitle className="text-3xl md:text-4xl font-bold text-primary break-words">
              {event.name}
            </CardTitle>
            {event.status && (
              <Badge variant={getStatusBadgeVariant(event.status)} className="text-sm capitalize whitespace-nowrap mt-1 sm:mt-0">
                <Ticket className="mr-1.5 h-4 w-4" />
                {event.status}
              </Badge>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-muted-foreground text-sm">
            <div className="flex items-center">
              <CalendarDays className="mr-2 h-4 w-4 text-accent" />
              <span>{formatEventDate(event.date)}</span>
            </div>
            <div className="flex items-center">
              <MapPin className="mr-2 h-4 w-4 text-accent" />
              <span className="truncate">{event.venue}</span>
            </div>
            <div className="flex items-center">
              <Users className="mr-2 h-4 w-4 text-accent" />
              <span>Up to {event.maxParticipants} participants</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-2 pb-6">
          <Separator className="my-4" />
          <h3 className="text-xl font-semibold mb-3 text-foreground">Event Description</h3>
          <p className="text-base text-foreground/80 whitespace-pre-wrap leading-relaxed">
            {event.description}
          </p>
        </CardContent>

        {/* Registration Section */}
        {renderRegistrationButton()}

      </Card>
    </div>
  );
};

export default EventDetailPage;