
"use client";

import Link from 'next/link';
import { CalendarDays, LogIn, LogOut, UserPlus, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

const Header = () => {
  const { user, logOut, loading: authOperationLoading, initialLoading: authStateLoading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await logOut();
      toast({ title: "Logged Out", description: "You have been successfully logged out." });
      router.push('/login');
    } catch (error: any) {
      toast({ variant: "destructive", title: "Logout Failed", description: error.message });
    }
  };

  return (
    <header className="bg-card border-b border-border shadow-sm">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-2xl font-bold text-primary hover:opacity-80 transition-opacity">
          <CalendarDays className="h-7 w-7" />
          <span>Eventide</span>
        </Link>
        <nav className="flex items-center gap-2 sm:gap-4">
          {authStateLoading ? (
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          ) : user ? (
            <>
              <span className="text-sm text-foreground hidden sm:inline">Welcome, {user.email?.split('@')[0]}</span>
              <Button variant="ghost" size="sm" onClick={handleLogout} disabled={authOperationLoading}>
                {authOperationLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogOut className="mr-1 h-4 w-4" />}
                Logout
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
