"use client";

import { useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { ImprovedCardScanner } from "@/components/ImprovedCardScanner";
import { ManualCardInputForm } from "@/components/ManualCardInputForm";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Camera, FileEdit, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { collectionService } from "@/services/collectionService";
import { useUIStore } from "@/store/useUIStore";
import { useToast } from "@/hooks/use-toast";
import type { PokemonCard } from "@/types";
import type { FindCardOutput } from "@/ai/flows/find-card-by-image-flow";

export default function AddCardPage() {
  const { user } = useAuth();
  const { openAuthModal } = useUIStore();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("scan");
  const [preFillData, setPreFillData] = useState<Partial<FindCardOutput> | null>(null);

  const handleScanResult = (result: FindCardOutput) => {
    setPreFillData(result);
    // Switch to manual tab to let user verify and add
    setActiveTab("manual");
    toast({
      title: "Card Identified!",
      description: "We've pre-filled the form with the details we found. Please verify them.",
    });
  };

  const handleAddCard = async (card: PokemonCard) => {
    if (!user) {
      openAuthModal();
      return;
    }

    try {
      await collectionService.addCard(user.uid, card);
      toast({
        title: "Success!",
        description: `${card.name} added to your collection.`,
        variant: "default",
      });
      // Clear pre-fill data after successful add
      setPreFillData(null);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to add card.",
        variant: "destructive",
      });
    }
  };

  if (!user) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <AppHeader />
        <main className="flex-grow container mx-auto p-4 md:p-8 flex items-center justify-center">
          <Card className="max-w-md text-center">
            <CardHeader>
              <CardTitle>Login Required</CardTitle>
              <CardDescription>You need to be logged in to add cards to your collection.</CardDescription>
            </CardHeader>
            <CardContent>
              <button 
                onClick={openAuthModal}
                className="w-full bg-primary text-primary-foreground py-2 rounded-md hover:bg-primary/90 transition-colors"
              >
                Login / Sign Up
              </button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <AppHeader />
      <main className="flex-grow container mx-auto p-4 md:p-8 max-w-4xl">
        <div className="space-y-6">
          <div className="hidden md:block">
            <h1 className="text-3xl font-headline font-bold text-primary">Add to Collection</h1>
            <p className="text-muted-foreground">Scan a card with AI or enter details manually.</p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="scan" className="flex items-center gap-2">
                <Camera className="h-4 w-4" /> AI Scanner
              </TabsTrigger>
              <TabsTrigger value="manual" className="flex items-center gap-2">
                <FileEdit className="h-4 w-4" /> Manual Entry
              </TabsTrigger>
            </TabsList>

            <TabsContent value="scan" className="mt-6">
              <ImprovedCardScanner onScanResult={handleScanResult} />
            </TabsContent>

            <TabsContent value="manual" className="mt-6">
              <ManualCardInputForm onAddCard={handleAddCard} initialScanData={preFillData} />
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <footer className="text-center py-4 text-sm text-muted-foreground border-t border-border mt-auto">
        PokéTRKR &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
}
