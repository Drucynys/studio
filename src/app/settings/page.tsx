
"use client";

import { useAuth } from "@/hooks/useAuth";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, User, Settings as SettingsIcon } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

const profileFormSchema = z.object({
  displayName: z
    .string()
    .min(3, { message: "Username must be at least 3 characters." })
    .max(30, { message: "Username cannot be longer than 30 characters." })
    .regex(/^[a-zA-Z0-9._]+$/, {
      message: "Username can only contain letters, numbers, periods (.), and underscores (_).",
    })
    .refine((name) => !name.startsWith('.') && !name.startsWith('_'), {
      message: "Username cannot start with a period or underscore.",
    })
    .refine((name) => !name.endsWith('.') && !name.endsWith('_'), {
      message: "Username cannot end with a period or underscore.",
    })
    .refine((name) => !name.includes('..') && !name.includes('__'), {
      message: "Username cannot have consecutive periods or underscores.",
    }),
});

const emailFormSchema = z.object({
  newEmail: z.string().email({ message: "Please enter a valid email address." }),
  password: z.string().min(1, { message: "Password is required to change email." }),
});

const passwordFormSchema = z.object({
  currentPassword: z.string().min(1, { message: "Current password is required." }),
  newPassword: z.string().min(6, { message: "New password must be at least 6 characters." }),
  confirmPassword: z.string(),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "New passwords do not match.",
  path: ["confirmPassword"],
});

const privacyFormSchema = z.object({
  followSetting: z.enum(["everyone", "onRequest"], {
    required_error: "You need to select a privacy setting.",
  }),
});


export default function SettingsPage() {
  const { 
    user, 
    loading, 
    updateUserDisplayName, 
    reauthenticate, 
    updateUserEmail, 
    updateUserPassword, 
    openAuthModal,
    privacySetting,
    updateUserPrivacySetting,
  } = useAuth();

  const { toast } = useToast();
  const router = useRouter();

  const profileForm = useForm<z.infer<typeof profileFormSchema>>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: { displayName: user?.displayName || "" },
  });

  const emailForm = useForm<z.infer<typeof emailFormSchema>>({
    resolver: zodResolver(emailFormSchema),
    defaultValues: { newEmail: user?.email || "", password: "" },
  });

  const passwordForm = useForm<z.infer<typeof passwordFormSchema>>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });
  
  const privacyForm = useForm<z.infer<typeof privacyFormSchema>>({
    resolver: zodResolver(privacyFormSchema),
    defaultValues: { followSetting: privacySetting || "everyone" },
  });

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
      openAuthModal();
    }
    if (user) {
      profileForm.reset({ displayName: user.displayName || "" });
      emailForm.reset({ newEmail: user.email || "", password: "" });
    }
  }, [user, loading, router, openAuthModal, profileForm, emailForm]);

  useEffect(() => {
    if (privacySetting) {
      privacyForm.reset({ followSetting: privacySetting });
    }
  }, [privacySetting, privacyForm]);
  
  const onProfileSubmit = async (values: z.infer<typeof profileFormSchema>) => {
    try {
      await updateUserDisplayName(values.displayName);
      toast({ title: "Success", description: "Your username has been updated." });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    }
  };
  
  const onEmailSubmit = async (values: z.infer<typeof emailFormSchema>) => {
    try {
      await reauthenticate(values.password);
      await updateUserEmail(values.newEmail);
      toast({ title: "Success", description: "Your email has been updated. Please check your inbox for verification." });
      emailForm.reset({ newEmail: values.newEmail, password: "" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    }
  };
  
  const onPasswordSubmit = async (values: z.infer<typeof passwordFormSchema>) => {
    try {
      await reauthenticate(values.currentPassword);
      await updateUserPassword(values.newPassword);
      toast({ title: "Success", description: "Your password has been updated." });
      passwordForm.reset();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    }
  };

  const onPrivacySubmit = async (values: z.infer<typeof privacyFormSchema>) => {
    try {
      await updateUserPrivacySetting(values.followSetting);
      toast({ title: "Success", description: "Your privacy settings have been updated." });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    }
  };
  
  if (loading || !user) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <AppHeader />
        <main className="flex-grow container mx-auto p-4 md:p-8 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <AppHeader />
      <main className="flex-grow container mx-auto p-4 md:p-8">
        <div className="max-w-2xl mx-auto space-y-8">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold font-headline flex items-center gap-2"><SettingsIcon className="h-7 w-7 text-primary"/> Account Settings</h1>
            <p className="text-muted-foreground">Manage your profile, email, and password settings.</p>
          </div>

          {/* Profile Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
              <CardDescription>Update your public username.</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...profileForm}>
                <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
                  <FormField
                    control={profileForm.control}
                    name="displayName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl>
                          <Input placeholder="Your username" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" disabled={profileForm.formState.isSubmitting}>
                    {profileForm.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Username
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          {/* Privacy Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Privacy</CardTitle>
              <CardDescription>Manage who can follow you and see your collection.</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...privacyForm}>
                <form onSubmit={privacyForm.handleSubmit(onPrivacySubmit)} className="space-y-4">
                  <FormField
                    control={privacyForm.control}
                    name="followSetting"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel>Follow Settings</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            value={field.value}
                            className="flex flex-col space-y-1"
                          >
                            <FormItem className="flex items-center space-x-3 space-y-0">
                              <FormControl>
                                <RadioGroupItem value="everyone" />
                              </FormControl>
                              <FormLabel className="font-normal">
                                Allow anyone to follow you
                              </FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-3 space-y-0">
                              <FormControl>
                                <RadioGroupItem value="onRequest" />
                              </FormControl>
                              <FormLabel className="font-normal">
                                Require approval for new followers
                              </FormLabel>
                            </FormItem>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" disabled={privacyForm.formState.isSubmitting}>
                    {privacyForm.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Privacy Settings
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>


          {/* Email Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Email Address</CardTitle>
              <CardDescription>Change the email address associated with your account. This requires your current password.</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...emailForm}>
                <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} className="space-y-4">
                  <FormField
                    control={emailForm.control}
                    name="newEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>New Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="new.email@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={emailForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Current Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="••••••••" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" disabled={emailForm.formState.isSubmitting}>
                    {emailForm.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Change Email
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          {/* Password Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Password</CardTitle>
              <CardDescription>Change your account password. You will be logged out after a successful change.</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...passwordForm}>
                <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                  <FormField
                    control={passwordForm.control}
                    name="currentPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Current Password</FormLabel>
                        <FormControl>
                          <Input type="password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={passwordForm.control}
                    name="newPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>New Password</FormLabel>
                        <FormControl>
                          <Input type="password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={passwordForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm New Password</FormLabel>
                        <FormControl>
                          <Input type="password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" disabled={passwordForm.formState.isSubmitting}>
                    {passwordForm.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Change Password
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
