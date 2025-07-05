"use client";

import { useState, FormEvent } from "react";
import Image from "next/image";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AddCardToCollectionDialog } from "@/components/AddCardToCollectionDialog";
import type { PokemonCard as CollectionPokemonCard } from "@/types";
import type { ApiPokemonCard } from "@/app/sets/[setId]/page";
import { Loader2, ServerCrash, Search as SearchIcon, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const conditionOptions = ["Mint", "Near Mint", "Excellent", "Good", "Lightly Played", "Played", "Poor", "Damaged"];

export default function SearchPage() {
  const [name, setName] = useState("");
  const [set, setSet] = useState("");
  const [cardNumber, setCardNumber] = useState("");

  const [searchResults, setSearchResults] = useState<ApiPokemonCard[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const [selectedApiCard, setSelectedApiCard] = useState<ApiPokemonCard | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  const handleSearch = async (e: FormEvent) => {
    e.preventDefault();
    if (!name && !set && !cardNumber) {
      setError("Please enter at least one search term.");
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setHasSearched(true);
    setSearchResults([]);

    try {
      const params = new URLSearchParams();
      if (name) params.append("name", name);
      if (set) params.append("set", set);
      if (cardNumber) params.append("cardNumber", cardNumber);
      
      const response = await fetch(`/api/search-cards?${params.toString()}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `An error occurred: ${response.statusText}`);
      }
      
      const data: ApiPokemonCard[] = await response.json();
      setSearchResults(data);

    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddCardToCollection = (condition: string, valueForCollection: number, variant?: string, quantity: number = 1) => {
    if (!selectedApiCard) return;

    const newCard: CollectionPokemonCard = {
      id: crypto.randomUUID(),
      name: selectedApiCard.name,
      set: selectedApiCard.set.name,
      cardNumber: selectedApiCard.number,
      rarity: selectedApiCard.rarity || "N/A",
      variant,
      condition,
      value: valueForCollection,
      imageUrl: selectedApiCard.images.large,
      quantity,
      language: "English", // Assuming search is for English cards for now
      artist: selectedApiCard.artist,
    };

    try {
      const storedCardsRaw = localStorage.getItem("pokemonCards");
      const storedCards: CollectionPokemonCard[] = storedCardsRaw ? JSON.parse(storedCardsRaw) : [];

      const existingCardIndex = storedCards.findIndex(
        item => item.name === newCard.name &&
                item.set === newCard.set &&
                item.cardNumber === newCard.cardNumber &&
                item.variant === newCard.variant &&
                item.condition === newCard.condition
      );

      if (existingCardIndex > -1) {
        storedCards[existingCardIndex].quantity += newCard.quantity;
      } else {
        storedCards.unshift(newCard);
      }
      
      localStorage.setItem("pokemonCards", JSON.stringify(storedCards));
      window.dispatchEvent(new StorageEvent('storage', { key: 'pokemonCards' }));

      toast({
        title: existingCardIndex > -1 ? "Card Quantity Updated!" : "Card Added!",
        description: `${newCard.name} from ${newCard.set} has been ${existingCardIndex > -1 ? 'updated' : 'added'}.`,
        className: "bg-secondary text-secondary-foreground"
      });

    } catch (e) {
      toast({ variant: "destructive", title: "Storage Error", description: "Could not save card." });
    }
    setIsDialogOpen(false);
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <AppHeader />
      <main className="flex-grow container mx-auto p-4 md:p-8">
        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="font-headline text-3xl text-foreground flex items-center gap-2">
              <SearchIcon className="h-8 w-8 text-primary"/>
              Search for Cards
            </CardTitle>
            <CardDescription>
              Find specific Pokémon TCG cards by name, set, or number.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end mb-8">
              <div className="md:col-span-2">
                <label htmlFor="name-search" className="block text-sm font-medium text-muted-foreground mb-1">Card Name</label>
                <Input
                  id="name-search"
                  type="text"
                  placeholder="e.g., Charizard"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="set-search" className="block text-sm font-medium text-muted-foreground mb-1">Set Name or ID</label>
                <Input
                  id="set-search"
                  type="text"
                  placeholder="e.g., Base Set or base1"
                  value={set}
                  onChange={(e) => setSet(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="number-search" className="block text-sm font-medium text-muted-foreground mb-1">Card Number</label>
                <Input
                  id="number-search"
                  type="text"
                  placeholder="e.g., 4"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                />
              </div>
              <Button type="submit" disabled={isLoading} className="md:col-start-4">
                {isLoading ? <Loader2 className="animate-spin" /> : <SearchIcon className="mr-2 h-4 w-4" />}
                Search
              </Button>
            </form>
            
            {error && (
              <div className="text-center py-10 text-destructive">
                <ServerCrash className="h-16 w-16 mx-auto mb-4" />
                <p className="text-xl font-semibold">An error occurred.</p>
                <p>{error}</p>
              </div>
            )}
            
            {!isLoading && hasSearched && searchResults.length === 0 && !error && (
              <div className="text-center py-10 text-muted-foreground">
                <Info className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg">No cards found matching your query.</p>
                <p>Try making your search less specific.</p>
              </div>
            )}
            
            {!isLoading && searchResults.length > 0 && (
               <ScrollArea className="h-[calc(100vh-28rem)]">
                <p className="text-sm text-muted-foreground mb-4">Found {searchResults.length} card(s). Click on a card to add it to your collection.</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 pt-4 pb-24 px-4">
                  {searchResults.map(card => (
                    <Card
                      key={card.id}
                      onClick={() => {
                        setSelectedApiCard(card);
                        setIsDialogOpen(true);
                      }}
                      className="p-2 cursor-pointer group flex flex-col relative bg-card transform transition-all duration-200 ease-out hover:scale-105 hover:-translate-y-1 hover:shadow-lg"
                    >
                      <div className="relative aspect-[2.5/3.5] w-full rounded-md overflow-hidden">
                        <Image
                          src={card.images.small}
                          alt={card.name}
                          layout="fill"
                          objectFit="contain"
                          data-ai-hint="pokemon card front"
                        />
                      </div>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            )}

            {isLoading && (
              <div className="flex justify-center items-center py-10">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="ml-4 text-lg text-muted-foreground">Searching for cards...</p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
       {selectedApiCard && (
        <AddCardToCollectionDialog
          isOpen={isDialogOpen}
          onClose={() => setIsDialogOpen(false)}
          cardName={selectedApiCard.name}
          initialCardImageUrl={selectedApiCard.images.small}
          pokemonTcgApiCard={selectedApiCard}
          availableConditions={conditionOptions}
          onAddCard={handleAddCardToCollection}
        />
      )}
      <footer className="text-center py-4 text-sm text-muted-foreground border-t border-border mt-auto">
        Pokédex Tracker &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
}
