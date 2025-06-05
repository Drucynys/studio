"use client";

import { useState, useEffect } from "react";
import { AppHeader } from "@/components/AppHeader";
import { ManualCardInputForm } from "@/components/ManualCardInputForm";
import { CardList } from "@/components/CardList";
import { ImageGallery } from "@/components/ImageGallery";
import { CardScannerButton } from "@/components/CardScannerButton";
import type { PokemonCard } from "@/types";
import { Separator } from "@/components/ui/separator";
import { Images } from "lucide-react";

// Sample initial data
const initialCardsData: PokemonCard[] = [
  { id: "1", name: "Pikachu", set: "Base Set", cardNumber: "58/102", rarity: "Common", condition: "Near Mint", value: 5.00, imageUrl: "https://placehold.co/250x350.png" },
  { id: "2", name: "Charizard", set: "Base Set", cardNumber: "4/102", rarity: "Holo Rare", condition: "Played", value: 150.00, imageUrl: "https://placehold.co/250x350.png" },
  { id: "3", name: "Blastoise", set: "Celebrations", cardNumber: "004/025", rarity: "Classic Collection", condition: "Mint", value: 12.75, imageUrl: "https://placehold.co/250x350.png" },
];


export default function Home() {
  const [cards, setCards] = useState<PokemonCard[]>([]);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const storedCards = localStorage.getItem("pokemonCards");
    if (storedCards) {
      try {
        const parsedCards = JSON.parse(storedCards);
        if (Array.isArray(parsedCards)) {
          setCards(parsedCards);
        } else {
          setCards(initialCardsData); // Fallback if stored data is not an array
        }
      } catch (error) {
        console.error("Failed to parse cards from localStorage", error);
        setCards(initialCardsData); // Fallback on error
      }
    } else {
      setCards(initialCardsData);
    }
  }, []);

  useEffect(() => {
    if(isClient) {
      localStorage.setItem("pokemonCards", JSON.stringify(cards));
    }
  }, [cards, isClient]);


  const handleAddCard = (newCard: PokemonCard) => {
    setCards((prevCards) => [newCard, ...prevCards]);
  };

  if (!isClient) {
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
      </main>
      <footer className="text-center py-4 text-sm text-muted-foreground border-t border-border mt-auto">
        Pokédex Tracker &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
}
