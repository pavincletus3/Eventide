"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  setDoc,
  doc,
  serverTimestamp,
  getDoc,
  updateDoc,
} from "firebase/firestore";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, FileText, Upload, Eye, AlertTriangle } from "lucide-react";

export default function CertificateTemplatePage() {
  const { user, initialLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const eventId = params.eventId as string;
  const [role, setRole] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [templateHtml, setTemplateHtml] = useState("");
  const [placeholderName, setPlaceholderName] = useState("{{studentName}}");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [previewName, setPreviewName] = useState("John Doe");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check user role
  useEffect(() => {
    if (initialLoading) return;
    if (!user) {
      router.replace(
        `/login?redirect=/organizer/events/${eventId}/certificate-template`
      );
      return;
    }
    // Fetch user role from Firestore
    const fetchRole = async () => {
      try {
        const userDoc = await getDocs(
          query(collection(db, "users"), where("uid", "==", user.uid))
        );
        if (!userDoc.empty) {
          const userData = userDoc.docs[0].data();
          setRole(userData.role);
        }
      } catch (err) {
        setRole(null);
      } finally {
        setAuthChecked(true);
      }
    };
    fetchRole();
  }, [user, initialLoading, eventId, router]);

  // Load existing template if present
  useEffect(() => {
    if (!authChecked || !user) return;
    const fetchTemplate = async () => {
      setLoading(true);
      try {
        const docRef = doc(db, "certificateTemplates", eventId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setTemplateHtml(data.templateHtml || "");
          setPlaceholderName(data.placeholderName || "{{studentName}}");
        }
      } catch (err) {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    fetchTemplate();
  }, [authChecked, user, eventId]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setTemplateHtml(text);
  };

  const handleSave = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      if (!templateHtml.trim() || !placeholderName.trim()) {
        setError("Template HTML and placeholder are required.");
        setLoading(false);
        return;
      }
      const docRef = doc(db, "certificateTemplates", eventId);
      const now = serverTimestamp();
      await setDoc(
        docRef,
        {
          eventId,
          templateHtml,
          placeholderName,
          uploadedBy: user?.uid,
          createdAt: now,
          updatedAt: now,
        },
        { merge: true }
      );
      setSuccess("Template saved successfully!");
    } catch (err: any) {
      setError("Failed to save template: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading || !authChecked) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Loading...</p>
      </div>
    );
  }

  if (
    !user ||
    !(role === "organizer" || role === "coadmin" || role === "admin")
  ) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <AlertTriangle className="h-16 w-16 text-destructive mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Access Denied</h2>
        <p className="text-muted-foreground">
          You do not have permission to access this page.
        </p>
        <Button
          onClick={() => router.push("/organizer/dashboard")}
          className="mt-4"
        >
          Back to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-primary flex items-center gap-2">
            <FileText className="w-6 h-6 text-primary" /> Certificate Template
          </CardTitle>
          <CardDescription>
            Upload or paste your certificate HTML template and specify the
            placeholder for the student's name.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div>
              <label className="block font-medium mb-1">Upload HTML File</label>
              <Input
                type="file"
                accept=".html,.htm,text/html"
                ref={fileInputRef}
                onChange={handleFileUpload}
                disabled={loading}
              />
            </div>
            <div>
              <label className="block font-medium mb-1">
                Or Paste HTML Template
              </label>
              <Textarea
                rows={10}
                value={templateHtml}
                onChange={(e) => setTemplateHtml(e.target.value)}
                placeholder="Paste your certificate HTML here..."
                disabled={loading}
              />
            </div>
            <div>
              <label className="block font-medium mb-1">
                Student Name Placeholder
              </label>
              <Input
                type="text"
                value={placeholderName}
                onChange={(e) => setPlaceholderName(e.target.value)}
                placeholder="e.g., {{studentName}}"
                disabled={loading}
              />
            </div>
            <div className="flex gap-2 items-center">
              <Button onClick={handleSave} disabled={loading}>
                <Upload className="mr-2 h-4 w-4" /> Save Template
              </Button>
              {loading && <Loader2 className="animate-spin ml-2" />}
              {success && (
                <span className="text-green-600 ml-2">{success}</span>
              )}
              {error && <span className="text-destructive ml-2">{error}</span>}
            </div>
            <div>
              <label className="block font-medium mb-1">
                Preview (with sample name)
              </label>
              <Input
                type="text"
                value={previewName}
                onChange={(e) => setPreviewName(e.target.value)}
                className="mb-2"
                disabled={loading}
              />
              <div className="border rounded p-4 bg-muted min-h-[200px] overflow-auto">
                <div
                  dangerouslySetInnerHTML={{
                    __html: templateHtml.replaceAll(
                      placeholderName,
                      previewName
                    ),
                  }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
