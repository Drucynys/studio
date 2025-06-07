
"use client";

import { useEffect, useState, useCallback, use, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AddCardToCollectionDialog } from "@/components/AddCardToCollectionDialog";
import type { PokemonCard as CollectionPokemonCard } from "@/types";
import { Loader2, ServerCrash, ArrowLeft, Images, Search, Info, CheckCircle, DollarSign, TrendingUp, CalendarDays, Hash, Palette } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
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
    releaseDate: string; // Added releaseDate to set for easier access
    printedTotal: number; // Added printedTotal
    total: number; // Added total for fallback
  };
  number: string;
  rarity?: string;
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

// Helper to get a default market price
const getDefaultMarketPrice = (card: ApiPokemonCard | null): { value: number, variant?: string } => {
  if (!card || !card.tcgplayer?.prices) return { value: 0 };
  const prices = card.tcgplayer.prices;
  const variantPriority = ['normal', 'holofoil', 'reverseHolofoil', '1stEditionNormal', '1stEditionHolofoil', 'unlimitedHolofoil', 'unlimitedNormal'];
  for (const variant of variantPriority) {
    const priceDetail = prices[variant as keyof typeof prices];
    if (priceDetail?.market && typeof priceDetail.market === 'number') {
      return { value: priceDetail.market, variant: variant };
    }
  }
  // Fallback to any available market price
  for (const key in prices) {
    if (Object.prototype.hasOwnProperty.call(prices, key)) {
      const priceDetail = prices[key as keyof typeof prices];
      if (priceDetail?.market && typeof priceDetail.market === 'number') {
        return { value: priceDetail.market, variant: key };
      }
    }
  }
  return { value: 0 };
};


const conditionOptions = ["Mint", "Near Mint", "Excellent", "Good", "Lightly Played", "Played", "Poor", "Damaged"];

interface SetDetails {
  id: string;
  name: string;
  logoUrl?: string;
  releaseDate: string;
  totalCards: number; // This is typically printedTotal from the API
  series: string;
}


const SetDetailsPage = ({ params: paramsFromProps }: { params: { setId: string } }) => {
  const resolvedParams = use(paramsFromProps);
  const { setId } = resolvedParams;

  const [setDetails, setSetDetails] = useState<SetDetails | null>(null);
  const [cardsInSet, setCardsInSet] = useState<ApiPokemonCard[]>([]);
  const [filteredCards, setFilteredCards] = useState<ApiPokemonCard[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedApiCard, setSelectedApiCard] = useState<ApiPokemonCard | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [collectionCards, setCollectionCards] = useState<CollectionPokemonCard[]>([]);
  const [isClient, setIsClient] = useState(false);

  const { toast } = useToast();

  useEffect(() => {
    setIsClient(true);
    const storedCards = localStorage.getItem("pokemonCards");
    if (storedCards) {
      try {
        const parsedCards = JSON.parse(storedCards) as CollectionPokemonCard[];
        if (Array.isArray(parsedCards)) {
          setCollectionCards(parsedCards);
        }
      } catch (e) {
        console.error("Failed to parse collection from localStorage", e);
      }
    }
  }, []);

  const fetchSetDetailsAndCards = useCallback(async () => {
    if (!setId) return;
    setIsLoading(true);
    setError(null);
    try {
      const headers: HeadersInit = {};
      if (process.env.NEXT_PUBLIC_POKEMONTCG_API_KEY) {
        headers['X-Api-Key'] = process.env.NEXT_PUBLIC_POKEMONTCG_API_KEY;
      }

      // Fetch set details
      const setDetailsResponse = await fetch(`https://api.pokemontcg.io/v2/sets/${setId}`, { headers });
      if (!setDetailsResponse.ok) {
        throw new Error(`Failed to fetch set details: ${setDetailsResponse.statusText} (status: ${setDetailsResponse.status})`);
      }
      const setData = await setDetailsResponse.json();
      setSetDetails({
        id: setData.data.id,
        name: setData.data.name,
        logoUrl: setData.data.images?.logo,
        releaseDate: setData.data.releaseDate,
        totalCards: setData.data.printedTotal || setData.data.total || 0,
        series: setData.data.series,
      });
      
      // Fetch all cards for the set (handles pagination)
      let allCards: ApiPokemonCard[] = [];
      let page = 1;
      let hasMore = true;
      while(hasMore) {
        const cardsResponse = await fetch(`https://api.pokemontcg.io/v2/cards?q=set.id:${setId}&page=${page}&pageSize=250&orderBy=number`, { headers });
        if (!cardsResponse.ok) {
          throw new Error(`Failed to fetch cards for set ${setId} (page ${page}): ${cardsResponse.statusText} (status: ${cardsResponse.status})`);
        }
        const cardsData = await cardsResponse.json();
        allCards = allCards.concat(cardsData.data as ApiPokemonCard[]);
        page++;
        hasMore = cardsData.page * cardsData.pageSize < cardsData.totalCount;
      }

      // Sort cards by number (alphanumerically)
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
      console.error(`Error fetching data for set ${setId}:`, err);
      setError(err instanceof Error ? err.message : "An unknown error occurred");
    } finally {
      setIsLoading(false);
    }
  }, [setId]);

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

  const { totalMarketValue, mostExpensiveCards } = useMemo(() => {
    if (cardsInSet.length === 0) return { totalMarketValue: 0, mostExpensiveCards: [] };
    
    let currentTotalValue = 0;
    const pricedCards = cardsInSet.map(card => {
      const { value } = getDefaultMarketPrice(card);
      currentTotalValue += value;
      return { ...card, marketPrice: value };
    }).sort((a, b) => b.marketPrice - a.marketPrice);
    
    return {
      totalMarketValue: currentTotalValue,
      mostExpensiveCards: pricedCards.slice(0, 3),
    };
  }, [cardsInSet]);


  const handleAddCardToCollection = (condition: string, valueForCollection: number, variant?: string, quantity: number = 1) => {
    if (!selectedApiCard) return;

    const newCard: CollectionPokemonCard = {
      id: crypto.randomUUID(), 
      name: selectedApiCard.name,
      set: selectedApiCard.set.name,
      cardNumber: selectedApiCard.number,
      rarity: selectedApiCard.rarity || "N/A",
      variant: variant,
      condition: condition,
      value: valueForCollection,
      imageUrl: selectedApiCard.images.large,
      quantity: quantity,
      language: "English", // Default to English for this page
    };

    try {
      const currentStoredCardsRaw = localStorage.getItem("pokemonCards");
      let currentStoredCards: CollectionPokemonCard[] = currentStoredCardsRaw ? JSON.parse(currentStoredCardsRaw) : [];
      const existingCardIndex = currentStoredCards.findIndex(
        item => item.name === newCard.name &&
                item.set === newCard.set &&
                item.cardNumber === newCard.cardNumber &&
                item.variant === newCard.variant &&
                item.condition === newCard.condition &&
                item.language === newCard.language
      );
      if (existingCardIndex > -1) {
         currentStoredCards[existingCardIndex].quantity += newCard.quantity;
         toast({
          title: "Card Quantity Updated!",
          description: `Quantity for ${newCard.name} ${newCard.variant ? '('+formatVariantKey(newCard.variant)+')' : ''} (${newCard.condition}) increased.`,
          className: "bg-secondary text-secondary-foreground"
        });
      } else {
        currentStoredCards = [newCard, ...currentStoredCards]; 
         toast({
          title: "Card Added!",
          description: `${newCard.name} ${newCard.variant ? '('+formatVariantKey(newCard.variant)+')' : ''} (${newCard.condition}) x${newCard.quantity} from ${newCard.set} has been added.`,
          className: "bg-secondary text-secondary-foreground"
        });
      }
      localStorage.setItem("pokemonCards", JSON.stringify(currentStoredCards));
      setCollectionCards(currentStoredCards);
      window.dispatchEvent(new StorageEvent('storage', { key: 'pokemonCards', newValue: localStorage.getItem("pokemonCards") }));
    } catch (e) {
      console.error("Failed to save card to localStorage", e);
      toast({ variant: "destructive", title: "Storage Error", description: "Could not save card to your collection." });
    }
    setIsDialogOpen(false);
  };

  const openDialogForCard = (card: ApiPokemonCard) => {
    setSelectedApiCard(card);
    setIsDialogOpen(true);
  };

  const setCompletion = useMemo(() => {
    if (!isClient || !setDetails?.name || cardsInSet.length === 0) return { collected: 0, total: 0, percentage: 0 };
    const collectedCardIdentifiersInSet = new Set<string>();
    collectionCards.forEach(card => {
        if (card.set === setDetails.name && card.language === "English") { // Assuming English sets for this page
            collectedCardIdentifiersInSet.add(`${card.name}-${card.cardNumber}`);
        }
    });
    const uniqueCollectedCount = collectedCardIdentifiersInSet.size;
    const totalInThisSet = cardsInSet.length; // Based on unique API cards for the set
    const percentage = totalInThisSet > 0 ? parseFloat(((uniqueCollectedCount / totalInThisSet) * 100).toFixed(1)) : 0;
    return { collected: uniqueCollectedCount, total: totalInThisSet, percentage };
  }, [isClient, setDetails, cardsInSet, collectionCards]);


  useEffect(() => {
    if (!isClient) return;
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === "pokemonCards" && event.newValue) {
        try {
          const updatedCards = JSON.parse(event.newValue) as CollectionPokemonCard[];
           if (Array.isArray(updatedCards)) {
             setCollectionCards(updatedCards);
           }
        } catch (error) { console.error("Error processing storage update:", error); }
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [isClient]);

  const formatVariantKey = (key: string): string => {
    if (!key) return "N/A";
    return key.replace(/([A-Z0-9])/g, " $1").replace(/^./, (str) => str.toUpperCase()).trim();
  };

  if (!isClient && isLoading) {
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
        <Link href="/browse-sets" passHref legacyBehavior>
          <Button variant="outline" className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Sets
          </Button>
        </Link>

        {setDetails && (
          <header className="mb-8">
            <div className="flex flex-col md:flex-row md:items-center md:gap-4">
              {setDetails.logoUrl && (
                <Image src={setDetails.logoUrl} alt={`${setDetails.name} logo`} width={120} height={50} style={{objectFit:"contain"}} className="mb-2 md:mb-0" data-ai-hint="pokemon set logo"/>
              )}
              <div>
                <h1 className="font-headline text-4xl text-foreground">{setDetails.name}</h1>
                <p className="text-muted-foreground text-lg">{setDetails.series} Series</p>
              </div>
            </div>
          </header>
        )}

        {!isLoading && setDetails && cardsInSet.length > 0 && (
            <section id="set-stats" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg font-semibold text-primary flex items-center gap-2"><Hash size={20}/>Set Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                        <div>
                            <p className="font-medium text-muted-foreground">Printed Cards</p>
                            <p className="font-semibold text-lg">{setDetails.totalCards}</p>
                        </div>
                        <div>
                            <p className="font-medium text-muted-foreground">Release Date</p>
                            <p className="font-semibold text-lg">{format(new Date(setDetails.releaseDate), "MMMM d, yyyy")}</p>
                        </div>
                        <div>
                            <p className="font-medium text-muted-foreground">Total Market Value (USD)</p>
                            <p className="font-semibold text-lg">${totalMarketValue.toFixed(2)}</p>
                        </div>
                        <div className="pt-1">
                            <p className="font-medium text-muted-foreground">Set Completion (Unique Cards)</p>
                             <div className="flex items-center justify-between mt-0.5">
                                <p className="font-semibold text-base">
                                    {setCompletion.collected} / {setCompletion.total}
                                </p>
                                <p className="font-semibold text-base">
                                    {setCompletion.percentage}%
                                    {setCompletion.percentage >= 99.9 && <CheckCircle className="inline-block ml-1 h-4 w-4 text-green-500 align-text-bottom" />}
                                </p>
                            </div>
                            <Progress value={setCompletion.percentage} className="h-2 [&>div]:bg-primary mt-1" />
                        </div>
                    </CardContent>
                </Card>
                 <Card className="sm:col-span-1 xl:col-span-1">
                    <CardHeader>
                        <CardTitle className="text-lg font-semibold text-primary flex items-center gap-2"><TrendingUp size={20}/>Most Expensive</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 pt-3">
                        {mostExpensiveCards.length > 0 ? (
                            mostExpensiveCards.map((card, index) => (
                            <div key={card.id} className="flex items-center gap-3">
                                <div className="relative w-10 h-14 flex-shrink-0 rounded overflow-hidden shadow-sm" data-ai-hint="pokemon card front small">
                                <Image src={card.images.small} alt={card.name} layout="fill" objectFit="contain" />
                                </div>
                                <div className="flex-grow">
                                <p className="text-xs font-semibold truncate" title={card.name}>{index + 1}. {card.name}</p>
                                <p className="text-xs text-muted-foreground">${getDefaultMarketPrice(card).value.toFixed(2)}</p>
                                </div>
                            </div>
                            ))
                        ) : (
                            <p className="text-sm text-muted-foreground text-center py-4">No pricing data available.</p>
                        )}
                    </CardContent>
                </Card>
                <Card className="bg-muted/30 border-dashed">
                    <CardHeader><CardTitle className="text-lg font-semibold text-muted-foreground/70 flex items-center gap-2"><Palette size={20}/>Distribution by Kind</CardTitle></CardHeader>
                    <CardContent><p className="text-sm text-muted-foreground/70 text-center py-4">Chart coming soon!</p></CardContent>
                </Card>
                <Card className="bg-muted/30 border-dashed">
                    <CardHeader><CardTitle className="text-lg font-semibold text-muted-foreground/70">Rarity Distribution</CardTitle></CardHeader>
                    <CardContent><p className="text-sm text-muted-foreground/70 text-center py-4">Chart coming soon!</p></CardContent>
                </Card>
            </section>
        )}

        <Card className="shadow-xl">
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-2">
                <div>
                    <CardTitle className="font-headline text-2xl text-foreground">Cards in {setDetails?.name || `Set ${setId}`}</CardTitle>
                    <CardDescription>Browse cards from {setDetails?.name || `set ${setId}`}. Click a card to add it to your collection.</CardDescription>
                </div>
                <div className="relative mt-4 md:mt-0 w-full md:w-1/3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                        type="text"
                        placeholder="Search cards in set..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                    />
                </div>
            </div>
            {/* This is the overall set completion for the main card list view, distinct from the one in the stats card */}
            {!isLoading && cardsInSet.length > 0 && (
                 <div className="mt-4">
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium text-muted-foreground">Collection Progress for this Set (Unique Cards)</span>
                        <span className="text-sm font-semibold text-foreground">
                            {setCompletion.collected} / {setCompletion.total} cards
                            {setCompletion.percentage >= 99.9 && <CheckCircle className="inline-block ml-1 h-4 w-4 text-green-500" />}
                        </span>
                    </div>
                    <Progress value={setCompletion.percentage} className="h-2 [&>div]:bg-primary" />
                </div>
            )}
            <CardDescription className="mt-3 text-xs italic text-muted-foreground flex items-center gap-1">
                <Info size={14}/> Card values are market estimates from TCGPlayer via Pokémon TCG API and may vary. Prices are in USD.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading && (
              <div className="flex justify-center items-center py-10">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="ml-4 text-lg text-muted-foreground">Loading cards...</p>
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
              <ScrollArea className="h-[calc(100vh-42rem)] md:h-[calc(100vh-40rem)]">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 pt-4 pb-24 px-4">
                    {filteredCards.map((card) => {
                        const isCollected = collectionCards.some(
                            (collected) =>
                            collected.name === card.name &&
                            collected.set === card.set.name &&
                            collected.cardNumber === card.number &&
                            collected.language === "English" // Assuming English sets for this page
                        );
                        return (
                            <Card
                                key={card.id}
                                onClick={() => openDialogForCard(card)}
                                className={cn(
                                    "p-2 cursor-pointer group flex flex-col relative bg-card",
                                    "transform transition-all duration-200 ease-out",
                                    "hover:scale-105 hover:-translate-y-1 hover:shadow-lg hover:border-primary group-hover:z-10"
                                )}
                            >
                              <div className={cn(
                                  "relative aspect-[2.5/3.5] w-full rounded-md overflow-hidden mb-2 group-hover:grayscale-0",
                                  !isCollected && "grayscale"
                              )}>
                                  <Image src={card.images.small} alt={card.name} layout="fill" objectFit="contain" data-ai-hint="pokemon card front"/>
                              </div>
                              <div className="text-center mt-auto">
                                  <p className="text-sm font-semibold truncate group-hover:text-primary">{card.name}</p>
                                  <p className="text-xs text-muted-foreground">#{card.number} - {card.rarity || "N/A"}</p>
                              </div>
                            </Card>
                        );
                    })}
                    </div>
                {(!isLoading && !error && filteredCards.length === 0) && (
                    <div className="text-center py-10 text-muted-foreground">
                        <Images className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p className="text-lg">{searchTerm ? "No cards found matching your search." : "No cards found in this set, or the API returned no data."}</p>
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
          onClose={() => {
            setIsDialogOpen(false);
            setSelectedApiCard(null);
          }}
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

export default SetDetailsPage;


    
