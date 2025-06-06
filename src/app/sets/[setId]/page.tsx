
"use client";

import type { NextPage } from "next";
import { useEffect, useState, useCallback, use } from "react"; 
import Link from "next/link";
import Image from "next/image";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AddCardToCollectionDialog } from "@/components/AddCardToCollectionDialog";
import type { PokemonCard as CollectionPokemonCard } from "@/types";
import { Loader2, ServerCrash, ArrowLeft, Images, Search, Info, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input"; 
import { Progress } from "@/components/ui/progress";

export interface ApiPokemonCard {
  id: string;
  name: string;
  set: {
    id: string;
    name: string;
    series: string;
    logo?: string;
  };
  number: string;
  rarity?: string;
  images: {
    small: string;
    large: string;
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
}

const conditionOptions = ["Mint", "Near Mint", "Excellent", "Good", "Lightly Played", "Played", "Poor", "Damaged"];

const SetDetailsPage: NextPage<{ params: { setId: string } }> = ({ params: paramsFromProps }) => {
  const resolvedParams = use(paramsFromProps);
  const { setId } = resolvedParams;

  const [cardsInSet, setCardsInSet] = useState<ApiPokemonCard[]>([]);
  const [filteredCards, setFilteredCards] = useState<ApiPokemonCard[]>([]);
  const [setName, setSetName] = useState<string>("");
  const [setLogo, setSetLogo] = useState<string | undefined>(undefined);
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

  const fetchSetDetails = useCallback(async () => {
    if (!setId) return;
    setIsLoading(true);
    setError(null);
    try {
      const headers: HeadersInit = {};
      if (process.env.NEXT_PUBLIC_POKEMONTCG_API_KEY) {
        headers['X-Api-Key'] = process.env.NEXT_PUBLIC_POKEMONTCG_API_KEY;
      }

      const setDetailsResponse = await fetch(`https://api.pokemontcg.io/v2/sets/${setId}`, { headers });
      if (!setDetailsResponse.ok) {
        throw new Error(`Failed to fetch set details: ${setDetailsResponse.statusText}`);
      }
      const setData = await setDetailsResponse.json();
      setSetName(setData.data.name);
      setSetLogo(setData.data.images?.logo);

      let allCards: ApiPokemonCard[] = [];
      let page = 1;
      let hasMore = true;
      
      while(hasMore) {
        const response = await fetch(`https://api.pokemontcg.io/v2/cards?q=set.id:${setId}&page=${page}&pageSize=250&orderBy=number`, { headers });
        if (!response.ok) {
          throw new Error(`Failed to fetch cards for set ${setId}: ${response.statusText}`);
        }
        const data = await response.json();
        allCards = allCards.concat(data.data as ApiPokemonCard[]);
        page++;
        hasMore = data.page * data.pageSize < data.totalCount;
      }
      
      allCards.sort((a, b) => {
        const numA = parseInt(a.number.replace(/\D/g, ''), 10) || 0;
        const numB = parseInt(b.number.replace(/\D/g, ''), 10) || 0;
        const suffixA = a.number.replace(/\d/g, '');
        const suffixB = b.number.replace(/\d/g, '');

        if (numA === numB) {
            return suffixA.localeCompare(suffixB);
        }
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
    fetchSetDetails();
  }, [fetchSetDetails]);
  
  useEffect(() => {
    const lowercasedFilter = searchTerm.toLowerCase();
    const filteredData = cardsInSet.filter(card =>
      card.name.toLowerCase().includes(lowercasedFilter) ||
      card.number.toLowerCase().includes(lowercasedFilter) ||
      (card.rarity && card.rarity.toLowerCase().includes(lowercasedFilter))
    );
    setFilteredCards(filteredData);
  }, [searchTerm, cardsInSet]);


  const handleAddCardToCollection = (condition: string, valueForCollection: number, variant?: string) => {
    if (!selectedApiCard) return;

    const newCard: CollectionPokemonCard = {
      id: crypto.randomUUID(),
      name: selectedApiCard.name,
      set: selectedApiCard.set.name, // Use the set name from the API card for consistency
      cardNumber: selectedApiCard.number,
      rarity: selectedApiCard.rarity || "N/A",
      variant: variant,
      condition: condition,
      value: valueForCollection,
      imageUrl: selectedApiCard.images.large,
    };

    try {
      // Re-fetch from localStorage to ensure it's the latest
      const currentStoredCardsRaw = localStorage.getItem("pokemonCards");
      const currentStoredCards: CollectionPokemonCard[] = currentStoredCardsRaw ? JSON.parse(currentStoredCardsRaw) : [];
      
      const isDuplicate = currentStoredCards.some(
        item => item.name === newCard.name && 
                item.set === newCard.set && 
                item.cardNumber === newCard.cardNumber &&
                item.variant === newCard.variant && 
                item.condition === newCard.condition
      );

      if (isDuplicate) {
        toast({
          variant: "destructive",
          title: "Duplicate Card",
          description: `${newCard.name} ${newCard.variant ? '('+newCard.variant+')' : ''} (${newCard.condition}) is already in your collection.`,
        });
        setIsDialogOpen(false);
        return;
      }
      
      const updatedCards = [newCard, ...currentStoredCards];
      localStorage.setItem("pokemonCards", JSON.stringify(updatedCards));
      setCollectionCards(updatedCards); // Update local state for immediate UI update
      toast({
        title: "Card Added!",
        description: `${newCard.name} ${newCard.variant ? '('+newCard.variant+')' : ''} (${newCard.condition}) from ${newCard.set} has been added.`,
        className: "bg-secondary text-secondary-foreground"
      });
    } catch (e) {
      console.error("Failed to save card to localStorage", e);
      toast({
        variant: "destructive",
        title: "Storage Error",
        description: "Could not save card to your collection.",
      });
    }
    setIsDialogOpen(false);
  };

  const openDialogForCard = (card: ApiPokemonCard) => {
    setSelectedApiCard(card);
    setIsDialogOpen(true);
  };
  
  const setCompletion = (() => {
    if (!isClient || !setName || cardsInSet.length === 0) return { collected: 0, total: 0, percentage: 0 };
    const collectedInThisSet = collectionCards.filter(card => card.set === setName).length;
    const totalInThisSet = cardsInSet.length;
    const percentage = totalInThisSet > 0 ? (collectedInThisSet / totalInThisSet) * 100 : 0;
    return { collected: collectedInThisSet, total: totalInThisSet, percentage };
  })();

  if (!isClient && isLoading) { // Show simplified loading for SSR/initial load
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

        <Card className="shadow-xl">
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-2">
                <div>
                    {setLogo && (
                        <Image src={setLogo} alt={`${setName} logo`} width={100} height={40} style={{objectFit:"contain"}} className="mb-2" data-ai-hint="pokemon set logo"/>
                    )}
                    <CardTitle className="font-headline text-3xl text-foreground">{setName || `Set ${setId}`}</CardTitle>
                    <CardDescription>Browse cards from {setName || `set ${setId}`}. Click a card to add it to your collection.</CardDescription>
                </div>
                <div className="relative mt-4 md:mt-0 w-full md:w-1/3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                        type="text"
                        placeholder="Search cards..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                    />
                </div>
            </div>
            {!isLoading && cardsInSet.length > 0 && (
                 <div className="mt-4">
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium text-muted-foreground">Set Completion</span>
                        <span className="text-sm font-semibold text-foreground">
                            {setCompletion.collected} / {setCompletion.total} cards
                            {setCompletion.percentage === 100 && <CheckCircle className="inline-block ml-1 h-4 w-4 text-green-500" />}
                        </span>
                    </div>
                    <Progress value={setCompletion.percentage} className="h-2 [&>div]:bg-primary" />
                </div>
            )}
            <CardDescription className="mt-3 text-xs italic text-muted-foreground flex items-center gap-1">
                <Info size={14}/> Card values are market estimates from TCGPlayer via Pokémon TCG API and may vary.
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
              <ScrollArea className="h-[calc(100vh-30rem)] md:h-[calc(100vh-34rem)]"> 
                {filteredCards.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                    {filteredCards.map((card) => (
                        <Card 
                            key={card.id} 
                            onClick={() => openDialogForCard(card)}
                            className="p-2 cursor-pointer hover:shadow-lg hover:border-primary transition-all group flex flex-col"
                        >
                        <div className="relative aspect-[2.5/3.5] w-full rounded-md overflow-hidden mb-2">
                            <Image src={card.images.small} alt={card.name} layout="fill" objectFit="contain" data-ai-hint="pokemon card front"/>
                        </div>
                        <div className="text-center mt-auto">
                            <p className="text-sm font-semibold truncate group-hover:text-primary">{card.name}</p>
                            <p className="text-xs text-muted-foreground">#{card.number} - {card.rarity || "N/A"}</p>
                        </div>
                        </Card>
                    ))}
                    </div>
                ): (
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

    