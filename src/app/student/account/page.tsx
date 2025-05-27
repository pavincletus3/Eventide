"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, User, AlertTriangle } from "lucide-react";

export default function StudentAccountPage() {
  const { user, initialLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [profile, setProfile] = useState({
    name: "",
    phone: "",
    department: "",
    registerNo: "",
    batchYear: "",
  });

  useEffect(() => {
    if (initialLoading) return;
    if (!user) {
      router.replace("/login?redirect=/student/account");
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(null);
    const fetchProfile = async () => {
      try {
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setProfile({
            name: data.name || "",
            phone: data.phone || "",
            department: data.department || "",
            registerNo: data.registerNo || "",
            batchYear: data.batchYear || "",
          });
        }
      } catch (err) {
        setError("Failed to load profile.");
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [user, initialLoading, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProfile((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      if (
        !profile.name ||
        !profile.phone ||
        !profile.department ||
        !profile.registerNo ||
        !profile.batchYear
      ) {
        setError("All fields are required.");
        setSaving(false);
        return;
      }
      const docRef = doc(db, "users", user!.uid);
      await setDoc(
        docRef,
        {
          name: profile.name,
          phone: profile.phone,
          department: profile.department,
          registerNo: profile.registerNo,
          batchYear: profile.batchYear,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      setSuccess("Profile updated successfully!");
    } catch (err: any) {
      setError("Failed to update profile: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (initialLoading || loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-lg">
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-primary flex items-center gap-2">
            <User className="w-6 h-6 text-primary" /> My Account
          </CardTitle>
          <CardDescription>
            Update your profile details. These will be used for certificates and
            event registrations.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div>
              <label className="block font-medium mb-1">Full Name</label>
              <Input
                name="name"
                value={profile.name}
                onChange={handleChange}
                placeholder="Enter your full name"
                disabled={saving}
                required
              />
            </div>
            <div>
              <label className="block font-medium mb-1">Phone Number</label>
              <Input
                name="phone"
                value={profile.phone}
                onChange={handleChange}
                placeholder="Enter your phone number"
                disabled={saving}
                required
              />
            </div>
            <div>
              <label className="block font-medium mb-1">Department</label>
              <Input
                name="department"
                value={profile.department}
                onChange={handleChange}
                placeholder="Enter your department"
                disabled={saving}
                required
              />
            </div>
            <div>
              <label className="block font-medium mb-1">Register Number</label>
              <Input
                name="registerNo"
                value={profile.registerNo}
                onChange={handleChange}
                placeholder="Enter your register number"
                disabled={saving}
                required
              />
            </div>
            <div>
              <label className="block font-medium mb-1">Batch Year</label>
              <Input
                name="batchYear"
                value={profile.batchYear}
                onChange={handleChange}
                placeholder="Enter your batch year (e.g., 2023)"
                disabled={saving}
                required
                type="number"
                min="2000"
                max="2100"
              />
            </div>
            <div className="flex gap-2 items-center">
              <Button onClick={handleSave} disabled={saving}>
                Save Changes
              </Button>
              {saving && <Loader2 className="animate-spin ml-2" />}
              {success && (
                <span className="text-green-600 ml-2">{success}</span>
              )}
              {error && <span className="text-destructive ml-2">{error}</span>}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
