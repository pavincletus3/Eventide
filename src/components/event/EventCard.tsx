"use client";

import Image from "next/image";
import Link from "next/link";
import { format } from "date-fns";
import type { Event } from "@/types/event";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarDays, MapPin, Pencil } from "lucide-react";
import type { Timestamp } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";

interface EventCardProps {
  event: Event;
}

// Helper type for potentially serialized Timestamp
type SerializableTimestamp =
  | Timestamp
  | { seconds: number; nanoseconds: number };

const EventCard: React.FC<EventCardProps> = ({ event }) => {
  const { id, name, description, date, venue, imageUrl, organizerId } = event;
  const { user } = useAuth();
  const isOrganizer = user?.uid === organizerId;

  let formattedDate = "Date not available";
  if (date) {
    try {
      const eventDate = date as SerializableTimestamp;
      if (typeof eventDate.toDate === "function") {
        // Firestore Timestamp object (client-side fetch)
        formattedDate = format(
          eventDate.toDate(),
          "eee, MMM d, yyyy 'at' h:mm a"
        );
      } else if (
        eventDate.seconds !== undefined &&
        typeof eventDate.seconds === "number"
      ) {
        // Plain object from server component serialization of Timestamp
        const jsDate = new Date(
          eventDate.seconds * 1000 + (eventDate.nanoseconds || 0) / 1000000
        );
        formattedDate = format(jsDate, "eee, MMM d, yyyy 'at' h:mm a");
      } else if (
        typeof eventDate === "string" ||
        typeof eventDate === "number"
      ) {
        // Fallback for ISO string or numeric timestamp
        formattedDate = format(
          new Date(eventDate as string | number),
          "eee, MMM d, yyyy 'at' h:mm a"
        );
      } else {
        // Fallback if it's already a Date object (less likely for Firestore Timestamp)
        formattedDate = format(
          eventDate as unknown as Date,
          "eee, MMM d, yyyy 'at' h:mm a"
        );
      }
    } catch (error) {
      console.error("EventCard: Error formatting date:", error, date);
      // formattedDate remains "Date not available"
    }
  }

  return (
    <Card className="flex flex-col h-full shadow-lg hover:shadow-xl transition-shadow duration-300 ease-in-out overflow-hidden group">
      <CardHeader className="p-0 relative">
        <div className="aspect-[16/9] w-full overflow-hidden bg-muted">
          <Image
            src={imageUrl || `https://placehold.co/600x400.png`}
            alt={name || "Event image"}
            width={600}
            height={400}
            className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-105"
            data-ai-hint={imageUrl ? "" : "event placeholder"}
          />
          {isOrganizer && (
            <Button
              asChild
              variant="secondary"
              size="icon"
              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Link href={`/events/${id}/edit`}>
                <Pencil className="h-4 w-4" />
              </Link>
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-4 flex flex-col flex-grow">
        <CardTitle className="text-xl font-semibold mb-2 text-primary line-clamp-2 h-[3.75rem]">
          {name || "Event Name Not Available"}
        </CardTitle>{" "}
        {/* Approx 2 lines height */}
        <div className="flex items-center text-sm text-muted-foreground mb-1">
          <CalendarDays className="mr-2 h-4 w-4 flex-shrink-0" />
          <span>{formattedDate}</span>
        </div>
        <div className="flex items-center text-sm text-muted-foreground mb-3">
          <MapPin className="mr-2 h-4 w-4 flex-shrink-0" />
          <span className="truncate">{venue || "Venue not specified"}</span>
        </div>
        <p className="text-sm text-foreground mb-4 line-clamp-3 flex-grow min-h-[4.5rem]">
          {" "}
          {/* Approx 3 lines height */}
          {description || "No description available for this event."}
        </p>
        {id ? (
          <Button asChild className="mt-auto w-full">
            {/* The actual event detail page (/events/[id]) is not yet created */}
            <Link href={`/events/${id}`}>View Details</Link>
          </Button>
        ) : (
          <Button className="mt-auto w-full" disabled>
            View Details
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default EventCard;
