
"use client";

import { useState, useCallback } from "react";
import { AppHeader } from "@/components/AppHeader";
import { ManualCardInputForm } from "@/components/ManualCardInputForm";
import { CardScannerButton } from "@/components/CardScannerButton";
import { CardScannerDialog } from "@/components/CardScannerDialog";
import type { PokemonCard } from "@/types";
// Removed: import type { ScanCardOutput } from "@/ai/flows/scan-card-flow";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { PlusCircle } from "lucide-react";

export default function AddCardPage() {
  const { toast } = useToast();
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  // scannedCardDataForForm will no longer be set by the scanner dialog.
  // It remains here in case of future reinstatement or alternative pre-fill methods.
  const [scannedCardDataForForm, setScannedCardDataForForm] = useState<Partial<PokemonCard> | null>(null);


  const handleAddCardLocally = (newCard: PokemonCard) => {
    try {
      const storedCardsRaw = localStorage.getItem("pokemonCards");
      const storedCards: PokemonCard[] = storedCardsRaw ? JSON.parse(storedCardsRaw) : [];
      
      const isDuplicate = storedCards.some(
        item => item.name === newCard.name && 
                item.set === newCard.set && 
                item.cardNumber === newCard.cardNumber &&
                item.variant === newCard.variant && 
                item.condition === newCard.condition &&
                item.language === newCard.language
      );

      if (isDuplicate) {
        const updatedCards = storedCards.map(card => {
          if (
            card.name === newCard.name && 
            card.set === newCard.set && 
            card.cardNumber === newCard.cardNumber &&
            card.variant === newCard.variant && 
            card.condition === newCard.condition &&
            card.language === newCard.language
          ) {
            return { ...card, quantity: card.quantity + (newCard.quantity || 1) };
          }
          return card;
        });
        localStorage.setItem("pokemonCards", JSON.stringify(updatedCards));
        toast({
          title: "Card Quantity Updated!",
          description: `Quantity for ${newCard.name} (${newCard.language}) ${newCard.variant ? '('+newCard.variant+')' : ''} (${newCard.condition}) increased.`,
          className: "bg-secondary text-secondary-foreground"
        });

      } else {
        const cardsToStore = [newCard, ...storedCards];
        localStorage.setItem("pokemonCards", JSON.stringify(cardsToStore));
        toast({
          title: "Card Added!",
          description: `${newCard.name} (${newCard.language}) ${newCard.variant ? '('+newCard.variant+')' : ''} (${newCard.condition}) has been added to your collection.`,
          className: "bg-secondary text-secondary-foreground"
        });
      }
      window.dispatchEvent(new StorageEvent('storage', { key: 'pokemonCards', newValue: localStorage.getItem("pokemonCards") }));

    } catch (e) {
      console.error("Failed to save card to localStorage", e);
      toast({
        variant: "destructive",
        title: "Storage Error",
        description: "Could not save card to your collection.",
      });
    }
    // Reset scanned data (though it's not being set from scanner anymore)
    setScannedCardDataForForm(null);
  };

  // Changed from handleScanComplete to handleImageCaptured
  const handleImageCaptured = (imageDataUri: string) => {
    setIsScannerOpen(false);
    // We no longer get structured data from the scan, so no pre-filling.
    setScannedCardDataForForm(null); 
    toast({
      title: "Image Captured!",
      description: "Image captured successfully. Please fill in the card details manually.",
      className: "bg-secondary text-secondary-foreground"
    });
    // Optional: You could display the captured image here for reference if needed
    // e.g., setCapturedImagePreview(imageDataUri);
  };


  return (
    <div className="flex flex-col min-h-screen bg-background">
      <AppHeader />
      <main className="flex-grow container mx-auto p-4 md:p-8 space-y-10">
        <section id="add-card-form" aria-labelledby="add-card-heading">
           <h2 id="add-card-heading" className="text-3xl font-headline font-semibold mb-6 text-foreground flex items-center gap-2">
            <PlusCircle className="h-7 w-7 text-primary" />
            Add a New Card to Your Collection
          </h2>
          <div className="grid md:grid-cols-2 gap-8 items-start">
            <div className="md:col-span-1 space-y-6">
              <ManualCardInputForm 
                onAddCard={handleAddCardLocally} 
                // initialScanData is now effectively always null or not used for pre-filling by scanner
                initialScanData={scannedCardDataForForm} 
                key={scannedCardDataForForm ? JSON.stringify(scannedCardDataForForm) : 'manual-form'}
              />
            </div>
            <div className="md:col-span-1 space-y-6 flex flex-col justify-start pt-[4.5rem]">
               <CardScannerButton onScanClick={() => setIsScannerOpen(true)} />
               <p className="text-sm text-muted-foreground text-center mt-2">
                Use the form to manually enter card details, or use the camera to capture an image (manual entry still required).
              </p>
            </div>
          </div>
        </section>
        <Separator className="my-12" />
         <p className="text-center text-muted-foreground">
            Once cards are added, you can view and manage them in <a href="/my-collection" className="text-primary hover:underline">My Collection</a>.
        </p>
      </main>

      {isScannerOpen && (
        <CardScannerDialog 
          isOpen={isScannerOpen} 
          onClose={() => setIsScannerOpen(false)} 
          onImageCaptured={handleImageCaptured} // Changed prop
        />
      )}

      <footer className="text-center py-4 text-sm text-muted-foreground border-t border-border mt-auto">
        Pokédex Tracker &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
}
