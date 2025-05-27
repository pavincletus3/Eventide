"use client";

import type { ChangeEvent } from "react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import {
  Timestamp,
  doc,
  serverTimestamp,
  setDoc,
  updateDoc,
  collection,
} from "firebase/firestore";
import { CalendarIcon, Loader2, ImageUp } from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { db, uploadFileAndGetURL } from "@/lib/firebase";
import type { Event, EventStatus } from "@/types/event";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const EventSchema = z.object({
  name: z
    .string()
    .min(3, { message: "Event name must be at least 3 characters." }),
  description: z
    .string()
    .min(10, { message: "Description must be at least 10 characters." }),
  date: z.date({ required_error: "Event date is required." }),
  timeHours: z
    .string()
    .regex(/^([01]\d|2[0-3])$/, { message: "Invalid hours (00-23)." }),
  timeMinutes: z
    .string()
    .regex(/^[0-5]\d$/, { message: "Invalid minutes (00-59)." }),
  venue: z.string().min(3, { message: "Venue must be at least 3 characters." }),
  maxParticipants: z.coerce
    .number()
    .int()
    .positive({ message: "Max participants must be a positive number." }),
  image: z.instanceof(File).optional(),
  brochure: z.instanceof(File).optional(),
});

type EventFormValues = z.infer<typeof EventSchema>;

interface EventFormProps {
  initialData?: Event;
  mode: "create" | "edit";
  onSuccess?: () => void;
}

export default function EventForm({
  initialData,
  mode,
  onSuccess,
}: EventFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedBrochure, setSelectedBrochure] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(
    initialData?.imageUrl || null
  );

  const form = useForm<EventFormValues>({
    resolver: zodResolver(EventSchema),
    defaultValues: {
      name: initialData?.name || "",
      description: initialData?.description || "",
      date: initialData?.date ? initialData.date.toDate() : undefined,
      timeHours: initialData?.date
        ? format(initialData.date.toDate(), "HH")
        : "12",
      timeMinutes: initialData?.date
        ? format(initialData.date.toDate(), "mm")
        : "00",
      venue: initialData?.venue || "",
      maxParticipants: initialData?.maxParticipants || 10,
      image: undefined,
      brochure: undefined,
    },
  });

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        // 10MB limit
        toast({
          variant: "destructive",
          title: "File Too Large",
          description: "File size should not exceed 10MB.",
        });
        setSelectedFile(null);
        form.setValue("image", undefined);
        setImagePreview(null);
        if (event.target) event.target.value = ""; // Clear the file input
        return;
      }
      if (
        !["image/png", "image/jpeg", "image/webp", "image/gif"].includes(
          file.type
        )
      ) {
        toast({
          variant: "destructive",
          title: "Invalid File Type",
          description:
            "Please upload a valid image file (PNG, JPG, WEBP, GIF).",
        });
        setSelectedFile(null);
        form.setValue("image", undefined);
        setImagePreview(null);
        if (event.target) event.target.value = ""; // Clear the file input
        return;
      }
      setSelectedFile(file);
      form.setValue("image", file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setSelectedFile(null);
      form.setValue("image", undefined);
      setImagePreview(null);
    }
  };

  const handleBrochureChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        // 10MB limit
        toast({
          variant: "destructive",
          title: "File Too Large",
          description: "Brochure size should not exceed 10MB.",
        });
        setSelectedBrochure(null);
        form.setValue("brochure", undefined);
        if (event.target) event.target.value = ""; // Clear the file input
        return;
      }
      if (!["application/pdf", "image/png", "image/jpeg"].includes(file.type)) {
        toast({
          variant: "destructive",
          title: "Invalid File Type",
          description: "Please upload a PDF or image file (PNG, JPG).",
        });
        setSelectedBrochure(null);
        form.setValue("brochure", undefined);
        if (event.target) event.target.value = ""; // Clear the file input
        return;
      }
      setSelectedBrochure(file);
      form.setValue("brochure", file);
    } else {
      setSelectedBrochure(null);
      form.setValue("brochure", undefined);
    }
  };

  const onSubmit = async (values: EventFormValues) => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Unauthorized",
        description: "You must be logged in to perform this action.",
      });
      return;
    }
    setIsSubmitting(true);

    try {
      let imageUrl: string | undefined = undefined;
      let brochureUrl: string | undefined = undefined;

      if (selectedFile) {
        const imagePath = `event-images/${initialData?.id || "new"}/${
          selectedFile.name
        }`;
        try {
          imageUrl = await uploadFileAndGetURL(selectedFile, imagePath);
        } catch (uploadError: any) {
          console.error("Image upload failed:", uploadError);
          toast({
            variant: "destructive",
            title: "Image Upload Failed",
            description: `Could not upload the event image. Error: ${
              uploadError.message || "Unknown error during upload."
            }`,
          });
          setIsSubmitting(false);
          return;
        }
      }

      if (selectedBrochure) {
        const brochurePath = `event-brochures/${initialData?.id || "new"}/${
          selectedBrochure.name
        }`;
        try {
          brochureUrl = await uploadFileAndGetURL(
            selectedBrochure,
            brochurePath
          );
        } catch (uploadError: any) {
          console.error("Brochure upload failed:", uploadError);
          toast({
            variant: "destructive",
            title: "Brochure Upload Failed",
            description: `Could not upload the event brochure. Error: ${
              uploadError.message || "Unknown error during upload."
            }`,
          });
          setIsSubmitting(false);
          return;
        }
      }

      const eventDate = new Date(values.date);
      eventDate.setHours(
        parseInt(values.timeHours, 10),
        parseInt(values.timeMinutes, 10)
      );

      const eventData: Partial<Event> = {
        name: values.name,
        description: values.description,
        date: Timestamp.fromDate(eventDate),
        venue: values.venue,
        maxParticipants: values.maxParticipants,
        imageUrl: imageUrl || initialData?.imageUrl || null,
        brochureUrl: brochureUrl || initialData?.brochureUrl || null,
        updatedAt: serverTimestamp(),
      };

      if (mode === "create") {
        const newEventRef = doc(collection(db, "events"));
        await setDoc(newEventRef, {
          ...eventData,
          organizerId: user.uid,
          status: "draft" as EventStatus,
          createdAt: serverTimestamp(),
        });
        toast({
          title: "Event Created!",
          description: `${values.name} has been successfully created as a draft.`,
        });
      } else if (mode === "edit" && initialData?.id) {
        const eventRef = doc(db, "events", initialData.id);
        await updateDoc(eventRef, eventData);
        toast({
          title: "Event Updated!",
          description: `${values.name} has been successfully updated.`,
        });
      }

      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      console.error("Error saving event:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: `Failed to ${mode} event. ${
          error.message || "Please try again."
        }`,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const hoursOptions = Array.from({ length: 24 }, (_, i) =>
    i.toString().padStart(2, "0")
  );
  const minutesOptions = Array.from({ length: 60 }, (_, i) =>
    i.toString().padStart(2, "0")
  );

  return (
    <Card className="shadow-xl">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-primary">
          {mode === "create" ? "Create New Event" : "Edit Event"}
        </CardTitle>
        <CardDescription>
          {mode === "create"
            ? "Fill in the details below to create your event."
            : "Update the event details below."}
        </CardDescription>
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
                    <Input placeholder="Enter event name" {...field} />
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
                    <Textarea
                      placeholder="Describe your event"
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Date</FormLabel>
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
                          disabled={(date) => date < new Date()}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-2">
                <FormField
                  control={form.control}
                  name="timeHours"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hour</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="HH" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {hoursOptions.map((hour) => (
                            <SelectItem key={hour} value={hour}>
                              {hour}
                            </SelectItem>
                          ))}
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
                    <FormItem>
                      <FormLabel>Minute</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="MM" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {minutesOptions.map((minute) => (
                            <SelectItem key={minute} value={minute}>
                              {minute}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <FormField
              control={form.control}
              name="venue"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Venue</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter venue location" {...field} />
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
                  <FormLabel>Maximum Participants</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="1"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="image"
              render={({ field: { value, onChange, ...field } }) => (
                <FormItem>
                  <FormLabel>Event Image</FormLabel>
                  <FormControl>
                    <div className="flex flex-col gap-4">
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          handleFileChange(e);
                          onChange(e.target.files?.[0]);
                        }}
                        {...field}
                      />
                      {imagePreview && (
                        <div className="relative aspect-video w-full overflow-hidden rounded-lg">
                          <img
                            src={imagePreview}
                            alt="Event preview"
                            className="object-cover w-full h-full"
                          />
                        </div>
                      )}
                    </div>
                  </FormControl>
                  <FormDescription>
                    Upload an image for your event (max 10MB, PNG, JPG, WEBP, or
                    GIF)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="brochure"
              render={({ field: { value, onChange, ...field } }) => (
                <FormItem>
                  <FormLabel>Event Brochure (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg"
                      onChange={(e) => {
                        handleBrochureChange(e);
                        onChange(e.target.files?.[0]);
                      }}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Upload a PDF or image file (max 10MB) for the event
                    brochure.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {mode === "create" ? "Creating..." : "Updating..."}
                </>
              ) : mode === "create" ? (
                "Create Event"
              ) : (
                "Update Event"
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
