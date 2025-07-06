
"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AddCardToCollectionDialog } from "@/components/AddCardToCollectionDialog";
import type { PokemonCard as CollectionPokemonCard } from "@/types";
import { Loader2, ServerCrash, ArrowLeft, Target, Images } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { POKEMON_DATA } from '../pokedexData';

// Re-defining the API card type here for this page
export interface ApiPokemonCard {
  id: string;
  name: string;
  set: {
    id: string;
    name: string;
    series: string;
    logo?: string;
    releaseDate: string;
    printedTotal: number;
    total: number;
  };
  number: string;
  rarity?: string;
  artist?: string;
  images: {
    small: string;
    large: string;
  };
  tcgplayer?: {
    prices?: {
      [key: string]: {
        market?: number | null;
      };
    };
  };
}

const conditionOptions = ["Mint", "Near Mint", "Excellent", "Good", "Lightly Played", "Played", "Poor", "Damaged"];

// Updated interface for component props to handle async params
interface PokemonDetailPageProps {
  params: Promise<{ pokemonName: string }>;
}

const PokemonDetailPage = async ({ params }: PokemonDetailPageProps) => {
  // Await the params since they're now a Promise in Next.js 15
  const { pokemonName: rawPokemonNameFromParams } = await params;
  const pokemonName = decodeURIComponent(rawPokemonNameFromParams);

  // Create a client component to handle the state and effects
  return <PokemonDetailPageClient pokemonName={pokemonName} />;
};

// Client component to handle state and effects
const PokemonDetailPageClient = ({ pokemonName }: { pokemonName: string }) => {
  const [cardsForPokemon, setCardsForPokemon] = useState<ApiPokemonCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedApiCard, setSelectedApiCard] = useState<ApiPokemonCard | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  const pokemonData = POKEMON_DATA.find(p => p.name.toLowerCase() === pokemonName.toLowerCase());

  const fetchCardsForPokemon = useCallback(async () => {
    if (!pokemonName) return;
    setIsLoading(true);
    setError(null);
    try {
      const headers: HeadersInit = {};
      if (process.env.NEXT_PUBLIC_POKEMONTCG_API_KEY) {
        headers['X-Api-Key'] = process.env.NEXT_PUBLIC_POKEMONTCG_API_KEY;
      }
      
      const response = await fetch(`https://api.pokemontcg.io/v2/cards?q=name:"${pokemonName}"&orderBy=set.releaseDate`, { headers });
      if (!response.ok) {
        throw new Error(`Failed to fetch cards: ${response.statusText} (status: ${response.status})`);
      }
      const data = await response.json();
      setCardsForPokemon(data.data as ApiPokemonCard[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred");
    } finally {
      setIsLoading(false);
    }
  }, [pokemonName]);

  useEffect(() => {
    fetchCardsForPokemon();
  }, [fetchCardsForPokemon]);

  const getDefaultMarketPrice = (apiCard: ApiPokemonCard | null): { value: number, variant?: string } => {
    if (!apiCard || !apiCard.tcgplayer?.prices) return { value: 0 };
    const prices = apiCard.tcgplayer.prices;
    const variantPriority = ['normal', 'holofoil', 'reverseHolofoil', '1stEditionNormal', '1stEditionHolofoil'];
    for (const variant of variantPriority) {
      if (prices[variant]?.market && typeof prices[variant]!.market === 'number') {
        return { value: prices[variant]!.market!, variant: variant };
      }
    }
    return { value: 0 };
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
      language: "English",
      artist: selectedApiCard.artist
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
        <Link href="/pokedex">
          <Button variant="outline" className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Pokédex
          </Button>
        </Link>
        <Card className="shadow-xl">
          <CardHeader>
            <div className="flex items-center gap-4">
              {pokemonData && (
                 <div className="relative w-20 h-20" data-ai-hint="pokemon sprite">
                   <Image src={pokemonData.sprite} alt={pokemonName} layout="fill" unoptimized />
                 </div>
              )}
              <div>
                <CardTitle className="font-headline text-3xl text-foreground capitalize flex items-center gap-2">
                  <Target className="h-8 w-8 text-primary"/>
                  {pokemonName}
                </CardTitle>
                <CardDescription>All TCG card appearances</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading && (
              <div className="flex justify-center items-center py-10">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="ml-4 text-lg text-muted-foreground">Loading cards...</p>
              </div>
            )}
            {error && (
              <div className="text-center py-10 text-destructive">
                <ServerCrash className="h-16 w-16 mb-4" />
                <p className="text-xl font-semibold">Could not load cards for {pokemonName}.</p>
                <p>{error}</p>
              </div>
            )}
            {!isLoading && !error && (
              <ScrollArea className="h-[calc(100vh-28rem)]">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 pt-4 pb-24 px-4">
                  {cardsForPokemon.map(card => (
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
                {cardsForPokemon.length === 0 && (
                  <div className="text-center py-10 text-muted-foreground">
                    <Images className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg">No cards found for this Pokémon.</p>
                  </div>
                )}
              </ScrollArea>
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
};

export default PokemonDetailPage;
