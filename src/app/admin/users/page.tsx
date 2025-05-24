
"use client";

import type { ChangeEvent } from 'react';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, getDoc, updateDoc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import type { UserProfile, UserRole } from '@/types/user';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ShieldAlert, Users } from 'lucide-react';

interface UserProfileWithId extends UserProfile {
  id: string; // Firestore document ID, same as UID
}

const AdminUsersPage = () => {
  const { user, initialLoading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [isAdmin, setIsAdmin] = useState(false);
  const [users, setUsers] = useState<UserProfileWithId[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingAdmin, setCheckingAdmin] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingRoleId, setUpdatingRoleId] = useState<string | null>(null);

  const availableRoles: UserRole[] = ['student', 'organizer', 'coadmin', 'admin'];

  const fetchUserRole = useCallback(async (uid: string) => {
    try {
      const userDocRef = doc(db, 'users', uid);
      const userDocSnap = await getDoc(userDocRef);
      if (userDocSnap.exists()) {
        const userProfile = userDocSnap.data() as UserProfile;
        if (userProfile.role === 'admin') {
          setIsAdmin(true);
          return true;
        }
      }
      setIsAdmin(false);
      return false;
    } catch (err) {
      console.error("Error fetching user role:", err);
      setError("Failed to verify admin status.");
      setIsAdmin(false);
      return false;
    } finally {
      setCheckingAdmin(false);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const usersCollectionRef = collection(db, 'users');
      const q = query(usersCollectionRef, orderBy('email', 'asc'));
      const querySnapshot = await getDocs(q);
      const usersList = querySnapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...(docSnap.data() as UserProfile),
      }));
      setUsers(usersList);
    } catch (err) {
      console.error("Error fetching users:", err);
      setError("Failed to load users. You might not have the necessary permissions.");
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not fetch user list.",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.replace('/login');
      return;
    }

    fetchUserRole(user.uid).then(isAdminUser => {
      if (isAdminUser) {
        fetchUsers();
      } else {
        router.replace('/'); // Redirect if not admin
      }
    });

  }, [user, authLoading, router, fetchUserRole, fetchUsers]);

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    if (user && userId === user.uid && newRole !== 'admin') {
        toast({
            variant: "destructive",
            title: "Action Denied",
            description: "Admins cannot remove their own admin role.",
        });
        return;
    }
    setUpdatingRoleId(userId);
    try {
      const userDocRef = doc(db, 'users', userId);
      await updateDoc(userDocRef, {
        role: newRole,
        updatedAt: serverTimestamp(),
      });
      toast({
        title: "Success",
        description: `User role updated to ${newRole}.`,
      });
      // Refresh users list
      setUsers(prevUsers => prevUsers.map(u => u.id === userId ? { ...u, role: newRole } : u));
    } catch (err) {
      console.error("Error updating role:", err);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update user role.",
      });
    } finally {
      setUpdatingRoleId(null);
    }
  };

  if (authLoading || checkingAdmin) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Verifying access and loading users...</p>
      </div>
    );
  }

  if (!isAdmin && !checkingAdmin) {
     // This case should ideally be handled by the redirect, but as a fallback:
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <ShieldAlert className="h-16 w-16 text-destructive mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Access Denied</h2>
        <p className="text-muted-foreground">You do not have permission to view this page.</p>
        <Button onClick={() => router.push('/')} className="mt-4">Go to Homepage</Button>
      </div>
    );
  }
  
  if (error && !loading) {
    return <div className="text-center text-destructive py-10">{error}</div>;
  }

  return (
    <Card className="w-full shadow-xl">
      <CardHeader>
        <div className="flex items-center gap-2">
            <Users className="h-6 w-6 text-primary"/>
            <CardTitle className="text-2xl font-bold text-primary">User Role Management</CardTitle>
        </div>
        <CardDescription>View and manage user roles across the platform.</CardDescription>
      </CardHeader>
      <CardContent>
        {loading && !users.length ? (
          <div className="flex justify-center items-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-2">Loading user data...</p>
          </div>
        ) : users.length === 0 && !loading ? (
            <p className="text-center text-muted-foreground py-10">No users found.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Current Role</TableHead>
                <TableHead className="text-right">Change Role</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.email}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                        u.role === 'admin' ? 'bg-primary/20 text-primary-foreground border border-primary' :
                        u.role === 'organizer' ? 'bg-accent/20 text-accent-foreground border border-accent' :
                        u.role === 'coadmin' ? 'bg-yellow-500/20 text-yellow-700 border border-yellow-500' :
                        'bg-muted text-muted-foreground border'
                    }`}>
                        {u.role}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    {updatingRoleId === u.id ? (
                      <Loader2 className="h-5 w-5 animate-spin ml-auto" />
                    ) : (
                      <Select
                        value={u.role}
                        onValueChange={(newRole) => handleRoleChange(u.id, newRole as UserRole)}
                        disabled={updatingRoleId === u.id || (user?.uid === u.id && u.role === 'admin')}
                      >
                        <SelectTrigger className="w-[180px] ml-auto">
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableRoles.map(roleOption => (
                            <SelectItem key={roleOption} value={roleOption}>
                              {roleOption.charAt(0).toUpperCase() + roleOption.slice(1)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminUsersPage;
