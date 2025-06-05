
"use client";

import { useState, useEffect } from "react";
import { AppHeader } from "@/components/AppHeader";
import { ManualCardInputForm } from "@/components/ManualCardInputForm";
import { CardList } from "@/components/CardList";
import { ImageGallery } from "@/components/ImageGallery";
import { CardScannerButton } from "@/components/CardScannerButton";
import type { PokemonCard } from "@/types";
import { Separator } from "@/components/ui/separator";
import { Images, Dices } from "lucide-react"; // Added Dices for a potential random feature or just visual flair

// Sample initial data (will be overridden by localStorage if available)
const initialCardsData: PokemonCard[] = [
  { id: "1", name: "Pikachu", set: "Base Set", cardNumber: "58/102", rarity: "Common", condition: "Near Mint", value: 5.00, imageUrl: "https://placehold.co/250x350.png" },
  { id: "2", name: "Charizard", set: "Base Set", cardNumber: "4/102", rarity: "Holo Rare", condition: "Played", value: 150.00, imageUrl: "https://placehold.co/250x350.png" },
  { id: "3", name: "Blastoise", set: "Celebrations", cardNumber: "004/025", rarity: "Classic Collection", condition: "Mint", value: 12.75, imageUrl: "https://placehold.co/250x350.png" },
];


export default function Home() {
  const [cards, setCards] = useState<PokemonCard[]>([]);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true); // Ensure client-side only for localStorage
    const storedCards = localStorage.getItem("pokemonCards");
    if (storedCards) {
      try {
        const parsedCards = JSON.parse(storedCards) as PokemonCard[];
        if (Array.isArray(parsedCards)) {
          // Sort cards by name by default when loading, new cards added to top
          const sortedCards = parsedCards.sort((a,b) => (a.name && b.name ? a.name.localeCompare(b.name) : 0));
          setCards(sortedCards);
        } else {
          setCards(initialCardsData); 
        }
      } catch (error) {
        console.error("Failed to parse cards from localStorage", error);
        setCards(initialCardsData); 
      }
    } else {
      setCards(initialCardsData);
    }
  }, []); // Empty dependency array: run only once on mount

  useEffect(() => {
    if (isClient) { // Ensure client-side only for localStorage
      // Sort cards by name before saving, new cards are added to the top then sorted on next load
      const cardsToStore = [...cards].sort((a,b) => (a.name && b.name ? a.name.localeCompare(b.name) : 0));
      localStorage.setItem("pokemonCards", JSON.stringify(cardsToStore));
    }
  }, [cards, isClient]);


  const handleAddCard = (newCard: PokemonCard) => {
    // Add new card to the top, then it will be sorted on next load/save
    setCards((prevCards) => [newCard, ...prevCards]);
  };

  // This effect will re-run if localStorage is updated by another page/tab
  useEffect(() => {
    if (!isClient) return;

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === "pokemonCards" && event.newValue) {
        try {
          const updatedCards = JSON.parse(event.newValue) as PokemonCard[];
           if (Array.isArray(updatedCards)) {
             const sortedCards = updatedCards.sort((a,b) => (a.name && b.name ? a.name.localeCompare(b.name) : 0));
             setCards(sortedCards);
           }
        } catch (error) {
          console.error("Error processing storage update:", error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [isClient]);


  if (!isClient) {
    // Render a basic loading state or null during SSR/Pre-render to avoid hydration mismatch
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <AppHeader />
        <main className="flex-grow container mx-auto p-4 md:p-8 flex items-center justify-center">
          <p className="text-xl text-muted-foreground animate-pulse">Loading Pokédex...</p>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <AppHeader />
      <main className="flex-grow container mx-auto p-4 md:p-8 space-y-10">
        <section id="card-management" aria-labelledby="card-management-heading">
          <div className="grid md:grid-cols-3 gap-8 items-start">
            <div className="md:col-span-1 space-y-6">
              <ManualCardInputForm onAddCard={handleAddCard} />
              <CardScannerButton />
            </div>
            <div className="md:col-span-2">
              <CardList cards={cards} />
            </div>
          </div>
        </section>
        
        <Separator className="my-8" />
        
        <section id="image-gallery" aria-labelledby="image-gallery-heading">
          <h2 id="image-gallery-heading" className="text-3xl font-headline font-semibold mb-6 text-foreground flex items-center gap-2">
            <Images className="h-7 w-7 text-primary" />
            Card Edition Gallery
          </h2>
          <ImageGallery />
        </section>

        {/* You could add more sections or features here */}
        {/* Example:
        <Separator className="my-8" />
        <section id="random-feature" aria-labelledby="random-feature-heading">
           <h2 id="random-feature-heading" className="text-3xl font-headline font-semibold mb-6 text-foreground flex items-center gap-2">
            <Dices className="h-7 w-7 text-accent" />
            Random Feature Showcase
          </h2>
          <p className="text-muted-foreground">This is a placeholder for another app feature.</p>
        </section>
        */}
      </main>
      <footer className="text-center py-4 text-sm text-muted-foreground border-t border-border mt-auto">
        Pokédex Tracker &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
}

