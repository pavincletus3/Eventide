
"use client";

import { useEffect, useState } from 'react';
import { collection, query, where, getDocs, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Event as EventType } from '@/types/event';
import EventCard from '@/components/event/EventCard';
import { Loader2, CalendarX2 } from 'lucide-react';

const EventsPage = () => {
  const [events, setEvents] = useState<EventType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPublishedEvents = async () => {
      setLoading(true);
      setError(null);
      try {
        const eventsCollectionRef = collection(db, 'events');
        // Query for published events, ordered by date (upcoming first)
        const q = query(
          eventsCollectionRef,
          where('status', '==', 'published'),
          orderBy('date', 'asc') 
        );
        
        const querySnapshot = await getDocs(q);
        const fetchedEvents: EventType[] = querySnapshot.docs.map(doc => {
          const data = doc.data() as Omit<EventType, 'id'>; // Data from Firestore
          // Ensure date is a Timestamp object if it's coming from Firestore
          // If data.date is already a Timestamp, this should be fine.
          // If it's a plain object (e.g. from server serialization, which isn't the case here), 
          // it would need conversion, but getDocs directly returns Timestamps.
          return {
            id: doc.id,
            ...data,
            // date: data.date, // Already a Timestamp
          } as EventType;
        });
        
        setEvents(fetchedEvents);
      } catch (err: any) {
        console.error("Error fetching published events:", err);
        setError(`Failed to load events. ${err.message || 'Please try again later.'}`);
      } finally {
        setLoading(false);
      }
    };

    fetchPublishedEvents();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg text-muted-foreground">Loading upcoming events...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center text-destructive py-10">
         <CalendarX2 className="h-16 w-16 mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Oops! Something went wrong.</h2>
        <p>{error}</p>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <CalendarX2 className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-semibold mb-2">No Events Yet</h2>
        <p className="text-muted-foreground">There are currently no published events. Check back soon!</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-primary mb-8 text-center">
        Published Events
      </h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {events.map(event => (
          <EventCard key={event.id} event={event} />
        ))}
      </div>
    </div>
  );
};

export default EventsPage;
