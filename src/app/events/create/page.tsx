"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import type { UserProfile } from "@/types/user";
import EventForm from "@/components/event/EventForm";
import { Loader2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export default function CreateEventPage() {
  const { user, initialLoading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const fetchUserRole = async () => {
      if (!user) {
        router.replace("/login?redirect=/events/create");
        return;
      }

      try {
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          const profile = userDocSnap.data() as UserProfile;
          setUserProfile(profile);
          if (["organizer", "coadmin", "admin"].includes(profile.role)) {
            setIsAuthorized(true);
          } else {
            setIsAuthorized(false);
            toast({
              variant: "destructive",
              title: "Access Denied",
              description: "You do not have permission to create events.",
            });
            router.replace("/");
          }
        } else {
          setIsAuthorized(false);
          toast({
            variant: "destructive",
            title: "Error",
            description: "User profile not found.",
          });
          router.replace("/");
        }
      } catch (err) {
        console.error("Error fetching user role:", err);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to verify your role.",
        });
        setIsAuthorized(false);
        router.replace("/");
      } finally {
        setCheckingAuth(false);
      }
    };

    if (!authLoading) {
      fetchUserRole();
    }
  }, [user, authLoading, router, toast]);

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
        <p className="text-muted-foreground">
          You do not have permission to create events.
        </p>
        <Button onClick={() => router.push("/")} className="mt-4">
          Go to Homepage
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <EventForm mode="create" onSuccess={() => router.push("/events")} />
    </div>
  );
}
