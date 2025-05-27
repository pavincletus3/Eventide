"use client";

import Link from "next/link";
import {
  CalendarDays,
  LogIn,
  LogOut,
  UserPlus,
  PlusCircle,
  Loader2,
  UserCog,
  Users,
  Ticket,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { UserProfile, UserRole } from "@/types/user";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

const Header = () => {
  const {
    user,
    logOut,
    loading: authOperationLoading,
    initialLoading: authStateLoading,
  } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [isRoleLoading, setIsRoleLoading] = useState(false);

  useEffect(() => {
    if (user && !authStateLoading) {
      setIsRoleLoading(true);
      const fetchRole = async () => {
        try {
          const userDocRef = doc(db, "users", user.uid);
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            const profile = userDocSnap.data() as UserProfile;
            setUserRole(profile.role);
          } else {
            setUserRole(null);
          }
        } catch (error) {
          console.error("Error fetching user role for header:", error);
          setUserRole(null);
        } finally {
          setIsRoleLoading(false);
        }
      };
      fetchRole();
    } else if (!user && !authStateLoading) {
      setUserRole(null);
      setIsRoleLoading(false);
    }
  }, [user, authStateLoading]);

  const handleLogout = async () => {
    try {
      await logOut();
      setUserRole(null); // Clear role on logout
      toast({
        title: "Logged Out",
        description: "You have been successfully logged out.",
      });
      router.push("/login");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Logout Failed",
        description: error.message,
      });
    }
  };

  const canCreateEvent =
    userRole === "organizer" || userRole === "coadmin" || userRole === "admin";
  const isAdmin = userRole === "admin";
  const isStudent = userRole === "student";

  return (
    <header className="bg-card border-b border-border shadow-sm">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-2 text-2xl font-bold text-primary hover:opacity-80 transition-opacity"
        >
          <CalendarDays className="h-7 w-7" />
          <span>Eventide</span>
        </Link>

        <nav className="flex items-center gap-2">
          {(authStateLoading || (user && isRoleLoading)) &&
          !authOperationLoading ? (
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          ) : user ? (
            <>
              <span className="text-sm text-foreground hidden sm:inline mr-2">
                Welcome, {user.email?.split("@")[0]}
                {userRole && (
                  <span className="text-xs text-muted-foreground ml-1">
                    ({userRole})
                  </span>
                )}
              </span>
              {isStudent && (
                <>
                  <Button variant="ghost" size="sm" asChild>
                    <Link
                      href="/student/registrations"
                      title="My Registrations"
                    >
                      <Ticket className="mr-1 h-4 w-4 sm:mr-1" />
                      <span className="hidden sm:inline">My Registrations</span>
                    </Link>
                  </Button>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href="/student/account" title="My Account">
                      <UserCog className="mr-1 h-4 w-4 sm:mr-1" />
                      <span className="hidden sm:inline">My Account</span>
                    </Link>
                  </Button>
                </>
              )}
              {canCreateEvent && (
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/events/create" title="Create Event">
                    <PlusCircle className="mr-1 h-4 w-4 sm:mr-1" />{" "}
                    <span className="hidden sm:inline">Create Event</span>
                  </Link>
                </Button>
              )}
              {isAdmin && (
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/admin/users" title="Manage Users">
                    <Users className="mr-1 h-4 w-4 sm:mr-1" />{" "}
                    <span className="hidden sm:inline">Users</span>
                  </Link>
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                disabled={authOperationLoading}
              >
                {authOperationLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <LogOut className="mr-1 h-4 w-4" />
                )}
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/login">
                  <LogIn className="mr-1 h-4 w-4" /> Login
                </Link>
              </Button>
              <Button variant="default" size="sm" asChild>
                <Link href="/register">
                  <UserPlus className="mr-1 h-4 w-4" /> Register
                </Link>
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Header;
