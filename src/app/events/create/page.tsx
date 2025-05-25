
"use client";

import type { ChangeEvent } from 'react';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { Timestamp, collection, doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { CalendarIcon, Loader2, ShieldAlert, ImageUp } from 'lucide-react';

import { useAuth } from '@/contexts/AuthContext';
import { db, uploadFileAndGetURL } from '@/lib/firebase';
import type { UserProfile } from '@/types/user';
import type { Event, EventStatus } from '@/types/event';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const EventSchema = z.object({
  name: z.string().min(3, { message: "Event name must be at least 3 characters." }),
  description: z.string().min(10, { message: "Description must be at least 10 characters." }),
  date: z.date({ required_error: "Event date is required." }),
  timeHours: z.string().regex(/^([01]\d|2[0-3])$/, { message: "Invalid hours (00-23)."}),
  timeMinutes: z.string().regex(/^[0-5]\d$/, { message: "Invalid minutes (00-59)."}),
  venue: z.string().min(3, { message: "Venue must be at least 3 characters." }),
  maxParticipants: z.coerce.number().int().positive({ message: "Max participants must be a positive number." }),
  image: z.instanceof(File).optional(),
});

type EventFormValues = z.infer<typeof EventSchema>;

const CreateEventPage = () => {
  const { user, initialLoading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const form = useForm<EventFormValues>({
    resolver: zodResolver(EventSchema),
    defaultValues: {
      name: "",
      description: "",
      date: undefined,
      timeHours: "12",
      timeMinutes: "00",
      venue: "",
      maxParticipants: 10,
      image: undefined,
    },
  });

  const fetchUserRole = useCallback(async (uid: string) => {
    try {
      const userDocRef = doc(db, 'users', uid);
      const userDocSnap = await getDoc(userDocRef);
      if (userDocSnap.exists()) {
        const profile = userDocSnap.data() as UserProfile;
        setUserProfile(profile);
        if (['organizer', 'coadmin', 'admin'].includes(profile.role)) {
          setIsAuthorized(true);
        } else {
          setIsAuthorized(false);
          toast({ variant: 'destructive', title: 'Access Denied', description: 'You do not have permission to create events.' });
          router.replace('/');
        }
      } else {
        setIsAuthorized(false);
        toast({ variant: 'destructive', title: 'Error', description: 'User profile not found.' });
        router.replace('/');
      }
    } catch (err) {
      console.error("Error fetching user role:", err);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to verify your role.' });
      setIsAuthorized(false);
      router.replace('/');
    } finally {
      setCheckingAuth(false);
    }
  }, [router, toast]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace('/login?redirect=/events/create');
      return;
    }
    fetchUserRole(user.uid);
  }, [user, authLoading, router, fetchUserRole]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast({
          variant: 'destructive',
          title: 'File Too Large',
          description: 'Image size should not exceed 10MB.',
        });
        setSelectedFile(null);
        form.setValue('image', undefined);
        setImagePreview(null);
        if(event.target) event.target.value = ''; // Clear the file input
        return;
      }
      if (!['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(file.type)) {
        toast({
          variant: 'destructive',
          title: 'Invalid File Type',
          description: 'Please upload a valid image file (PNG, JPG, WEBP, GIF).',
        });
        setSelectedFile(null);
        form.setValue('image', undefined);
        setImagePreview(null);
        if(event.target) event.target.value = ''; // Clear the file input
        return;
      }
      setSelectedFile(file);
      form.setValue('image', file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setSelectedFile(null);
      form.setValue('image', undefined);
      setImagePreview(null);
    }
  };
  
  const onSubmit = async (values: EventFormValues) => {
    if (!user || !isAuthorized) {
      toast({ variant: 'destructive', title: 'Unauthorized', description: 'You cannot perform this action.' });
      return;
    }
    setIsSubmitting(true);

    try {
      const newEventRef = doc(collection(db, "events"));
      const eventId = newEventRef.id;
      let imageUrl: string | undefined = undefined;

      if (selectedFile) {
        const imagePath = `event-images/${eventId}/${selectedFile.name}`;
        try {
          console.log(`Attempting to upload image to: ${imagePath}`);
          imageUrl = await uploadFileAndGetURL(selectedFile, imagePath);
          console.log('Image uploaded successfully, URL:', imageUrl);
        } catch (uploadError: any) {
          console.error('Image upload failed during event creation:', uploadError);
          toast({
            variant: 'destructive',
            title: 'Image Upload Failed',
            description: `Could not upload the event image. Error: ${uploadError.message || 'Unknown error during upload.'}. Please check console for details.`,
          });
          setIsSubmitting(false);
          return; 
        }
      }

      const eventDate = new Date(values.date);
      eventDate.setHours(parseInt(values.timeHours, 10), parseInt(values.timeMinutes, 10));
      
      const eventData: Omit<Event, 'id' | 'createdAt' | 'updatedAt'> = {
        name: values.name,
        description: values.description,
        date: Timestamp.fromDate(eventDate),
        venue: values.venue,
        maxParticipants: values.maxParticipants,
        imageUrl: imageUrl || null,
        organizerId: user.uid,
        status: 'draft' as EventStatus,
      };

      await setDoc(newEventRef, {
        ...eventData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      toast({ title: 'Event Created!', description: `${values.name} has been successfully created as a draft.` });
      form.reset();
      setSelectedFile(null);
      setImagePreview(null);
      // Optionally, redirect: router.push(`/events/${eventId}`); or router.push('/events');
    } catch (error: any) {
      console.error('Error creating event (outer catch):', error);
      toast({ variant: 'destructive', title: 'Error', description: `Failed to create event. ${error.message || 'Please try again.'}` });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading || checkingAuth) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Verifying authorization...</p>
      </div>
    );
  }

  if (!isAuthorized && !checkingAuth) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <ShieldAlert className="h-16 w-16 text-destructive mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Access Denied</h2>
        <p className="text-muted-foreground">You do not have permission to create events.</p>
        <Button onClick={() => router.push('/')} className="mt-4">Go to Homepage</Button>
      </div>
    );
  }

  const hoursOptions = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
  const minutesOptions = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));


  return (
    <div className="max-w-2xl mx-auto py-8">
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-primary">Create New Event</CardTitle>
          <CardDescription>Fill in the details below to create your event.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Event Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Annual Tech Conference" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Describe your event..." rows={5} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col md:col-span-1">
                      <FormLabel>Event Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date < new Date(new Date().setHours(0,0,0,0)) }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                    control={form.control}
                    name="timeHours"
                    render={({ field }) => (
                        <FormItem className="md:col-span-1">
                        <FormLabel>Hour (24h)</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="HH" />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                            {hoursOptions.map(hour => <SelectItem key={hour} value={hour}>{hour}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                 />
                <FormField
                    control={form.control}
                    name="timeMinutes"
                    render={({ field }) => (
                        <FormItem className="md:col-span-1">
                        <FormLabel>Minute</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="MM" />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                            {minutesOptions.map(minute => <SelectItem key={minute} value={minute}>{minute}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                />
              </div>
              <FormField
                control={form.control}
                name="venue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Venue / Location</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., City Convention Center" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="maxParticipants"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max Participants</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="e.g., 100" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormItem>
                <FormLabel>Event Image (Optional)</FormLabel>
                <FormControl>
                    <label htmlFor="event-image-upload" className="mt-2 flex justify-center w-full h-32 px-6 pt-5 pb-6 border-2 border-dashed rounded-md cursor-pointer hover:border-primary transition-colors">
                        <div className="space-y-1 text-center">
                            {imagePreview ? (
                                <img src={imagePreview} alt="Preview" className="mx-auto h-24 object-contain"/>
                            ) : (
                                <ImageUp className="mx-auto h-12 w-12 text-muted-foreground" />
                            )}
                            <div className="flex text-sm text-muted-foreground">
                                <span className="relative rounded-md font-medium text-primary hover:text-primary/80 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-ring">
                                    <span>Upload a file</span>
                                    <input id="event-image-upload" name="image" type="file" className="sr-only" accept="image/png, image/jpeg, image/webp, image/gif" onChange={handleFileChange} />
                                </span>
                                <p className="pl-1">or drag and drop</p>
                            </div>
                            <p className="text-xs text-muted-foreground">PNG, JPG, WEBP, GIF up to 10MB</p>
                        </div>
                    </label>
                </FormControl>
                 <FormMessage>{form.formState.errors.image?.message?.toString()}</FormMessage>
              </FormItem>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Create Event
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateEventPage;

    