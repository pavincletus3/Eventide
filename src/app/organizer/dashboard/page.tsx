
"use client";

import type { NextPage } from 'next';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy, collectionGroup, getCountFromServer, Timestamp } from 'firebase/firestore';
import type { UserProfile } from '@/types/user';
import type { Event as EventType } from '@/types/event';
import type { Registration } from '@/types/registration';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, ShieldAlert, CalendarPlus, ListOrdered, Eye } from 'lucide-react';
import { format } from 'date-fns';

interface EventWithRegistrationCounts extends EventType {
  pendingRegistrations: number;
  approvedRegistrations: number;
}

const OrganizerDashboardPage: NextPage = () => {
  const { user, initialLoading: authLoading } = useAuth();
  const router = useRouter();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [events, setEvents] = useState<EventWithRegistrationCounts[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUserProfileAndAuthorize = useCallback(async (uid: string) => {
    setLoading(true);
    try {
      const userDocSnap = await getDocs(query(collection(db, 'users'), where('uid', '==', uid)));
      if (!userDocSnap.empty) {
        const profile = userDocSnap.docs[0].data() as UserProfile;
        setUserProfile(profile);
        if (['organizer', 'coadmin', 'admin'].includes(profile.role)) {
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

  const fetchEvents = useCallback(async (role: string | null, uid: string | null) => {
    if (!role || !uid) {
      setLoading(false);
      return;
    }

    setError(null);
    try {
      let eventsQuery;
      const eventsCollectionRef = collection(db, 'events');
      if (role === 'admin') {
        eventsQuery = query(eventsCollectionRef, orderBy('createdAt', 'desc'));
      } else { // organizer or coadmin
        eventsQuery = query(eventsCollectionRef, where('organizerId', '==', uid), orderBy('createdAt', 'desc'));
      }
      
      const querySnapshot = await getDocs(eventsQuery);
      const fetchedEventsPromises = querySnapshot.docs.map(async (docSnap) => {
        const eventData = { id: docSnap.id, ...docSnap.data() } as EventType;
        
        // Fetch registration counts for each event
        // This is a simplified approach for now. For scalability, consider denormalization.
        let pendingCount = 0;
        let approvedCount = 0;
        
        if (eventData.id) {
            const pendingQuery = query(collection(db, 'registrations'), where('eventId', '==', eventData.id), where('status', '==', 'pending'));
            const approvedQuery = query(collection(db, 'registrations'), where('eventId', '==', eventData.id), where('status', '==', 'approved'));
            
            const pendingSnap = await getCountFromServer(pendingQuery);
            const approvedSnap = await getCountFromServer(approvedQuery);
            
            pendingCount = pendingSnap.data().count;
            approvedCount = approvedSnap.data().count;
        }

        return { 
          ...eventData, 
          pendingRegistrations: pendingCount, 
          approvedRegistrations: approvedCount 
        } as EventWithRegistrationCounts;
      });

      const resolvedEvents = await Promise.all(fetchedEventsPromises);
      setEvents(resolvedEvents);

    } catch (err: any) {
      console.error("Error fetching events:", err);
      setError(`Failed to load events. (${err.message})`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace('/login?redirect=/organizer/dashboard');
      return;
    }
    fetchUserProfileAndAuthorize(user.uid).then(role => {
      if (role && ['organizer', 'coadmin', 'admin'].includes(role)) {
        fetchEvents(role, user.uid);
      } else if (role) { // User profile fetched, but not authorized
        router.replace('/');
      }
      // If role is null, it means profile fetch failed or user not found, error already set
    });
  }, [user, authLoading, router, fetchUserProfileAndAuthorize, fetchEvents]);


  const formatEventDate = (date: Timestamp | Date | undefined): string => {
    if (!date) return "Date TBD";
    const jsDate = date instanceof Timestamp ? date.toDate() : date;
    return format(jsDate, "PPp");
  };

  if (authLoading || loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Loading dashboard...</p>
      </div>
    );
  }

  if (!isAuthorized && !authLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <ShieldAlert className="h-16 w-16 text-destructive mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Access Denied</h2>
        <p className="text-muted-foreground">You do not have permission to view this page.</p>
        <Button onClick={() => router.push('/')} className="mt-4">Go to Homepage</Button>
      </div>
    );
  }
  
  if (error) {
    return <div className="text-center text-destructive py-10">{error}</div>;
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <Card className="shadow-xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
                <ListOrdered className="h-6 w-6 text-primary"/>
                <CardTitle className="text-2xl font-bold text-primary">Organizer Dashboard</CardTitle>
            </div>
            <Button asChild>
                <Link href="/events/create">
                    <CalendarPlus className="mr-2 h-4 w-4"/> Create New Event
                </Link>
            </Button>
          </div>
          <CardDescription>Manage your events and view their registration status.</CardDescription>
        </CardHeader>
        <CardContent>
          {events.length === 0 && !loading ? (
            <p className="text-center text-muted-foreground py-10">
              {userProfile?.role === 'admin' ? "No events found in the system." : "You have not created any events yet."}
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
                      <Badge variant={event.status === 'published' ? 'default' : event.status === 'draft' ? 'secondary' : 'outline'}>
                        {event.status?.charAt(0).toUpperCase() + event.status?.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {event.pendingRegistrations} Pending / {event.approvedRegistrations} Approved
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/organizer/event/${event.id}/registrations`}>
                          <Eye className="mr-1 h-4 w-4" /> Manage
                        </Link>
                      </Button>
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
    