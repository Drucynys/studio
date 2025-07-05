"use client";

// This page is temporarily disabled to streamline the build process.
// The code is preserved in the project history and can be restored later.
// To re-enable, restore the content of this file and re-add the links
// in the AppHeader and the homepage.

import { AppHeader } from "@/components/AppHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wrench } from "lucide-react";

export default function AddCardPageDisabled() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <AppHeader />
      <main className="flex-grow container mx-auto p-4 md:p-8 flex items-center justify-center">
        <Card className="max-w-lg text-center p-8">
            <CardHeader>
                <CardTitle className="flex flex-col items-center gap-4">
                    <Wrench className="h-12 w-12 text-muted-foreground"/>
                    Feature Temporarily Disabled
                </CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground">
                    The AI card scanning and manual add-card functionality is currently undergoing maintenance. It will be restored in a future update.
                </p>
            </CardContent>
        </Card>
      </main>
    </div>
  );
}