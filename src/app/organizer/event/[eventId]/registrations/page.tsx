
"use client";

import type { NextPage } from 'next';
import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, getDoc, updateDoc, serverTimestamp, orderBy } from 'firebase/firestore';
import type { UserProfile } from '@/types/user';
import type { Event as EventType } from '@/types/event';
import type { Registration, RegistrationStatus } from '@/types/registration';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, ShieldAlert, Users, ArrowLeft, CheckCircle, XCircle, Mail } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface RegistrationWithStudentInfo extends Registration {
  studentEmail?: string;
  studentName?: string; // If you store names in UserProfile
}

const EventRegistrationsPage: NextPage = () => {
  const { user, initialLoading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const eventId = params.eventId as string;
  const { toast } = useToast();

  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [event, setEvent] = useState<EventType | null>(null);
  const [registrations, setRegistrations] = useState<RegistrationWithStudentInfo[]>([]);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingRegistrationId, setUpdatingRegistrationId] = useState<string | null>(null);

  const fetchEventAndCheckAuth = useCallback(async (currentUid: string, currentEventId: string) => {
    setLoading(true);
    try {
      // Fetch current user's profile
      const userDocSnap = await getDocs(query(collection(db, 'users'), where('uid', '==', currentUid)));
      let currentUserRole: UserProfile['role'] | null = null;
      if (!userDocSnap.empty) {
        const profile = userDocSnap.docs[0].data() as UserProfile;
        setUserProfile(profile);
        currentUserRole = profile.role;
      }

      if (!currentUserRole) {
        setError("Failed to verify user role.");
        setIsAuthorized(false);
        setLoading(false);
        return;
      }

      // Fetch event details
      const eventDocRef = doc(db, 'events', currentEventId);
      const eventDoc = await getDoc(eventDocRef);

      if (!eventDoc.exists()) {
        setError("Event not found.");
        setLoading(false);
        return;
      }
      const eventData = { id: eventDoc.id, ...eventDoc.data() } as EventType;
      setEvent(eventData);

      // Authorization check
      if (currentUserRole === 'admin' || currentUserRole === 'coadmin' || (currentUserRole === 'organizer' && eventData.organizerId === currentUid)) {
        setIsAuthorized(true);
      } else {
        setIsAuthorized(false);
        setError("You are not authorized to manage registrations for this event.");
      }
    } catch (err: any) {
      console.error("Error fetching event or user profile:", err);
      setError(`Failed to load page data. (${err.message})`);
      setIsAuthorized(false);
    } finally {
        // setLoading(false) will be handled by fetchRegistrations if authorized
        if(!isAuthorized) setLoading(false);
    }
  }, [isAuthorized]); // Added isAuthorized to dependencies

  const fetchRegistrations = useCallback(async (currentEventId: string) => {
    if (!isAuthorized) {
      setLoading(false);
      return;
    }
    setError(null);
    try {
      const registrationsQuery = query(
        collection(db, 'registrations'),
        where('eventId', '==', currentEventId),
        orderBy('registeredAt', 'desc')
      );
      const querySnapshot = await getDocs(registrationsQuery);
      
      const fetchedRegistrationsPromises = querySnapshot.docs.map(async (docSnap) => {
        const regData = { id: docSnap.id, ...docSnap.data() } as Registration;
        let studentEmail: string | undefined = 'N/A';
        // Fetch student info
        try {
            const userDocRef = doc(db, 'users', regData.studentId);
            const userDoc = await getDoc(userDocRef);
            if (userDoc.exists()) {
                studentEmail = (userDoc.data() as UserProfile).email || 'Email not found';
            }
        } catch (userFetchError) {
            console.error(`Failed to fetch user ${regData.studentId}`, userFetchError);
        }
        return { ...regData, studentEmail };
      });

      const resolvedRegistrations = await Promise.all(fetchedRegistrationsPromises);
      setRegistrations(resolvedRegistrations);

    } catch (err: any) {
      console.error("Error fetching registrations:", err);
      setError(`Failed to load registrations. (${err.message})`);
    } finally {
      setLoading(false);
    }
  }, [isAuthorized]); // Added isAuthorized to dependencies

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace(`/login?redirect=/organizer/event/${eventId}/registrations`);
      return;
    }
    if (eventId) {
      fetchEventAndCheckAuth(user.uid, eventId);
    }
  }, [user, authLoading, router, eventId, fetchEventAndCheckAuth]);

  useEffect(() => {
    if (isAuthorized && eventId) {
      fetchRegistrations(eventId);
    }
  }, [isAuthorized, eventId, fetchRegistrations]);

  const handleUpdateStatus = async (registrationId: string, newStatus: RegistrationStatus) => {
    setUpdatingRegistrationId(registrationId);
    try {
      const regDocRef = doc(db, 'registrations', registrationId);
      await updateDoc(regDocRef, {
        status: newStatus,
        updatedAt: serverTimestamp(), // Assuming you add an updatedAt field
      });
      toast({
        title: "Status Updated",
        description: `Registration status changed to ${newStatus}.`,
      });
      setRegistrations(prev => 
        prev.map(r => r.id === registrationId ? { ...r, status: newStatus } : r)
      );
    } catch (err: any) {
      console.error("Error updating registration status:", err);
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: `Could not update status. (${err.message})`,
      });
    } finally {
      setUpdatingRegistrationId(null);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Loading registration data...</p>
      </div>
    );
  }

  if (!isAuthorized && !authLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <ShieldAlert className="h-16 w-16 text-destructive mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Access Denied</h2>
        <p className="text-muted-foreground">{error || "You do not have permission to view this page."}</p>
        <Button onClick={() => router.push('/organizer/dashboard')} className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
        </Button>
      </div>
    );
  }
  
  if (error && !loading) { // Show error only if not loading to prevent flicker
    return <div className="text-center text-destructive py-10">{error}</div>;
  }

  return (
    <div className="container mx-auto py-8 px-4">
        <Button variant="outline" onClick={() => router.push('/organizer/dashboard')} className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
        </Button>
      <Card className="shadow-xl">
        <CardHeader>
            <div className="flex items-center gap-2">
                <Users className="h-6 w-6 text-primary"/>
                <CardTitle className="text-2xl font-bold text-primary">Manage Registrations</CardTitle>
            </div>
          <CardDescription>For event: <span className="font-semibold">{event?.name || 'Loading event name...'}</span></CardDescription>
        </CardHeader>
        <CardContent>
          {registrations.length === 0 && !loading ? (
            <p className="text-center text-muted-foreground py-10">No registrations found for this event yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student Email</TableHead>
                  <TableHead>Registered At</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {registrations.map((reg) => (
                  <TableRow key={reg.id}>
                    <TableCell className="font-medium flex items-center">
                        <Mail className="mr-2 h-4 w-4 text-muted-foreground"/>
                        {reg.studentEmail || 'Loading...'}
                    </TableCell>
                    <TableCell>{reg.registeredAt ? format( (reg.registeredAt as Timestamp).toDate(), 'PPp') : 'N/A'}</TableCell>
                    <TableCell>
                      <Badge 
                        variant={
                            reg.status === 'approved' ? 'default' : 
                            reg.status === 'pending' ? 'secondary' :
                            reg.status === 'rejected' ? 'destructive' : 'outline'
                        }
                      >
                        {reg.status.charAt(0).toUpperCase() + reg.status.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      {updatingRegistrationId === reg.id ? (
                        <Loader2 className="h-5 w-5 animate-spin inline-flex" />
                      ) : (
                        <>
                          {reg.status !== 'approved' && (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => handleUpdateStatus(reg.id!, 'approved')}
                              disabled={updatingRegistrationId === reg.id}
                              className="text-green-600 border-green-600 hover:bg-green-50 hover:text-green-700"
                            >
                              <CheckCircle className="mr-1 h-4 w-4"/> Approve
                            </Button>
                          )}
                          {reg.status !== 'rejected' && (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => handleUpdateStatus(reg.id!, 'rejected')}
                              disabled={updatingRegistrationId === reg.id}
                              className="text-red-600 border-red-600 hover:bg-red-50 hover:text-red-700"
                            >
                              <XCircle className="mr-1 h-4 w-4"/> Reject
                            </Button>
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

export default EventRegistrationsPage;
    