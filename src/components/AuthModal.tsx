// src/components/AuthModal.tsx
"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Image from 'next/image';

export function AuthModal() {
  const { isAuthModalOpen, closeAuthModal, signUp, signIn, signInWithGoogle } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleAuthAction = async (action: 'signUp' | 'signIn' | 'google') => {
    setLoading(true);
    setError(null);
    try {
      if (action === 'signUp') {
        if (email !== confirmEmail) {
          throw new Error("Emails do not match.");
        }
        if (password !== confirmPassword) {
          throw new Error("Passwords do not match.");
        }
        await signUp(email, password);
      }
      if (action === 'signIn') await signIn(email, password);
      if (action === 'google') await signInWithGoogle();
      
      toast({
        title: "Success!",
        description: "You're now logged in.",
      });

    } catch (err: any) {
      console.error(err);
      let friendlyMessage = 'An unknown error occurred.';
      if (err.message && (err.message.includes("match") || err.message.includes("valid"))) {
          friendlyMessage = err.message;
      } else if (err.code) {
          friendlyMessage = err.code.replace('auth/', '').replace(/-/g, ' ');
      }
      setError(friendlyMessage.charAt(0).toUpperCase() + friendlyMessage.slice(1));
    } finally {
      setLoading(false);
    }
  };

  const clearFormState = () => {
    setError(null);
    setEmail('');
    setPassword('');
    setConfirmEmail('');
    setConfirmPassword('');
  };
  
  const onOpenChange = (open: boolean) => {
    if (!open) {
      closeAuthModal();
      clearFormState();
    }
  };

  return (
    <Dialog open={isAuthModalOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <DialogTitle className="text-2xl font-bold">Welcome to Pokédex Tracker</DialogTitle>
          <DialogDescription>Sign in or create an account to save your collection.</DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="signin" className="w-full" onValueChange={clearFormState}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signin">Sign In</TabsTrigger>
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
          </TabsList>
          <TabsContent value="signin">
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="email-in">Email</Label>
                <Input id="email-in" type="email" placeholder="m@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password-in">Password</Label>
                <Input id="password-in" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <Button disabled={loading} className="w-full" onClick={() => handleAuthAction('signIn')}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Sign In
              </Button>
            </div>
          </TabsContent>
          <TabsContent value="signup">
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="email-up">Email</Label>
                <Input id="email-up" type="email" placeholder="m@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-email-up">Confirm Email</Label>
                <Input id="confirm-email-up" type="email" placeholder="m@example.com" value={confirmEmail} onChange={(e) => setConfirmEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password-up">Password (6+ characters)</Label>
                <Input id="password-up" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password-up">Confirm Password</Label>
                <Input id="confirm-password-up" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
              </div>
              <Button disabled={loading} className="w-full" onClick={() => handleAuthAction('signUp')}>
                 {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Account
              </Button>
            </div>
          </TabsContent>
        </Tabs>
        
        {error && <p className="text-center text-sm text-destructive">{error}</p>}
        
        <div className="relative my-4">
          <Separator />
          <span className="absolute left-1/2 -translate-x-1/2 -top-3 bg-background px-2 text-sm text-muted-foreground">OR</span>
        </div>

        <Button variant="outline" className="w-full" disabled={loading} onClick={() => handleAuthAction('google')}>
           {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Image src="https://www.vectorlogo.zone/logos/google/google-icon.svg" alt="Google" width={16} height={16} className="mr-2"/>}
          Continue with Google
        </Button>
      </DialogContent>
    </Dialog>
  );
}
