
"use client";

import { useState, useCallback } from "react";
import { AppHeader } from "@/components/AppHeader";
import { ManualCardInputForm } from "@/components/ManualCardInputForm";
import { CardScannerButton } from "@/components/CardScannerButton";
import { CardScannerDialog } from "@/components/CardScannerDialog"; // Import the dialog
import type { PokemonCard } from "@/types";
import type { ScanCardOutput } from "@/ai/flows/scan-card-flow"; // Import scan output type
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { PlusCircle } from "lucide-react";

export default function AddCardPage() {
  const { toast } = useToast();
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannedCardDataForForm, setScannedCardDataForForm] = useState<ScanCardOutput | null>(null);


  const handleAddCardLocally = (newCard: PokemonCard) => {
    try {
      const storedCardsRaw = localStorage.getItem("pokemonCards");
      const storedCards: PokemonCard[] = storedCardsRaw ? JSON.parse(storedCardsRaw) : [];
      
      const isDuplicate = storedCards.some(
        item => item.name === newCard.name && 
                item.set === newCard.set && 
                item.cardNumber === newCard.cardNumber &&
                item.variant === newCard.variant && 
                item.condition === newCard.condition
      );

      if (isDuplicate) {
        const updatedCards = storedCards.map(card => {
          if (
            card.name === newCard.name && 
            card.set === newCard.set && 
            card.cardNumber === newCard.cardNumber &&
            card.variant === newCard.variant && 
            card.condition === newCard.condition
          ) {
            return { ...card, quantity: card.quantity + (newCard.quantity || 1) };
          }
          return card;
        });
        localStorage.setItem("pokemonCards", JSON.stringify(updatedCards));
        toast({
          title: "Card Quantity Updated!",
          description: `Quantity for ${newCard.name} ${newCard.variant ? '('+newCard.variant+')' : ''} (${newCard.condition}) increased.`,
          className: "bg-secondary text-secondary-foreground"
        });

      } else {
        const cardsToStore = [newCard, ...storedCards];
        localStorage.setItem("pokemonCards", JSON.stringify(cardsToStore));
        toast({
          title: "Card Added!",
          description: `${newCard.name} ${newCard.variant ? '('+newCard.variant+')' : ''} (${newCard.condition}) has been added to your collection.`,
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
     // Reset scanned data after adding to prevent re-filling for next manual entry
    setScannedCardDataForForm(null);
  };

  const handleScanComplete = (data: ScanCardOutput) => {
    setIsScannerOpen(false);
    if (data.isPokemonCard && (data.name || data.set || data.cardNumber)) {
      setScannedCardDataForForm(data); // Set data to be passed to the form
      toast({
        title: "Scan Processed",
        description: `Card details extracted. Please verify and complete the form. Name: ${data.name || 'N/A'}, Set: ${data.set || 'N/A'}`,
        className: "bg-secondary text-secondary-foreground"
      });
    } else if (data.error) {
      toast({
        variant: "destructive",
        title: "Scan Inconclusive",
        description: data.error,
      });
       setScannedCardDataForForm(null); // Clear any previous scan data
    } else {
       toast({
        variant: "destructive",
        title: "Scan Inconclusive",
        description: "Could not extract significant details from the card.",
      });
       setScannedCardDataForForm(null);
    }
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
                initialScanData={scannedCardDataForForm} 
                key={scannedCardDataForForm ? JSON.stringify(scannedCardDataForForm) : 'manual-form'} // Force re-render on new scan data
              />
            </div>
            <div className="md:col-span-1 space-y-6 flex flex-col justify-start pt-[4.5rem]">
               <CardScannerButton onScanClick={() => setIsScannerOpen(true)} />
               <p className="text-sm text-muted-foreground text-center mt-2">
                Use the form to manually enter card details, or try the scanner.
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
          onScanComplete={handleScanComplete} 
        />
      )}

      <footer className="text-center py-4 text-sm text-muted-foreground border-t border-border mt-auto">
        Pokédex Tracker &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
}
