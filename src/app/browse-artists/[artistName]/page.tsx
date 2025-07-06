// src/app/browse-artists/[artistName]/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AddCardToCollectionDialog } from "@/components/AddCardToCollectionDialog";
import { Loader2, ServerCrash, ArrowLeft, Images, Paintbrush } from "lucide-react";
import type { ApiPokemonCard } from "@/app/sets/[setId]/page";

const conditionOptions = ["Mint", "Near Mint", "Excellent", "Good", "Lightly Played", "Played", "Poor", "Damaged"];

interface ArtistDetailPageProps {
  params: { artistName: string };
}

const ArtistDetailPage = ({ params }: ArtistDetailPageProps) => {
  const { artistName: artistNameParam } = params;
  
  const [cardsByArtist, setCardsByArtist] = useState<ApiPokemonCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedApiCard, setSelectedApiCard] = useState<ApiPokemonCard | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const artistName = decodeURIComponent(artistNameParam);
  const fetchCardsByArtist = useCallback(async () => {
    if (!artistName) return;
    setIsLoading(true);
    setError(null);
    try {
      const headers: HeadersInit = {};
      if (process.env.NEXT_PUBLIC_POKEMONTCG_API_KEY) {
        headers['X-Api-Key'] = process.env.NEXT_PUBLIC_POKEMONTCG_API_KEY;
      }
      
      let allCards: ApiPokemonCard[] = [];
      let page = 1;
      let hasMore = true;

      while(hasMore) {
        const response = await fetch(`https://api.pokemontcg.io/v2/cards?q=artist:"${artistName}"&page=${page}&pageSize=250&orderBy=set.releaseDate,number`, { headers });
        if (!response.ok) {
          throw new Error(`Failed to fetch cards: ${response.statusText} (status: ${response.status})`);
        }
        const data = await response.json();
        allCards = allCards.concat(data.data as ApiPokemonCard[]);
        page++;
        hasMore = data.page * data.pageSize < data.totalCount;
      }

      setCardsByArtist(allCards);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred");
    } finally {
      setIsLoading(false);
    }
  }, [artistName]);

  useEffect(() => {
    fetchCardsByArtist();
  }, [fetchCardsByArtist]);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <AppHeader />
      <main className="flex-grow container mx-auto p-4 md:p-8">
        <Link href="/browse-sets?tab=artists">
          <Button variant="outline" className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Browse
          </Button>
        </Link>
        <Card className="shadow-xl">
          <CardHeader>
            <div className="flex items-center gap-4">
              <div>
                <CardTitle className="font-headline text-3xl text-foreground capitalize flex items-center gap-2">
                  <Paintbrush className="h-8 w-8 text-primary"/>
                  {artistName}
                </CardTitle>
                <CardDescription>All TCG cards illustrated by this artist</CardDescription>
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
                <p className="text-xl font-semibold">Could not load cards for {artistName}.</p>
                <p>{error}</p>
              </div>
            )}
            {!isLoading && !error && (
              <ScrollArea className="h-[calc(100vh-28rem)]">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 pt-4 pb-24 px-4">
                  {cardsByArtist.map(card => (
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
                {cardsByArtist.length === 0 && (
                  <div className="text-center py-10 text-muted-foreground">
                    <Images className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg">No cards found for this artist.</p>
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
        />
      )}
      <footer className="text-center py-4 text-sm text-muted-foreground border-t border-border mt-auto">
        Pokédex Tracker &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
};

export default ArtistDetailPage;
