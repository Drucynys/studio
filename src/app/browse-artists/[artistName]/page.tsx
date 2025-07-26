// src/app/browse-artists/[artistName]/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams } from 'next/navigation';
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AddCardToCollectionDialog } from "@/components/AddCardToCollectionDialog";
import { Loader2, ServerCrash, ArrowLeft, Images, Paintbrush } from "lucide-react";
import type { ApiPokemonCard } from "@/app/sets/[setId]/page";
import { cn } from "@/lib/utils";

const ArtistDetailPage = () => {
  const params = useParams();
  const artistNameParam = params.artistName as string;
  
  const [cardsByArtist, setCardsByArtist] = useState<ApiPokemonCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedApiCard, setSelectedApiCard] = useState<ApiPokemonCard | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const [lastScrollY, setLastScrollY] = useState(0);
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);

  const artistName = decodeURIComponent(artistNameParam);
  
  useEffect(() => {
    const scrollHandler = () => {
      const currentScrollY = window.scrollY;
      
      setLastScrollY(prevLastScrollY => {
        if (Math.abs(currentScrollY - prevLastScrollY) < 10) return prevLastScrollY;

        if (currentScrollY > prevLastScrollY && currentScrollY > 100) {
          setIsHeaderVisible(false); // scrolling down
        } else {
          setIsHeaderVisible(true); // scrolling up
        }
        
        return currentScrollY;
      });
    };

    window.addEventListener('scroll', scrollHandler, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', scrollHandler);
    };
  }, []);

  const fetchCardsByArtist = useCallback(async () => {
    if (!artistName) return;
    setIsLoading(true);
    setError(null);
    try {
      // Fetch from our new internal API endpoint
      const response = await fetch(`/api/cards/by-artist/${encodeURIComponent(artistName)}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to fetch cards: ${response.statusText} (status: ${response.status})`);
      }
      
      const data = await response.json();
      setCardsByArtist(data as ApiPokemonCard[]);

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
                <ServerCrash className="h-16 w-16 mx-auto mb-4" />
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
                          fill
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
      <Link href="/browse-sets?tab=artists" className="fixed bottom-6 left-6 z-50">
        <Button variant="secondary" size="icon" className="rounded-full h-14 w-14 shadow-lg border transition-colors hover:bg-primary hover:text-primary-foreground">
            <ArrowLeft className="h-6 w-6" />
            <span className="sr-only">Back to Browse</span>
        </Button>
      </Link>
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
