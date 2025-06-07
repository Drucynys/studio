
"use client";

import { useEffect, useState, useCallback, use } from "react"; 
import Link from "next/link";
import Image from "next/image";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AddCardToCollectionDialog } from "@/components/AddCardToCollectionDialog";
import type { PokemonCard as CollectionPokemonCard } from "@/types";
import { Loader2, ArrowLeft, ShieldAlert, Images, ServerCrash, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { allPokemonData, type PokemonPokedexEntry } from "../pokedexData";
import type { ApiPokemonCard } from "@/app/sets/[setId]/page";
import { cn } from "@/lib/utils";

const conditionOptions = ["Mint", "Near Mint", "Excellent", "Good", "Lightly Played", "Played", "Poor", "Damaged"];

interface PokemonDetailPageProps {
  params: { pokemonName: string };
}

const PokemonDetailPage = ({ params }: PokemonDetailPageProps) => {
  const resolvedParams = use(params); 
  const rawPokemonNameFromParams = resolvedParams.pokemonName; 

  const [pokemonName, setPokemonName] = useState<string>("");
  const [initializationError, setInitializationError] = useState<string | null>(null);

  const [pokemonDetails, setPokemonDetails] = useState<PokemonPokedexEntry | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(true); 
  const [errorDetails, setErrorDetails] = useState<string | null>(null);

  const [pokemonTcgCards, setPokemonTcgCards] = useState<ApiPokemonCard[]>([]);
  const [isLoadingCards, setIsLoadingCards] = useState(false);
  const [errorCards, setErrorCards] = useState<string | null>(null);

  const [selectedApiCard, setSelectedApiCard] = useState<ApiPokemonCard | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
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

  useEffect(() => {
    setIsLoadingDetails(true); 
    if (rawPokemonNameFromParams) {
      try {
        const decodedName = decodeURIComponent(rawPokemonNameFromParams).toLowerCase();
        setPokemonName(decodedName);
        setInitializationError(null);
        setErrorDetails(null); 
      } catch (e) {
        console.error("Error decoding pokemonName:", e);
        setInitializationError("Invalid Pokémon name in URL format.");
        setErrorDetails("Invalid Pokémon name in URL format.");
        setPokemonName(""); 
        setIsLoadingDetails(false);
      }
    } else {
      setInitializationError("Pokémon name missing from URL.");
      setErrorDetails("Pokémon name missing from URL.");
      setPokemonName("");
      setIsLoadingDetails(false);
    }
  }, [rawPokemonNameFromParams]);

  useEffect(() => {
    if (initializationError) {
      setIsLoadingDetails(false);
      return;
    }
    if (pokemonName) {
      setIsLoadingDetails(true); 
      const foundPokemon = allPokemonData.find(p => p.name.toLowerCase() === pokemonName);
      if (foundPokemon) {
        setPokemonDetails(foundPokemon);
      } else {
        setErrorDetails(`Pokémon "${pokemonName}" not found in our Pokédex data.`);
        setPokemonDetails(null);
      }
      setIsLoadingDetails(false);
    } else if (!rawPokemonNameFromParams) {
        setIsLoadingDetails(false);
    }
  }, [pokemonName, initializationError, rawPokemonNameFromParams]);


  const fetchPokemonTcgCards = useCallback(async () => {
    if (!pokemonDetails?.name) return;

    setIsLoadingCards(true);
    setErrorCards(null);
    try {
      const headers: HeadersInit = {};
      if (process.env.NEXT_PUBLIC_POKEMONTCG_API_KEY) {
        headers['X-Api-Key'] = process.env.NEXT_PUBLIC_POKEMONTCG_API_KEY;
      }

      const response = await fetch(`https://api.pokemontcg.io/v2/cards?q=name:"${pokemonDetails.name}"&orderBy=set.releaseDate,number&pageSize=250`, { headers });
      if (!response.ok) {
        throw new Error(`Failed to fetch TCG cards for ${pokemonDetails.name}: ${response.statusText}`);
      }
      const data = await response.json();
      const sortedCards = (data.data as ApiPokemonCard[]).sort((a, b) => {
        const setDateA = a.set?.releaseDate ? new Date(a.set.releaseDate).getTime() : 0;
        const setDateB = b.set?.releaseDate ? new Date(b.set.releaseDate).getTime() : 0;
        if (setDateA !== setDateB) return setDateB - setDateA;

        const numA = parseInt(a.number.replace(/\D/g, ''), 10) || 0;
        const numB = parseInt(b.number.replace(/\D/g, ''), 10) || 0;
        const suffixA = a.number.replace(/\d/g, '');
        const suffixB = b.number.replace(/\d/g, '');
        if (numA === numB) return suffixA.localeCompare(suffixB);
        return numA - numB;
      });

      setPokemonTcgCards(sortedCards);
    } catch (err) {
      console.error(`Error fetching TCG cards for ${pokemonDetails.name}:`, err);
      setErrorCards(err instanceof Error ? err.message : "An unknown error occurred while fetching cards.");
    } finally {
      setIsLoadingCards(false);
    }
  }, [pokemonDetails?.name]);

  useEffect(() => {
    if (pokemonDetails?.name && !initializationError) {
      fetchPokemonTcgCards();
    }
  }, [pokemonDetails, fetchPokemonTcgCards, initializationError]);


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
    };
    try {
      const currentStoredCardsRaw = localStorage.getItem("pokemonCards");
      let currentStoredCards: CollectionPokemonCard[] = currentStoredCardsRaw ? JSON.parse(currentStoredCardsRaw) : [];
      const existingCardIndex = currentStoredCards.findIndex(
        item => item.name === newCard.name &&
                item.set === newCard.set &&
                item.cardNumber === newCard.cardNumber &&
                item.variant === newCard.variant &&
                item.condition === newCard.condition
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

  const formatVariantKey = (key: string): string => {
    if (!key) return "N/A";
    return key.replace(/([A-Z0-9])/g, " $1").replace(/^./, (str) => str.toUpperCase()).trim();
  };

  useEffect(() => {
    if (!isClient) return;
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === "pokemonCards" && event.newValue) {
        try {
          const updatedCards = JSON.parse(event.newValue) as CollectionPokemonCard[];
           if (Array.isArray(updatedCards)) {
             setCollectionCards(updatedCards);
           }
        } catch (error) {
          console.error("Error processing storage update:", error);
        }
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [isClient]);


  if (!isClient || (isLoadingDetails && !initializationError && !errorDetails && !pokemonDetails)) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <AppHeader />
        <main className="flex-grow container mx-auto p-4 md:p-8 flex items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="ml-4 text-lg text-muted-foreground">Loading Pokémon details...</p>
        </main>
      </div>
    );
  }

  const displayNameToShow = pokemonDetails ? pokemonDetails.name : (pokemonName || "Selected Pokémon");

  if (initializationError || (errorDetails && !pokemonDetails)) {
     return (
      <div className="flex flex-col min-h-screen bg-background">
        <AppHeader />
        <main className="flex-grow container mx-auto p-4 md:p-8">
            <Link href="/pokedex" passHref legacyBehavior>
              <Button variant="outline" className="mb-6">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Pokédex
              </Button>
            </Link>
            <Card className="shadow-xl border-destructive">
                <CardHeader>
                <CardTitle className="font-headline text-3xl text-destructive flex items-center gap-2">
                    <ShieldAlert className="h-8 w-8" /> Error
                </CardTitle>
                </CardHeader>
                <CardContent className="text-center py-8">
                <p className="text-lg text-destructive mb-2">{initializationError || errorDetails}</p>
                <p className="text-muted-foreground">
                    Please check the URL or try again later.
                </p>
                </CardContent>
            </Card>
        </main>
      </div>
    );
  }


  return (
    <div className="flex flex-col min-h-screen bg-background">
      <AppHeader />
      <main className="flex-grow container mx-auto p-4 md:p-8">
        <Link href="/pokedex" passHref legacyBehavior>
          <Button variant="outline" className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Pokédex
          </Button>
        </Link>

        {pokemonDetails && (
           <Card className="shadow-xl mb-8">
            <CardHeader>
                 <div className="flex flex-col md:flex-row md:items-center gap-4">
                    {pokemonDetails.spriteUrl && (
                        <div className="relative w-32 h-32 md:w-40 md:h-40 bg-muted/30 rounded-lg p-2 flex items-center justify-center shadow-inner" data-ai-hint="pokemon sprite large">
                            <Image src={pokemonDetails.spriteUrl} alt={displayNameToShow} layout="fill" objectFit="contain" />
                        </div>
                    )}
                    <div>
                        <CardTitle className="font-headline text-4xl text-foreground">
                            {displayNameToShow}
                        </CardTitle>
                        <CardDescription className="text-lg text-muted-foreground">
                            National Pokédex #{pokemonDetails.id.toString().padStart(3, '0')} - {pokemonDetails.region} Region
                        </CardDescription>
                    </div>
                 </div>
            </CardHeader>
          </Card>
        )}

        {/* TCG Cards Section - only render if pokemonDetails are available */}
        {pokemonDetails && (
          <section id="pokemon-tcg-cards">
            <h2 className="text-2xl font-semibold text-primary mb-4 flex items-center gap-2">
              <Images className="h-6 w-6"/> TCG Cards Featuring {displayNameToShow}
            </h2>
             <CardDescription className="mb-3 text-xs italic text-muted-foreground flex items-center gap-1">
                <Info size={14}/> Card values are market estimates from TCGPlayer via Pokémon TCG API and may vary. Click a card to add.
            </CardDescription>

            {isLoadingCards && (
              <div className="flex justify-center items-center py-10">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="ml-3 text-md text-muted-foreground">Loading TCG cards...</p>
              </div>
            )}
            {errorCards && !isLoadingCards && (
              <div className="flex flex-col items-center justify-center py-10 text-destructive">
                <ServerCrash className="h-12 w-12 mb-3" />
                <p className="text-lg font-semibold">Oops! Could not load TCG cards.</p>
                <p className="text-center text-sm">Error: {errorCards}. Please try again later.</p>
              </div>
            )}
            {!isLoadingCards && !errorCards && (
              <ScrollArea className="h-[calc(100vh-30rem)] md:h-[calc(100vh-34rem)]">
                {pokemonTcgCards.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                    {pokemonTcgCards.map((card) => {
                        const isCollected = collectionCards.some(
                            (collected) =>
                            collected.name === card.name &&
                            collected.set === card.set.name &&
                            collected.cardNumber === card.number
                        );
                        return (
                            <Card
                                key={card.id}
                                onClick={() => openDialogForCard(card)}
                                className="p-2 cursor-pointer hover:shadow-lg hover:border-primary transition-all group flex flex-col bg-card"
                            >
                            <div className={cn(
                                "relative aspect-[2.5/3.5] w-full rounded-md overflow-hidden mb-2 shadow-inner",
                                !isCollected && "grayscale group-hover:grayscale-0"
                            )}>
                                <Image src={card.images.small} alt={card.name} layout="fill" objectFit="contain" data-ai-hint="pokemon card front"/>
                            </div>
                            <div className="text-center mt-auto">
                                <p className="text-sm font-semibold truncate group-hover:text-primary">{card.name}</p>
                                <p className="text-xs text-muted-foreground">#{card.number} - {card.rarity || "N/A"}</p>
                                <p className="text-xs text-muted-foreground">{card.set.name}</p>
                            </div>
                            </Card>
                        );
                    })}
                    </div>
                ): (
                    <div className="text-center py-10 text-muted-foreground">
                        <Images className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p className="text-lg">No TCG cards found for {displayNameToShow} in the API results.</p>
                        <p className="text-sm">This Pokémon might not have any cards, or there could be an issue with the API data.</p>
                    </div>
                )}
              </ScrollArea>
            )}
          </section>
        )}
        {/* Fallback if pokemonDetails never load and no init error (e.g. still loading or unexpected state) */}
        {!pokemonDetails && !initializationError && !isLoadingDetails && !errorDetails && (
             <div className="text-center py-10 text-muted-foreground">
                <Info className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg">Details for this Pokémon could not be displayed.</p>
            </div>
        )}
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

export default PokemonDetailPage;
    
