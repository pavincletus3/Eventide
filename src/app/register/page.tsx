
"use client";

import { useEffect, useState } from 'react';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
import Link from 'next/link';

import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from 'lucide-react';

const RegisterSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(8, { message: "Password must be at least 8 characters long." })
    .regex(/[a-z]/, { message: "Password must contain at least one lowercase letter."})
    .regex(/[A-Z]/, { message: "Password must contain at least one uppercase letter."})
    .regex(/[0-9]/, { message: "Password must contain at least one number."})
    .regex(/[^a-zA-Z0-9]/, { message: "Password must contain at least one special character."}),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match.",
  path: ["confirmPassword"],
});

type RegisterFormValues = z.infer<typeof RegisterSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const { user, signUp, loading: authOperationLoading, initialLoading: authStateLoading } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(RegisterSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    if (!authStateLoading && user) {
      router.push('/');
    }
  }, [user, authStateLoading, router]);

  const onSubmit = async (data: RegisterFormValues) => {
    setIsSubmitting(true);
    try {
      await signUp(data.email, data.password);
      toast({ title: "Registration Successful", description: "Welcome! Please login." });
      router.push("/login"); // Redirect to login after successful registration
    } catch (error: any) {
      const errorCode = error.code;
      let errorMessage = "Failed to register. Please try again.";
      if (errorCode === 'auth/email-already-in-use') {
        errorMessage = "This email is already registered.";
      }
      toast({ variant: "destructive", title: "Registration Failed", description: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (authStateLoading || (!authStateLoading && user) ) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex justify-center items-center py-12">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-primary">Create an Account</CardTitle>
          <CardDescription>Fill in the details below to register.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="you@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={isSubmitting || authOperationLoading}>
                {isSubmitting || authOperationLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Register
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="text-sm">
          <p>Already have an account? <Link href="/login" className="text-primary hover:underline">Login here</Link></p>
        </CardFooter>
      </Card>
    </div>
  );
}
