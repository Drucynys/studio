
"use client";

import { useState, useCallback, useRef } from "react";
import Image from "next/image";
import { AppHeader } from "@/components/AppHeader";
import { ManualCardInputForm } from "@/components/ManualCardInputForm";
import type { PokemonCard } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { PlusCircle, ImageUp, Loader2, XCircle } from "lucide-react";
import { findCardByImage, type FindCardOutput } from "@/ai/flows/find-card-by-image-flow";

export default function AddCardPage() {
  const { toast } = useToast();
  const [scannedCardDataForForm, setScannedCardDataForForm] = useState<Partial<FindCardOutput> | null>(null);
  const [uploadedImagePreview, setUploadedImagePreview] = useState<string | null>(null);
  const [isIdentifyingCard, setIsIdentifyingCard] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);


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
    // Keep scannedCardDataForForm for potential multiple adds with different conditions.
    // Clearing preview is fine.
    // setUploadedImagePreview(null); // Don't clear preview immediately, user might want to reference it.
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadedImagePreview(null); // Clear previous preview
    setScannedCardDataForForm(null); // Clear previous scan data
    setIsIdentifyingCard(true);

    const reader = new FileReader();
    reader.onloadend = async () => {
      const imageDataUri = reader.result as string;
      setUploadedImagePreview(imageDataUri);

      try {
        toast({
          title: "Identifying Card...",
          description: "AI is analyzing your card image. This may take a moment.",
        });
        const result = await findCardByImage({ imageDataUri });
        setScannedCardDataForForm(result);
        
        let description = "AI analysis complete. Please verify and complete the form.";
        if (result.name || result.set || result.cardNumber) {
            description = `Identified: ${result.name || 'N/A'} from ${result.set || 'N/A'} (#${result.cardNumber || 'N/A'}). Rarity: ${result.rarity || 'N/A'}. Please verify.`;
        }
        toast({
          title: "Card Identification Attempted!",
          description: description,
          className: "bg-secondary text-secondary-foreground",
          duration: 8000,
        });
      } catch (error) {
        console.error("Error identifying card by image:", error);
        toast({
          variant: "destructive",
          title: "Identification Error",
          description: "Could not identify card details from the image. Please enter manually.",
        });
        // Keep the image preview, but scanned data will be null
        setScannedCardDataForForm(null);
      } finally {
        setIsIdentifyingCard(false);
         // Reset file input to allow uploading the same file again if needed
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const clearUploadedImage = () => {
    setUploadedImagePreview(null);
    setScannedCardDataForForm(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
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
                key={scannedCardDataForForm ? JSON.stringify(scannedCardDataForForm) : 'manual-form'}
              />
            </div>
            <div className="md:col-span-1 space-y-6 flex flex-col justify-start pt-[4.5rem]">
               <input 
                 type="file" 
                 accept="image/*" 
                 onChange={handleImageUpload} 
                 ref={fileInputRef}
                 className="hidden"
                 id="card-image-upload"
               />
               <Button 
                 variant="outline" 
                 className="w-full border-accent text-accent hover:bg-accent/10 hover:text-accent" 
                 onClick={() => fileInputRef.current?.click()}
                 disabled={isIdentifyingCard}
               >
                 {isIdentifyingCard ? (
                   <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                 ) : (
                   <ImageUp className="mr-2 h-4 w-4" />
                 )}
                 {isIdentifyingCard ? "Identifying Card..." : "Upload Card Image for AI Scan"}
               </Button>

               {uploadedImagePreview && (
                <div className="mt-4 p-4 border rounded-lg shadow-sm bg-card">
                  <h3 className="text-lg font-semibold mb-3 text-center text-card-foreground">Uploaded Image Preview:</h3>
                  <div className="relative aspect-[2.5/3.5] w-full max-w-xs mx-auto rounded-md overflow-hidden shadow-md border" data-ai-hint="pokemon card uploaded">
                    <Image 
                        src={uploadedImagePreview} 
                        alt="Uploaded card preview" 
                        layout="fill" 
                        objectFit="contain" 
                    />
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={clearUploadedImage} 
                    className="mt-3 w-full text-destructive hover:bg-destructive/10 hover:text-destructive"
                    disabled={isIdentifyingCard}
                  >
                    <XCircle className="mr-2 h-4 w-4"/> Clear Image & Scan Data
                  </Button>
                </div>
              )}
               <p className="text-sm text-muted-foreground text-center mt-2">
                Upload an image of your card, and AI will try to identify it to pre-fill the form. You can also enter details manually.
              </p>
            </div>
          </div>
        </section>
        <Separator className="my-12" />
         <p className="text-center text-muted-foreground">
            Once cards are added, you can view and manage them in <a href="/my-collection" className="text-primary hover:underline">My Collection</a>.
        </p>
      </main>

      <footer className="text-center py-4 text-sm text-muted-foreground border-t border-border mt-auto">
        Pokédex Tracker &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
}
