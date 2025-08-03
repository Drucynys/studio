// src/app/pokedex/[pokemonName]/page.tsx
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams, useRouter } from 'next/navigation';
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { AddCardToCollectionDialog } from "@/components/AddCardToCollectionDialog";
import { Loader2, ServerCrash, ArrowLeft, Target, Images, Search, Hash } from "lucide-react";
import type { ApiPokemonCard } from "@/app/sets/[setId]/page";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";


// Interface for a single Pokémon entry from our DB
export interface Pokemon {
  id: number;
  name: string;
  sprite: string;
  generation: number;
}

const PokemonDetailPage = () => {
  const params = useParams();
  const router = useRouter();
  const { collection } = useAuth();
  const pokemonName = params.pokemonName as string;

  const [cardsForPokemon, setCardsForPokemon] = useState<ApiPokemonCard[]>([]);
  const [filteredCards, setFilteredCards] = useState<ApiPokemonCard[]>([]);
  const [pokemonData, setPokemonData] = useState<Pokemon | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedApiCard, setSelectedApiCard] = useState<ApiPokemonCard | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const pokemonCompletion = useMemo(() => {
    if (cardsForPokemon.length === 0) return { collected: 0, total: 0, percentage: 0 };
    const collectedCardIdentifiers = new Set<string>();
    collection.forEach(card => {
        // We can't just check by name, as different pokemon can have the same name (e.g. Unown)
        // A better check would be against the specific cards for THIS pokemon.
        const apiCardForCollected = cardsForPokemon.find(apiCard => apiCard.id === card.apiId);
        if (apiCardForCollected && card.language === "English") { 
            collectedCardIdentifiers.add(`${card.name}-${card.cardNumber}`);
        }
    });

    const uniqueCollectedCount = collectedCardIdentifiers.size;
    const totalForThisPokemon = cardsForPokemon.length;
    const percentage = totalForThisPokemon > 0 ? parseFloat(((uniqueCollectedCount / totalForThisPokemon) * 100).toFixed(1)) : 0;
    return { collected: uniqueCollectedCount, total: totalForThisPokemon, percentage };
  }, [cardsForPokemon, collection]);


  const fetchPageData = useCallback(async () => {
    if (!pokemonName) return;
    setIsLoading(true);
    setError(null);
    try {
      const [pokemonDetailsResponse, cardsResponse] = await Promise.all([
        fetch(`/api/pokedex/${pokemonName}`),
        fetch(`https://api.pokemontcg.io/v2/cards?q=name:"${pokemonName}"&orderBy=set.releaseDate`, {
            headers: { 'X-Api-Key': process.env.NEXT_PUBLIC_POKEMONTCG_API_KEY || '' }
        })
      ]);

      if (!pokemonDetailsResponse.ok) {
        throw new Error(`Failed to fetch Pokémon details from database.`);
      }
      const pokemonDetailsData = await pokemonDetailsResponse.json();
      setPokemonData(pokemonDetailsData);

      if (!cardsResponse.ok) {
        throw new Error(`Failed to fetch cards: ${cardsResponse.statusText} (status: ${cardsResponse.status})`);
      }
      const cardsData = await cardsResponse.json();
      const allCards: ApiPokemonCard[] = cardsData.data;

      // Sort cards by release date then number
       allCards.sort((a, b) => {
        const dateA = new Date(a.set.releaseDate).getTime();
        const dateB = new Date(b.set.releaseDate).getTime();
        if(dateA === dateB) {
            const numA = parseInt(a.number.replace(/\D/g, ''), 10) || 0;
            const numB = parseInt(b.number.replace(/\D/g, ''), 10) || 0;
            return numA - numB;
        }
        return dateA - dateB;
      });

      setCardsForPokemon(allCards);
      setFilteredCards(allCards);

    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred");
    } finally {
      setIsLoading(false);
    }
  }, [pokemonName]);


  useEffect(() => {
    fetchPageData();
  }, [fetchPageData]);

  useEffect(() => {
    const lowercasedFilter = searchTerm.toLowerCase();
    const filteredData = cardsForPokemon.filter(card =>
      card.name.toLowerCase().includes(lowercasedFilter) ||
      card.number.toLowerCase().includes(lowercasedFilter) ||
      (card.rarity && card.rarity.toLowerCase().includes(lowercasedFilter)) ||
      card.set.name.toLowerCase().includes(lowercasedFilter)
    );
    setFilteredCards(filteredData);
  }, [searchTerm, cardsForPokemon]);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <AppHeader />
      <main className="flex-grow container mx-auto p-4 md:p-8">
        <div className="p-4 md:p-6 bg-card rounded-lg shadow-xl mb-6">
            <CardHeader className="p-0">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex flex-col md:flex-row md:items-center md:gap-4">
                         {pokemonData && pokemonData.sprite && (
                            <div className="relative w-20 h-20 self-center md:self-auto mb-2 md:mb-0" data-ai-hint="pokemon sprite">
                                <Image src={pokemonData.sprite} alt={pokemonName} layout="fill" unoptimized />
                            </div>
                        )}
                        <div>
                           <CardTitle className="font-headline text-3xl md:text-4xl text-foreground text-center md:text-left capitalize flex items-center gap-2">
                              <Target className="h-8 w-8 text-primary"/>
                              {pokemonName}
                            </CardTitle>
                             <CardDescription className="text-md md:text-lg text-center md:text-left">
                              {pokemonData?.generation && `Generation ${pokemonData.generation} | `}
                              All TCG card appearances
                            </CardDescription>
                        </div>
                    </div>
                    <div className="relative w-full md:w-1/3 lg:w-1/4 mt-4 md:mt-0">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input
                            type="text"
                            placeholder="Search cards..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 w-full"
                        />
                    </div>
                </div>
                 <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-y-4 gap-x-8 pt-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Hash className="h-4 w-4 text-primary"/>
                        {cardsForPokemon.length} cards found
                    </div>
                     <div className="flex-1 min-w-[150px]">
                        <div className="flex justify-between items-baseline mb-1">
                            <h3 className="text-sm font-medium text-muted-foreground">
                                Pokémon Completion
                            </h3>
                            <p className="text-sm font-semibold text-primary">
                                {pokemonCompletion.collected} / {pokemonCompletion.total}
                            </p>
                        </div>
                        <Progress value={pokemonCompletion.percentage} className="h-2" />
                    </div>
                </div>
             </CardHeader>
        </div>
        
        {isLoading && (
            <div className="flex justify-center items-center py-10">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="ml-4 text-lg text-muted-foreground">Loading cards...</p>
            </div>
        )}
        {error && (
            <div className="text-center py-10 text-destructive">
            <ServerCrash className="h-16 w-16 mx-auto mb-4" />
            <p className="text-xl font-semibold">Could not load cards for {pokemonName}.</p>
            <p>{error}</p>
            </div>
        )}

        {!isLoading && !error && (
          <div className="pb-8">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 pt-4 px-4">
              {filteredCards.map(card => {
                  const isCollected = collection.some(
                      (collected) => collected.apiId === card.id && collected.language === "English"
                  );
                  return (
                      <div
                        key={card.id}
                        onClick={() => {
                          setSelectedApiCard(card);
                          setIsDialogOpen(true);
                        }}
                        className="group relative aspect-[2.5/3.5] w-full cursor-pointer transition-transform duration-200 hover:scale-105"
                      >
                        <div className={cn("absolute inset-0 rounded-lg overflow-hidden", isCollected && "ring-2 ring-green-500")}>
                          <Image 
                            src={card.images.small} 
                            alt={card.name} 
                            layout="fill" 
                            objectFit="contain" 
                            className={cn(
                              "bg-card shadow-md rounded-lg",
                              isCollected ? "saturate-100" : "saturate-[.1] group-hover:saturate-100"
                            )}
                            data-ai-hint="pokemon card front"
                          />
                        </div>
                        <Badge className={cn(
                          "absolute bottom-1 right-1 z-10 text-white border-transparent transition-opacity group-hover:opacity-0",
                           isCollected ? "bg-green-600" : "bg-black/60"
                         )}>
                          #{card.number}
                        </Badge>
                      </div>
                  );
              })}
            </div>
            {filteredCards.length === 0 && (
              <div className="text-center py-10 text-muted-foreground">
                <Images className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg">No cards found for this Pokémon.</p>
              </div>
            )}
          </div>
        )}
      </main>
      <div className="fixed bottom-6 left-6 z-50">
        <Button onClick={() => router.back()} variant="secondary" size="icon" className="rounded-full h-14 w-14 shadow-lg border transition-colors hover:bg-primary hover:text-primary-foreground">
            <ArrowLeft className="h-6 w-6" />
            <span className="sr-only">Back</span>
        </Button>
      </div>
      {selectedApiCard && (
        <AddCardToCollectionDialog
          isOpen={isDialogOpen}
          onClose={() => setIsDialogOpen(false)}
          cardName={selectedApiCard.name}
          initialCardImageUrl={selectedApiCard.images.small}
          pokemonTcgApiCard={selectedApiCard}
        />
      )}
      <footer className="text-center py-4 text-sm text-muted-foreground border-t border-border mt-auto">
        PokéTRKR &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
};

export default PokemonDetailPage;
