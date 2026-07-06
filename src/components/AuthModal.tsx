// src/components/AuthModal.tsx
'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useUIStore } from '@/store/useUIStore';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Loader2, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';

export function AuthModal() {
  const { signUp, signIn, signInWithGoogle, loginAsDemoGuest } = useAuth();
  const { isAuthModalOpen, closeAuthModal } = useUIStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmEmail, setConfirmEmail] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const { toast } = useToast();

  const handleAuthAction = async (action: 'signUp' | 'signIn' | 'google') => {
    setError(null);

    // For Google auth, don't set loading state immediately - let popup open first
    if (action !== 'google') {
      setLoading(true);
    }

    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Authentication timeout')), 15000)
    );

    const trimmedEmail = email.trim();
    const trimmedConfirmEmail = confirmEmail.trim();

    try {
      if (action === 'signUp') {
        if (trimmedEmail !== trimmedConfirmEmail) {
          throw new Error('Emails do not match.');
        }
        if (password !== confirmPassword) {
          throw new Error('Passwords do not match.');
        }
        await Promise.race([signUp(trimmedEmail, password), timeout]);
      }
      if (action === 'signIn') await Promise.race([signIn(trimmedEmail, password), timeout]);
      if (action === 'google') {
        // Set loading only after user interaction is complete
        setLoading(true);
        await signInWithGoogle();
      }

      setRetryCount(0); // Reset retry count on success
      toast({
        title: 'Success!',
        description: "You're now logged in.",
      });
    } catch (err: any) {
      console.error(err);

      // Gracefully handle popup closed by user
      if (err.code === 'auth/popup-closed-by-user') {
        setError(null);
      } else if (err.message === 'Authentication timeout' || err.message === 'Operation timeout') {
        setRetryCount((prev) => prev + 1);
        setError(
          `Authentication is taking longer than expected. ${retryCount >= 2 ? 'Please check your internet connection.' : 'Try again?'}`
        );
      } else {
        let friendlyMessage = 'An unknown error occurred.';
        if (err.message && (err.message.includes('match') || err.message.includes('valid'))) {
          friendlyMessage = err.message;
        } else if (err.code) {
          friendlyMessage = err.code.replace('auth/', '').replace(/-/g, ' ');
        }
        setError(friendlyMessage.charAt(0).toUpperCase() + friendlyMessage.slice(1));
        setRetryCount(0); // Reset retry count on non-timeout errors
      }
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
    setRetryCount(0);
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
          <DialogTitle className="text-2xl font-bold">Welcome to PokéTRKR</DialogTitle>
          <DialogDescription>
            Sign in or create an account to save your collection.
          </DialogDescription>
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
                <Input
                  id="email-in"
                  type="email"
                  placeholder="m@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password-in">Password</Label>
                <Input
                  id="password-in"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <Button
                disabled={loading}
                className="w-full"
                onClick={() => handleAuthAction('signIn')}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Sign In
              </Button>
            </div>
          </TabsContent>
          <TabsContent value="signup">
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="email-up">Email</Label>
                <Input
                  id="email-up"
                  type="email"
                  placeholder="m@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-email-up">Confirm Email</Label>
                <Input
                  id="confirm-email-up"
                  type="email"
                  placeholder="m@example.com"
                  value={confirmEmail}
                  onChange={(e) => setConfirmEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password-up">Password (6+ characters)</Label>
                <Input
                  id="password-up"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password-up">Confirm Password</Label>
                <Input
                  id="confirm-password-up"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
              <Button
                disabled={loading}
                className="w-full"
                onClick={() => handleAuthAction('signUp')}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Account
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        {error && <p className="text-center text-sm text-destructive">{error}</p>}

        <div className="relative my-4">
          <Separator />
          <span className="absolute left-1/2 -translate-x-1/2 -top-3 bg-background px-2 text-sm text-muted-foreground">
            OR
          </span>
        </div>

        <Button
          variant="outline"
          className="w-full"
          disabled={loading}
          onClick={(e) => {
            // Prevent any default behavior but keep this synchronous to preserve user gesture
            e.preventDefault();
            e.stopPropagation();

            // Show loading state immediately
            setLoading(true);
            setError(null);

            // Call auth function immediately to preserve user gesture context
            signInWithGoogle()
              .then((result) => {
                // Only show success if we got a result (popup worked)
                // If result is null, it means we're redirecting
                if (result) {
                  toast({
                    title: 'Success!',
                    description: "You're now logged in.",
                  });
                }
                setLoading(false);
              })
              .catch((err: any) => {
                console.error('Google auth error:', err);
                setLoading(false);

                // Handle different error types
                if (err.code === 'auth/popup-blocked') {
                  setError('Popup blocked. Redirecting to Google...');
                } else if (err.code === 'auth/unauthorized-domain') {
                  setError('Domain not authorized. Please check Firebase console settings.');
                } else if (err.message?.includes('refused to connect')) {
                  setError('Connection refused. Redirecting to Google...');
                } else if (err.code !== 'auth/popup-closed-by-user') {
                  setError(err.message || 'Authentication failed');
                }
              });
          }}
        >
          <Image
            src="https://www.vectorlogo.zone/logos/google/google-icon.svg"
            alt="Google"
            width={16}
            height={16}
            className="mr-2"
          />
          Continue with Google
        </Button>

        <Button
          variant="secondary"
          className="w-full bg-primary/10 hover:bg-primary/20 text-primary border-primary/20 hover:border-primary/40 border transition-all mt-2"
          disabled={loading}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            loginAsDemoGuest();
          }}
        >
          <Sparkles className="mr-2 h-4 w-4" />
          Explore in Demo Sandbox Mode
        </Button>
      </DialogContent>
    </Dialog>
  );
}
