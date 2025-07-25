// src/app/sets/[setId]/page.tsx
"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams } from 'next/navigation';
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AddCardToCollectionDialog } from "@/components/AddCardToCollectionDialog";
import { useAuth } from "@/hooks/useAuth";
import type { PokemonCard as CollectionPokemonCard } from "@/types";
import { Loader2, ServerCrash, ArrowLeft, Images, Search, Info, CheckCircle, DollarSign, TrendingUp, CalendarDays, Hash, Palette, Paintbrush } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { format } from 'date-fns';

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

const SetDetailsPage = () => {
  const params = useParams();
  const setId = params.setId as string;
  const { collection } = useAuth();
  
  const [setDetails, setSetDetails] = useState<SetDetails | null>(null);
  const [cardsInSet, setCardsInSet] = useState<ApiPokemonCard[]>([]);
  const [filteredCards, setFilteredCards] = useState<ApiPokemonCard[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedApiCard, setSelectedApiCard] = useState<ApiPokemonCard | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  
  const { toast } = useToast();

  const [lastScrollY, setLastScrollY] = useState(0);
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);

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

  const fetchSetDetailsAndCards = useCallback(async () => {
    if (!setId) return;
    setIsLoading(true);
    setError(null);
    try {
      const setResponse = await fetch(`/api/sets/${setId}`);
      if (!setResponse.ok) {
        const errorData = await setResponse.json().catch(() => ({ message: 'Failed to parse error response' }));
        throw new Error(errorData.message || `Set with ID "${setId}" not found in database. It may not be synced yet.`);
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

      const cardsResponse = await fetch(`/api/cards/by-set/${setId}`);
      if (!cardsResponse.ok) {
           const errorData = await cardsResponse.json().catch(() => ({ message: 'Failed to parse error response' }));
           throw new Error(errorData.message || `Failed to fetch cards for set ${setId}`);
      }
      let allCards: ApiPokemonCard[] = await cardsResponse.json();

      if (allCards.length === 0) {
           const countResponse = await fetch('/api/cards-count');
           const countData = await countResponse.json();
           if (countData.count === 0) {
               toast({
                   variant: "destructive",
                   title: "No Cards in Database",
                   description: "Please sync cards from the Admin page to view set details.",
                   action: <ToastAction altText="Go to Admin" onClick={() => window.location.href = '/admin/sync'}>Go to Admin</ToastAction>,
               });
           }
      }

      allCards.sort((a, b) => {
        const numA = parseInt(a.number.replace(/\D/g, ''), 10) || 0;
        const numB = parseInt(b.number.replace(/\D/g, ''), 10) || 0;
        const suffixA = a.number.replace(/\d/g, '');
        const suffixB = b.number.replace(/\d/g, '');
        if (numA === numB) return suffixA.localeCompare(suffixB);
        return numA - numB;
      });

      setCardsInSet(allCards);
      setFilteredCards(allCards);

    } catch (err) {
      console.error(`Error fetching data for set ${setId} from database:`, err);
      setError(err instanceof Error ? err.message : "An unknown error occurred");
    } finally {
      setIsLoading(false);
    }
  }, [setId, toast]);

  useEffect(() => {
    fetchSetDetailsAndCards();
  }, [fetchSetDetailsAndCards]);

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
          <div className={cn(
            "p-4 md:p-6 bg-card rounded-lg shadow-xl mb-6 sticky top-[65px] md:top-[77px] z-40 transition-transform duration-300",
            !isHeaderVisible && "-translate-y-[200%]"
            )}>
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
                            <Card
                            key={card.id}
                            onClick={() => openDialogForCard(card)}
                            className={cn(
                                "p-2 cursor-pointer group flex flex-col relative bg-card",
                                "transform transition-all duration-200 ease-out",
                                "hover:scale-105 hover:-translate-y-1 hover:shadow-lg group-hover:z-10",
                                    isCollected && "border-2 border-primary/50"
                            )}
                        >
                            <div className={cn(
                                "relative aspect-[2.5/3.5] w-full rounded-md overflow-hidden"
                            )}>
                            <Image src={card.images.small} alt={card.name} layout="fill" objectFit="contain" data-ai-hint="pokemon card front"/>
                                {isCollected && (
                                <div className="absolute top-1 right-1 bg-primary text-primary-foreground rounded-full p-1">
                                    <CheckCircle className="h-3 w-3" />
                                </div>
                            )}
                            </div>
                            <div className="mt-2 text-center">
                                <p className="text-sm font-semibold truncate leading-tight">{card.name}</p>
                                <p className="text-xs text-muted-foreground">#{card.number} - {card.rarity}</p>
                            </div>
                        </Card>
                    );
                })}
                </div>
            {(!isLoading && !error && filteredCards.length === 0) && (
                <div className="text-center py-10 text-muted-foreground">
                    <Images className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg">{searchTerm ? "No cards found matching your search." : "No cards found in this set, or the database returned no data."}</p>
                </div>
            )}
            </div>
        )}
        
      </main>
      
      <Link href="/browse-sets" className="fixed bottom-6 left-6 z-50">
        <Button variant="secondary" size="icon" className="rounded-full h-14 w-14 shadow-lg border">
            <ArrowLeft className="h-6 w-6" />
            <span className="sr-only">Back to Sets</span>
        </Button>
      </Link>
      
      {selectedApiCard && (
        <AddCardToCollectionDialog
          isOpen={isDialogOpen}
          onClose={() => {
            setIsDialogOpen(false);
            setSelectedApiCard(null);
          }}
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

export default SetDetailsPage;
