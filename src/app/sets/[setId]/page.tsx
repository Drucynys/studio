// src/app/sets/[setId]/page.tsx
"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Image from "next/image";
import { useParams, useRouter } from 'next/navigation';
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AddCardToCollectionDialog } from "@/components/AddCardToCollectionDialog";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, ServerCrash, ArrowLeft, Images, Search, CalendarDays, Hash } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { format } from 'date-fns';
import { Badge } from "@/components/ui/badge";

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
    large:string;
  };
  tcgplayer?: {
    prices?: {
      [key: string]: {
        market?: number | null;
        low?: number | null;
        mid?: number | null;
        high?: number | null;
      };
    };
    url?: string;
  };
  supertypes?: string[];
  types?: string[];
}

interface SetDetails {
  id: string;
  name: string;
  logoUrl?: string;
  releaseDate: string;
  totalCards: number; 
  series: string;
}

const CARDS_PER_PAGE = 50;

const SetDetailsPage = () => {
  const params = useParams();
  const router = useRouter();
  const setId = params.setId as string;
  const { collection } = useAuth();
  
  const [setDetails, setSetDetails] = useState<SetDetails | null>(null);
  const [cardsInSet, setCardsInSet] = useState<ApiPokemonCard[]>([]);
  const [filteredCards, setFilteredCards] = useState<ApiPokemonCard[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [lastLoadedNumber, setLastLoadedNumber] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [selectedApiCard, setSelectedApiCard] = useState<ApiPokemonCard | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  
  const { toast } = useToast();

  const fetchSetDetails = useCallback(async () => {
      try {
        const setResponse = await fetch(`/api/sets/${setId}`);
        if (!setResponse.ok) {
            const errorData = await setResponse.json().catch(() => ({}));
            throw new Error(errorData.message || `Set with ID "${setId}" not found in database.`);
        }
        const setInfo = await setResponse.json();
        setSetDetails({
            id: setInfo.id,
            name: setInfo.name,
            logoUrl: setInfo.images?.logo,
            releaseDate: setInfo.releaseDate,
            totalCards: setInfo.printedTotal || setInfo.total || 0,
            series: setInfo.series,
        });
      } catch (err: any) {
        setError(err.message);
      }
  }, [setId]);

  const fetchCards = useCallback(async (loadMore = false) => {
    if (!setId) return;

    if (loadMore) {
        setIsLoadingMore(true);
    } else {
        setIsLoading(true);
        setCardsInSet([]);
    }
    setError(null);

    try {
        const params = new URLSearchParams({ limit: String(CARDS_PER_PAGE) });
        if (loadMore && lastLoadedNumber) {
            params.set('startAfterNumber', lastLoadedNumber);
        }

        const cardsResponse = await fetch(`/api/cards/by-set/${setId}?${params.toString()}`);
        if (!cardsResponse.ok) {
            const errorData = await cardsResponse.json().catch(() => ({}));
            throw new Error(errorData.message || `Failed to fetch cards for set ${setId}`);
        }
        
        let newCards: ApiPokemonCard[] = await cardsResponse.json();

        setCardsInSet(prev => loadMore ? [...prev, ...newCards] : newCards);
        setHasMore(newCards.length === CARDS_PER_PAGE);

        if (newCards.length > 0) {
            setLastLoadedNumber(newCards[newCards.length - 1].number);
        }

    } catch (err: any) {
        setError(err.message);
    } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
    }
  }, [setId, lastLoadedNumber]);

  useEffect(() => {
    fetchSetDetails();
    fetchCards(false);
  }, [fetchSetDetails, fetchCards]);

  useEffect(() => {
    const lowercasedFilter = searchTerm.toLowerCase();
    const filteredData = cardsInSet.filter(card =>
      card.name.toLowerCase().includes(lowercasedFilter) ||
      card.number.toLowerCase().includes(lowercasedFilter) ||
      (card.rarity && card.rarity.toLowerCase().includes(lowercasedFilter))
    );
    setFilteredCards(filteredData);
  }, [searchTerm, cardsInSet]);

  const openDialogForCard = (card: ApiPokemonCard) => {
    setSelectedApiCard(card);
    setIsDialogOpen(true);
  };

  const setCompletion = useMemo(() => {
    if (!setDetails?.name || cardsInSet.length === 0) return { collected: 0, total: 0, percentage: 0 };
    const collectedCardIdentifiersInSet = new Set<string>();
    collection.forEach(card => {
        if (card.set === setDetails.name && card.language === "English") { 
            collectedCardIdentifiersInSet.add(`${card.name}-${card.cardNumber}`);
        }
    });
    const uniqueCollectedCount = collectedCardIdentifiersInSet.size;
    const totalInThisSet = cardsInSet.length; 
    const percentage = totalInThisSet > 0 ? parseFloat(((uniqueCollectedCount / totalInThisSet) * 100).toFixed(1)) : 0;
    return { collected: uniqueCollectedCount, total: totalInThisSet, percentage };
  }, [setDetails, cardsInSet, collection]);

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <AppHeader />
        <main className="flex-grow container mx-auto p-4 md:p-8 flex items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
           <p className="ml-4 text-lg text-muted-foreground">Loading set details...</p>
        </main>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <AppHeader />
      <main className="flex-grow container mx-auto p-4 md:p-8">
        {setDetails && (
          <div className="p-4 md:p-6 bg-card rounded-lg shadow-xl mb-6">
             <CardHeader className="p-0">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex flex-col md:flex-row md:items-center md:gap-4">
                        {setDetails.logoUrl && (
                            <Image src={setDetails.logoUrl} alt={`${setDetails.name} logo`} width={120} height={50} style={{objectFit:"contain"}} className="mb-2 md:mb-0 self-center md:self-auto" data-ai-hint="pokemon set logo"/>
                        )}
                        <div>
                            <CardTitle className="font-headline text-3xl md:text-4xl text-foreground text-center md:text-left">{setDetails.name}</CardTitle>
                            <CardDescription className="text-md md:text-lg text-center md:text-left">{setDetails.series} Series</CardDescription>
                        </div>
                    </div>
                    <div className="relative w-full md:w-1/3 lg:w-1/4 mt-4 md:mt-0">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input
                            type="text"
                            placeholder="Search cards in set..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 w-full"
                        />
                    </div>
                </div>
                 <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-y-4 gap-x-8 pt-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CalendarDays className="h-4 w-4 text-primary"/>
                        Released: {format(new Date(setDetails.releaseDate), "MMMM d, yyyy")}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Hash className="h-4 w-4 text-primary"/>
                        {setDetails.totalCards} cards
                    </div>
                     <div className="flex-1 min-w-[150px]">
                        <div className="flex justify-between items-baseline mb-1">
                            <h3 className="text-sm font-medium text-muted-foreground">
                                Set Completion
                            </h3>
                            <p className="text-sm font-semibold text-primary">
                                {setCompletion.collected} / {setCompletion.total}
                            </p>
                        </div>
                        <Progress value={setCompletion.percentage} className="h-2" />
                    </div>
                </div>
             </CardHeader>
          </div>
        )}
        
        {error && (
            <div className="flex flex-col items-center justify-center py-10 text-destructive">
            <ServerCrash className="h-16 w-16 mb-4" />
            <p className="text-xl font-semibold">Oops! Something went wrong.</p>
            <p className="text-center">Could not load cards for this set: {error}.<br />Please try again later or check the set ID.</p>
            </div>
        )}
        {!isLoading && !error && (
            <div className="pb-8">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 pt-4 px-4">
                {filteredCards.map((card) => {
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
                          onClick={() => openDialogForCard(card)}
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
            {(!isLoading && !error && filteredCards.length === 0) && (
                <div className="text-center py-10 text-muted-foreground">
                    <Images className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg">{searchTerm ? "No cards found matching your search." : "No cards found in this set, or the database returned no data."}</p>
                </div>
            )}
             {hasMore && !searchTerm && (
              <div className="flex justify-center mt-8">
                <Button onClick={() => fetchCards(true)} disabled={isLoadingMore}>
                  {isLoadingMore ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Loading...</> : 'Load More Cards'}
                </Button>
              </div>
            )}
            </div>
        )}
        
      </main>
      
      <Button variant="secondary" size="icon" className="fixed bottom-6 left-6 rounded-full h-14 w-14 shadow-lg border transition-colors hover:bg-primary hover:text-primary-foreground z-50" onClick={() => router.back()}>
        <ArrowLeft className="h-6 w-6" />
        <span className="sr-only">Back to Sets</span>
      </Button>
      
      {selectedApiCard && (
        <AddCardToCollectionDialog
          isOpen={isDialogOpen}
          onClose={() => {
            setIsDialogOpen(false);
            setSelectedApiCard(null);
          }}
          cardName={selectedApiCard.name}
          initialCardImageUrl={selectedApiCard.images.large}
          pokemonTcgApiCard={selectedApiCard}
        />
      )}
       <footer className="text-center py-4 text-sm text-muted-foreground border-t border-border mt-auto">
        PokéTRKR &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
};

export default SetDetailsPage;
