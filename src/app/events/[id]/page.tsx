
"use client";

import type { NextPage } from 'next';
import { useParams, useRouter }_next_app_not_found_error_AE1E04415F34547D from 'next/navigation';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import { doc, getDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Event as EventType } from '@/types/event';
import { format } from 'date-fns';
import { ArrowLeft, CalendarDays, Users, MapPin, AlertTriangle, Info, Ticket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
      case 'published':
        return 'default';
      case 'draft':
        return 'secondary';
      case 'completed':
        return 'outline';
      case 'archived':
        return 'destructive';
      default:
        return 'secondary';
    }
  };


  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Button variant="outline" onClick={() => router.push('/events')} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Events
        </Button>
        <Skeleton className="w-full h-72 md:h-96 rounded-lg mb-6" />
        <Skeleton className="h-10 w-3/4 mb-4" />
        <Skeleton className="h-6 w-1/2 mb-2" />
        <Skeleton className="h-6 w-1/2 mb-2" />
        <Skeleton className="h-6 w-1/3 mb-6" />
        <Skeleton className="h-20 w-full mb-4" />
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
     // This state should ideally be covered by the error "Event not found"
     // but as a fallback for any other case where event is null post-loading without a specific error.
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl text-center">
        <Info className="mx-auto h-16 w-16 text-primary mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Event Information Unavailable</h2>
        <p className="text-muted-foreground mb-6">The event you are looking for could not be found or is no longer available.</p>
        <Button onClick={() => router.push('/events')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Events
        </Button>
      </div>
    );
  }

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
            layout="fill"
            objectFit="cover"
            className="rounded-t-lg"
            data-ai-hint={event.imageUrl ? "" : "event banner placeholder"}
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
          <CardDescription className="text-base text-foreground whitespace-pre-wrap leading-relaxed">
            {event.description}
          </CardDescription>
        </CardContent>
      </Card>
    </div>
  );
};

export default EventDetailPage;
