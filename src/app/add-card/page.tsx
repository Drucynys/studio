
"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Image from "next/image";
import { AppHeader } from "@/components/AppHeader";
import { ManualCardInputForm } from "@/components/ManualCardInputForm";
import type { PokemonCard } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { PlusCircle, ImageUp, Loader2, XCircle } from "lucide-react";
import { findCardByImage, type FindCardOutput } from "@/ai/flows/find-card-by-image-flow";
import { Card } from "@/components/ui/card";
import Tesseract from 'tesseract.js';

// Define a type for the simplified card data from API search results
type SearchResultCard = {
 id: string; // Unique identifier from the API
 name: string;
 set: string;
 cardNumber: string;
 imageUrl?: string; // Optional image URL
 // Add other relevant fields from API if needed for display/adding
};




export default function AddCardPage() {
  const { toast } = useToast();
  const [scannedCardDataForForm, setScannedCardDataForForm] = useState<Partial<FindCardOutput> | null>(null);
  const [uploadedImagePreview, setUploadedImagePreview] = useState<string | null>(null);
  const [isIdentifyingCard, setIsIdentifyingCard] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [searchResults, setSearchResults] = useState<SearchResultCard[]>([]); // State to hold API search results


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
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
  
    const reader = new FileReader();
    reader.onloadend = async () => {
      const imageDataUri = reader.result as string;
      setUploadedImagePreview(imageDataUri);
      setIsIdentifyingCard(true);
      
      try {
        toast({
          title: "Identifying Card...",
          description: "Analyzing card image with OCR. This may take a moment.",
        });
        
        // Configure Tesseract for better Pokemon card recognition
        const { data: { text } } = await Tesseract.recognize(
          imageDataUri,
          'eng',
          {
            logger: m => console.log(m),
            // Tesseract configuration for better text recognition
            tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 ./-\'&',
            tessedit_pageseg_mode: Tesseract.PSM.AUTO,
            preserve_interword_spaces: '1'
          }
        );
        
        console.log("Raw OCR Text:", text);
        
        // Enhanced parsing logic
        const lines = text
          .split(/\r?\n/)
          .map(line => line.trim())
          .filter(line => line.length > 0);
        
        console.log("Processed lines:", lines);
        
        let identifiedName = '';
        let identifiedCardNumber = '';
        
        // Multiple strategies for finding card name
        const findCardName = (lines: string[]): string => {
          // Strategy 1: Look for Pokemon names (typically capitalized, may include special characters)
          for (const line of lines) {
            // Match Pokemon names: starts with capital, may have spaces, hyphens, apostrophes
            const pokemonNameMatch = line.match(/^([A-Z][a-zA-Z\s\-'&.]+)$/);
            if (pokemonNameMatch && pokemonNameMatch[1].length >= 3 && pokemonNameMatch[1].length <= 25) {
              // Filter out common non-name text
              const excludeWords = ['HP', 'BASIC', 'STAGE', 'EVOLUTION', 'POKEMON', 'TRAINER', 'ENERGY', 'RARE', 'COMMON', 'UNCOMMON'];
              if (!excludeWords.some(word => pokemonNameMatch[1].toUpperCase().includes(word))) {
                return pokemonNameMatch[1].trim();
              }
            }
          }
          
          // Strategy 2: Look for text that appears to be a name (mixed case, reasonable length)
          for (const line of lines) {
            const nameMatch = line.match(/^([A-Z][a-z]+(?:\s[A-Z][a-z]*)*(?:\s[A-Z]+)?)$/);
            if (nameMatch && nameMatch[1].length >= 3 && nameMatch[1].length <= 20) {
              return nameMatch[1].trim();
            }
          }
          
          // Strategy 3: Look for the first reasonable text line (fallback)
          for (const line of lines) {
            if (line.length >= 3 && line.length <= 25 && /^[A-Za-z\s\-'&.]+$/.test(line)) {
              // Skip obvious non-names
              if (!/(HP|BASIC|STAGE|POKEMON|TRAINER|ENERGY|\d)/i.test(line)) {
                return line.trim();
              }
            }
          }
          
          return '';
        };
        
        // Multiple strategies for finding card number
        const findCardNumber = (lines: string[]): string => {
          const fullText = lines.join(' ');
          
          // Strategy 1: Standard format X/Y
          const standardMatch = fullText.match(/(\d+)\s*\/\s*(\d+)/);
          if (standardMatch) {
            return standardMatch[0];
          }
          
          // Strategy 2: Look for number patterns in individual lines
          for (const line of lines) {
            // Check for X/Y format in line
            const lineNumberMatch = line.match(/(\d+)\s*\/\s*(\d+)/);
            if (lineNumberMatch) {
              return lineNumberMatch[0];
            }
            
            // Check for isolated numbers that might be card numbers (usually 1-3 digits)
            const isolatedNumberMatch = line.match(/^\s*(\d{1,3})\s*$/);
            if (isolatedNumberMatch) {
              const num = parseInt(isolatedNumberMatch[1]);
              if (num >= 1 && num <= 999) { // Reasonable range for card numbers
                return isolatedNumberMatch[1];
              }
            }
          }
          
          // Strategy 3: Look for numbers preceded by common indicators
          const indicatorMatch = fullText.match(/(?:No\.?\s*|#\s*|Card\s*#?\s*)(\d+(?:\s*\/\s*\d+)?)/i);
          if (indicatorMatch) {
            return indicatorMatch[1];
          }
          
          return '';
        };
        
        // Apply parsing strategies
        identifiedName = findCardName(lines);
        identifiedCardNumber = findCardNumber(lines);
        
        console.log("Parsed results:", { name: identifiedName, cardNumber: identifiedCardNumber });
        
        const identifiedData: Partial<FindCardOutput> = {
          name: identifiedName || undefined,
          cardNumber: identifiedCardNumber || undefined,
        };
        
        setScannedCardDataForForm(identifiedData);
        
        toast({
          title: "Card Identification Complete!",
          description: `Name: ${identifiedName || 'Not found'}, Number: ${identifiedCardNumber || 'Not found'}. Please verify the results.`,
          className: "bg-secondary text-secondary-foreground",
          duration: 8000,
        });
        
      } catch (error) {
        console.error("Error during OCR:", error);
        toast({ 
          variant: "destructive", 
          title: "OCR Error", 
          description: "Could not process image with OCR. Please try a clearer image." 
        });
        setScannedCardDataForForm(null);
      } finally {
        setIsIdentifyingCard(false);
      }
    };
    
    reader.readAsDataURL(file);
  };

  // Handler for adding a card from the API search results
  const handleAddSearchResultToCollection = (card: SearchResultCard) => {
    // Convert the simplified SearchResultCard to the full PokemonCard type
    // Note: This conversion might need refinement depending on what data the API returns
    // and what fields are mandatory for PokemonCard. We are making some assumptions here.
    const cardToAdd: PokemonCard = {
      // Required fields (make sure API search provides these or use defaults/placeholders)
      id: card.id, // Use API ID as local ID
      name: card.name,
      set: card.set,
      cardNumber: card.cardNumber,
 language: 'en', // Assuming English for now, could be expanded
 condition: 'Mint', // Default condition, set to Mint as requested
 quantity: 1, // Default quantity
      // Optional fields
 variant: '', // Default variant
 imageUrl: card.imageUrl || '', // Use API image URL if available
      // Add other PokemonCard fields if the API provides them and they are needed
    };
    handleAddCardLocally(cardToAdd);
  };

  const searchApiForCards = async () => {
    if (!scannedCardDataForForm) {
      toast({
        variant: "destructive",
        title: "Search Failed",
        description: "No identified card data available to perform search.",
      });
      return;
    }

    setSearchResults([]); // Clear previous results
    toast({
      title: "Searching API...",
      description: "Searching for matching cards based on identified details.",
    });

    let results: SearchResultCard[] = [];
    let queryParams = new URLSearchParams();
    // First search by name and card number
 const nameNumberQueryParams = new URLSearchParams();
    if (scannedCardDataForForm.name) nameNumberQueryParams.append("name", scannedCardDataForForm.name);
    if (scannedCardDataForForm.cardNumber) nameNumberQueryParams.append("cardNumber", scannedCardDataForForm.cardNumber);

    // First search by name and card number, without set
 try {
    if (scannedCardDataForForm.set) queryParams.append("set", scannedCardDataForForm.set);

    try {
      const response = await fetch(`/api/search-cards?${queryParams.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to fetch search results from API.");
      }

      if (data.length > 0) {
        results = data;
      }
    } catch (error: any) {
      console.error("Error during initial API search:", error);
      // Continue to the second search even if the first one fails
    }

    // If no results from the first search, try searching with the name, card number AND the set
    if (results.length === 0 && scannedCardDataForForm.set) {
      const setQueryParams = new URLSearchParams();
      if (scannedCardDataForForm.name) setQueryParams.append("name", scannedCardDataForForm.name);
      if (scannedCardDataForForm.cardNumber) setQueryParams.append("cardNumber", scannedCardDataForForm.cardNumber);
      try {
        const response = await fetch(`/api/search-cards?${setQueryParams.toString()}`);
        const data = await response.json();
        if (response.ok && data.length > 0) {
          results = data;
        }
      } catch (error: any) {
        console.error("Error during second API search with set:", error);
      }
    }

    if (results.length > 0) {
      setSearchResults(results);
        toast({
          title: "Search Complete!",
          description: `${data.length} matching card(s) found.`,
          className: "bg-secondary text-secondary-foreground",
        });
      } else {
 setSearchResults([]); // Ensure results are clear
        toast({
          title: "No Matches Found",
          description: "Could not find matching cards in the API for the identified details.",
        });
      }
    } catch (error: any) {
      console.error("Error searching API:", error);
      toast({ variant: "destructive", title: "Search Error", description: "An error occurred during the API search." });
      setSearchResults([]); // Clear results on error
    }
  };

  const clearUploadedImage = () => {
    setUploadedImagePreview(null);
    setScannedCardDataForForm(null);
    setSearchResults([]); // Also clear search results when clearing image/scan data
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

              {scannedCardDataForForm && (
                <div className="mt-4 p-4 border rounded-lg shadow-sm bg-card">
                  <h3 className="text-lg font-semibold mb-3 text-center text-card-foreground">Identified Card Details:</h3>
                  <div className="text-sm text-card-foreground space-y-1">
                    {scannedCardDataForForm.name && <p><strong className="font-medium">Name:</strong> {scannedCardDataForForm.name}</p>}
                    {scannedCardDataForForm.set && <p><strong className="font-medium">Set:</strong> {scannedCardDataForForm.set}</p>}
                    {scannedCardDataForForm.cardNumber && <p><strong className="font-medium">Card Number:</strong> {scannedCardDataForForm.cardNumber}</p>}
                    {scannedCardDataForForm.rarity && <p><strong className="font-medium">Rarity:</strong> {scannedCardDataForForm.rarity}</p>}
                    {scannedCardDataForForm.language && <p><strong className="font-medium">Language:</strong> {scannedCardDataForForm.language}</p>}
                    {scannedCardDataForForm.type && <p><strong className="font-medium">Type:</strong> {scannedCardDataForForm.type}</p>}
                    {scannedCardDataForForm.supertype && <p><strong className="font-medium">Supertype:</strong> {scannedCardDataForForm.supertype}</p>}
                    {scannedCardDataForForm.setName && <p><strong className="font-medium">Set Name:</strong> {scannedCardDataForForm.setName}</p>}
                    {scannedCardDataForForm.tcgplayerProductId && <p><strong className="font-medium">TCGPlayer Product ID:</strong> {scannedCardDataForForm.tcgplayerProductId}</p>}
                  </div>
                  {/* Future implementation: Add search/confirm buttons here */}
                  <Button
                    variant="outline"
                    className="w-full mt-4"
                    onClick={searchApiForCards}
                    disabled={isIdentifyingCard} // Disable while AI is identifying
 >
                    Search API for Matches
 </Button>
                 {searchResults.length > 0 && (
                    <div className="mt-6">
                      <h3 className="text-lg font-semibold mb-3 text-center text-card-foreground">Matching Cards from API:</h3>
                      <div className="space-y-4">
                        {searchResults.map((card) => (
                          <Card key={card.id} className="flex items-center p-4">
                            {card.imageUrl && (
                              <Image src={card.imageUrl} alt={`${card.name} image`} width={50} height={70} className="rounded-md mr-4 object-contain"/>
                            )}
                            <div className="flex-grow">
                              <p className="font-semibold text-card-foreground">{card.name}</p>
                              <p className="text-sm text-muted-foreground">{card.set} #{card.cardNumber}</p>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => handleAddSearchResultToCollection(card)}
                            >
                              Add to Collection
                            </Button>
                          </Card>
                        ))}
                      </div>
                    </div>
                 )}
                </div>
              )}
               <p className="text-sm text-muted-foreground text-center mt-2">
                Upload an image of your card, and AI will try to identify it to pre-fill the form. You can also enter details manually.
              </p>
            </div>
          </div>
          <div id="search-results" className="mt-8">
 {/* API search results will be displayed here */}
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
