// src/app/browse-artists/[artistName]/page.tsx
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
import { Loader2, ServerCrash, ArrowLeft, Images, Paintbrush, Search, CheckCircle, Hash } from "lucide-react";
import type { ApiPokemonCard } from "@/app/sets/[setId]/page";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

const ArtistDetailPage = () => {
  const params = useParams();
  const router = useRouter();
  const artistNameParam = params.artistName as string;
  const { collection } = useAuth();
  
  const [cardsByArtist, setCardsByArtist] = useState<ApiPokemonCard[]>([]);
  const [filteredCards, setFilteredCards] = useState<ApiPokemonCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedApiCard, setSelectedApiCard] = useState<ApiPokemonCard | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const artistName = decodeURIComponent(artistNameParam);

  const artistCompletion = useMemo(() => {
    if (cardsByArtist.length === 0) return { collected: 0, total: 0, percentage: 0 };
    const collectedCardIdentifiers = new Set<string>();
    collection.forEach(card => {
        if (card.artist === artistName && card.language === "English") { 
            collectedCardIdentifiers.add(`${card.name}-${card.cardNumber}`);
        }
    });
    const uniqueCollectedCount = collectedCardIdentifiers.size;
    const totalByThisArtist = cardsByArtist.length; 
    const percentage = totalByThisArtist > 0 ? parseFloat(((uniqueCollectedCount / totalByThisArtist) * 100).toFixed(1)) : 0;
    return { collected: uniqueCollectedCount, total: totalByThisArtist, percentage };
  }, [cardsByArtist, collection, artistName]);

  
  const fetchCardsByArtist = useCallback(async () => {
    if (!artistName) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/cards/by-artist/${encodeURIComponent(artistName)}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to fetch cards: ${response.statusText} (status: ${response.status})`);
      }
      
      let data: ApiPokemonCard[] = await response.json();
      data.sort((a, b) => {
        const dateA = new Date(a.set.releaseDate).getTime();
        const dateB = new Date(b.set.releaseDate).getTime();
        if(dateA === dateB) {
            const numA = parseInt(a.number.replace(/\D/g, ''), 10) || 0;
            const numB = parseInt(b.number.replace(/\D/g, ''), 10) || 0;
            return numA - numB;
        }
        return dateA - dateB;
      });

      setCardsByArtist(data);
      setFilteredCards(data);

    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred");
    } finally {
      setIsLoading(false);
    }
  }, [artistName]);


  useEffect(() => {
    fetchCardsByArtist();
  }, [fetchCardsByArtist]);

  useEffect(() => {
    const lowercasedFilter = searchTerm.toLowerCase();
    const filteredData = cardsByArtist.filter(card =>
      card.name.toLowerCase().includes(lowercasedFilter) ||
      card.number.toLowerCase().includes(lowercasedFilter) ||
      (card.rarity && card.rarity.toLowerCase().includes(lowercasedFilter)) ||
      card.set.name.toLowerCase().includes(lowercasedFilter)
    );
    setFilteredCards(filteredData);
  }, [searchTerm, cardsByArtist]);

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <AppHeader />
        <main className="flex-grow container mx-auto p-4 md:p-8 flex items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
           <p className="ml-4 text-lg text-muted-foreground">Loading artist's cards...</p>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <AppHeader />
      <main className="flex-grow container mx-auto p-4 md:p-8">
        <div className="p-4 md:p-6 bg-card rounded-lg shadow-xl mb-6">
            <CardHeader className="p-0">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex flex-col md:flex-row md:items-center md:gap-4">
                        <Paintbrush className="h-12 w-12 text-primary self-center md:self-auto mb-2 md:mb-0"/>
                        <div>
                            <CardTitle className="font-headline text-3xl md:text-4xl text-foreground text-center md:text-left capitalize">{artistName}</CardTitle>
                            <CardDescription className="text-md md:text-lg text-center md:text-left">All cards illustrated by this artist</CardDescription>
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
                        {cardsByArtist.length} cards illustrated
                    </div>
                     <div className="flex-1 min-w-[150px]">
                        <div className="flex justify-between items-baseline mb-1">
                            <h3 className="text-sm font-medium text-muted-foreground">
                                Artist Completion
                            </h3>
                            <p className="text-sm font-semibold text-primary">
                                {artistCompletion.collected} / {artistCompletion.total}
                            </p>
                        </div>
                        <Progress value={artistCompletion.percentage} className="h-2" />
                    </div>
                </div>
             </CardHeader>
        </div>
        
        {error && (
            <div className="text-center py-10 text-destructive">
            <ServerCrash className="h-16 w-16 mx-auto mb-4" />
            <p className="text-xl font-semibold">Could not load cards for {artistName}.</p>
            <p>{error}</p>
            </div>
        )}

        {!isLoading && !error && (
          <div className="pb-8">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 pt-4 px-4">
              {filteredCards.map(card => {
                  const isCollected = collection.some(
                      (collected) =>
                      collected.name === card.name &&
                      collected.set === card.set.name &&
                      collected.cardNumber === card.number &&
                      collected.language === "English" 
                  );
                  return (
                      <div
                        key={card.id}
                        onClick={() => {
                          setSelectedApiCard(card);
                          setIsDialogOpen(true);
                        }}
                        className={cn(
                          "relative aspect-[2.5/3.5] w-full cursor-pointer group rounded-lg",
                          "transform transition-all duration-200 ease-out",
                          "hover:scale-105 hover:-translate-y-1 hover:shadow-lg hover:z-10",
                           isCollected ? "ring-2 ring-green-500" : ""
                        )}
                      >
                        <Image 
                          src={card.images.small} 
                          alt={card.name} 
                          layout="fill" 
                          objectFit="contain" 
                          className={cn(
                            "bg-card shadow-md rounded-lg",
                            !isCollected && "saturate-[.1] group-hover:saturate-100 transition-all"
                          )}
                          data-ai-hint="pokemon card front"
                        />
                        <Badge className="absolute top-2 right-2 z-10 bg-black/60 text-white border-transparent">
                          #{card.number}
                        </Badge>
                      </div>
                  );
              })}
            </div>
            {filteredCards.length === 0 && (
              <div className="text-center py-10 text-muted-foreground">
                <Images className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg">No cards found for this artist.</p>
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

export default ArtistDetailPage;
