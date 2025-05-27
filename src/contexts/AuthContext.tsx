"use client";

import type { User } from "firebase/auth";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { auth, db } from "@/lib/firebase"; // Import db from firebase
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import { doc, setDoc, serverTimestamp, getDoc } from "firebase/firestore"; // Firestore imports
import type { UserProfile } from "@/types/user";

interface AuthContextType {
  user: User | null;
  loading: boolean; // For async operations like login/signup/logout
  initialLoading: boolean; // For the very first auth state check
  signIn: (email: string, pass: string) => Promise<void>;
  signUp: (email: string, pass: string) => Promise<{ isNewUser: boolean }>;
  signInWithGoogle: () => Promise<{ isNewUser: boolean }>;
  logOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setInitialLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const signIn = async (email: string, pass: string) => {
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (error) {
      setLoading(false);
      throw error;
    }
    setLoading(false);
  };

  const signUp = async (email: string, pass: string) => {
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        pass
      );
      const firebaseUser = userCredential.user;

      if (firebaseUser) {
        // Create user profile in Firestore
        const userProfile: Omit<
          UserProfile,
          "createdAt" | "updatedAt" | "uid"
        > & { uid?: string } = {
          email: firebaseUser.email,
          role: "student",
        };

        await setDoc(doc(db, "users", firebaseUser.uid), {
          ...userProfile,
          uid: firebaseUser.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      return { isNewUser: true };
    } catch (error) {
      setLoading(false);
      throw error;
    }
    setLoading(false);
  };

  const signInWithGoogle = async () => {
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const firebaseUser = result.user;
      let isNewUser = false;

      if (firebaseUser) {
        // Check if user profile exists
        const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));

        if (!userDoc.exists()) {
          isNewUser = true;
          // Create new user profile if it doesn't exist
          const userProfile: Omit<
            UserProfile,
            "createdAt" | "updatedAt" | "uid"
          > & { uid?: string } = {
            email: firebaseUser.email,
            role: "student",
            name: firebaseUser.displayName || undefined,
            photoURL: firebaseUser.photoURL || undefined,
          };

          await setDoc(doc(db, "users", firebaseUser.uid), {
            ...userProfile,
            uid: firebaseUser.uid,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
      }
      return { isNewUser };
    } catch (error) {
      setLoading(false);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logOut = async () => {
    setLoading(true);
    try {
      await signOut(auth);
      setUser(null); // Explicitly set user to null after logout
    } catch (error) {
      setLoading(false);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        initialLoading,
        signIn,
        signUp,
        signInWithGoogle,
        logOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
