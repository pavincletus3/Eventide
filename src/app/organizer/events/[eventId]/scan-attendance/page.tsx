"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Camera,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ArrowLeft,
} from "lucide-react";

export default function ScanAttendancePage() {
  const { user, initialLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const eventId = params.eventId as string;
  const [role, setRole] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [feedback, setFeedback] = useState<null | {
    type: string;
    message: string;
    studentName?: string;
  }>(null);
  const [scanning, setScanning] = useState(false);
  const scannerRef = useRef<HTMLDivElement>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Check user role
  useEffect(() => {
    if (initialLoading) return;
    if (!user) {
      router.replace(
        `/login?redirect=/organizer/events/${eventId}/scan-attendance`
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

  // Camera and QR scanning logic
  useEffect(() => {
    if (!authChecked || !user || !(role === "organizer" || role === "coadmin"))
      return;
    let html5Qrcode: any;
    let isMounted = true;
    setCameraError(null);
    setScanning(true);
    setFeedback(null);

    import("html5-qrcode").then(({ Html5Qrcode }) => {
      if (!scannerRef.current) return;
      html5Qrcode = new Html5Qrcode(scannerRef.current.id);
      html5Qrcode
        .start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
          },
          async (decodedText: string) => {
            if (!isMounted) return;
            html5Qrcode.stop();
            setScanning(false);
            setFeedback({ type: "loading", message: "Checking attendance..." });
            // Parse qrCodeData
            const qrCodeData = decodedText;
            try {
              // Find registration by eventId and qrCodeData
              const regQuery = query(
                collection(db, "registrations"),
                where("eventId", "==", eventId),
                where("qrCodeData", "==", qrCodeData)
              );
              const regSnap = await getDocs(regQuery);
              if (regSnap.empty) {
                setFeedback({ type: "error", message: "Invalid QR Code!" });
                return;
              }
              const regDoc = regSnap.docs[0];
              const regData = regDoc.data();
              if (regData.status === "attended") {
                setFeedback({
                  type: "info",
                  message: "Already Checked In!",
                  studentName: regData.studentName,
                });
                return;
              }
              if (
                regData.status !== "approved" &&
                regData.status !== "pending"
              ) {
                setFeedback({
                  type: "error",
                  message: "Registration not valid for check-in.",
                });
                return;
              }
              // Update registration status
              await updateDoc(doc(db, "registrations", regDoc.id), {
                status: "attended",
                checkedInAt: serverTimestamp(),
              });
              setFeedback({
                type: "success",
                message: "Checked In!",
                studentName: regData.studentName,
              });
            } catch (err) {
              setFeedback({
                type: "error",
                message: "Error processing check-in.",
              });
            }
          },
          (errorMessage: string) => {
            // QR code scan error
          }
        )
        .catch((err: any) => {
          setCameraError("Camera access denied or not available.");
          setScanning(false);
        });
    });
    return () => {
      isMounted = false;
      if (html5Qrcode) {
        html5Qrcode.stop().catch(() => {});
      }
    };
  }, [authChecked, user, role, eventId]);

  if (initialLoading || !authChecked) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Loading...</p>
      </div>
    );
  }

  if (!user || !(role === "organizer" || role === "coadmin")) {
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
    <div className="container mx-auto px-4 py-8">
      <Button
        variant="outline"
        onClick={() => router.push("/organizer/dashboard")}
        className="mb-4"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Dashboard
      </Button>
      <Card className="max-w-lg mx-auto shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-bold flex items-center gap-2">
            <Camera className="w-6 h-6 text-primary" /> Scan Attendance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-4">
            <div
              id="qr-scanner"
              ref={scannerRef}
              className="w-full max-w-xs aspect-square border rounded-lg overflow-hidden bg-black"
            ></div>
            {cameraError && (
              <div className="text-destructive text-center">{cameraError}</div>
            )}
            {feedback && (
              <div className="w-full flex flex-col items-center gap-2 mt-4">
                {feedback.type === "success" && (
                  <Badge
                    variant="default"
                    className="bg-green-600 text-white text-lg px-4 py-2"
                  >
                    <CheckCircle className="inline mr-2" /> Checked In!{" "}
                    {feedback.studentName && `(${feedback.studentName})`}
                  </Badge>
                )}
                {feedback.type === "info" && (
                  <Badge
                    variant="secondary"
                    className="text-blue-700 text-lg px-4 py-2"
                  >
                    <CheckCircle className="inline mr-2" /> Already Checked In{" "}
                    {feedback.studentName && `(${feedback.studentName})`}
                  </Badge>
                )}
                {feedback.type === "error" && (
                  <Badge variant="destructive" className="text-lg px-4 py-2">
                    <XCircle className="inline mr-2" /> {feedback.message}
                  </Badge>
                )}
                {feedback.type === "loading" && (
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="animate-spin" /> {feedback.message}
                  </span>
                )}
                <Button
                  variant="outline"
                  onClick={() => window.location.reload()}
                  className="mt-2"
                >
                  Scan Next
                </Button>
              </div>
            )}
            {!feedback && scanning && (
              <span className="text-muted-foreground">
                Point the camera at a student QR code...
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
