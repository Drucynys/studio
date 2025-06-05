
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
import type { PokemonCard as CollectionPokemonCard } from "@/types"; // Collection card type
import type { TcgDexCardResume, TcgDexSet } from "@/types/tcgdex"; // TCGdex API types
import { Loader2, ServerCrash, ArrowLeft, Images, Search, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";

const conditionOptions = ["Mint", "Near Mint", "Excellent", "Good", "Lightly Played", "Played", "Poor", "Damaged"];
const TCGDEX_IMAGE_BASE_URL = "https://assets.tcgdex.net";

const getSafeTcgDexImageUrl = (imagePath: string | undefined | null): string | null => {
  if (!imagePath || typeof imagePath !== 'string') return null;
  const trimmedPath = imagePath.trim();
  // If trimmed path is too short to be a real image path (e.g. "/", ".png")
  if (!trimmedPath || trimmedPath.length < 5) return null;

  if (trimmedPath.startsWith('http://') || trimmedPath.startsWith('https://')) {
    try {
      const url = new URL(trimmedPath);
      if (url.hostname === 'assets.tcgdex.net') {
        return trimmedPath; // Valid absolute URL for the correct host
      }
      // Absolute URL but for a different/unexpected host
      return null; 
    } catch (e) {
      // Malformed absolute URL
      return null;
    }
  } else {
    // Assume relative path
    if (trimmedPath.startsWith('/')) {
      return `${TCGDEX_IMAGE_BASE_URL}${trimmedPath}`;
    } else {
      return `${TCGDEX_IMAGE_BASE_URL}/${trimmedPath}`;
    }
  }
};


const TcgDexSetDetailsPage: NextPage<{ params: { setId: string } }> = ({ params: paramsFromProps }) => {
  const resolvedParams = use(paramsFromProps);
  const { setId } = resolvedParams;

  const [setDetails, setSetDetails] = useState<TcgDexSet | null>(null);
  const [cardsInSet, setCardsInSet] = useState<TcgDexCardResume[]>([]);
  const [filteredCards, setFilteredCards] = useState<TcgDexCardResume[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCard, setSelectedCard] = useState<TcgDexCardResume | null>(null); 
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const { toast } = useToast();

  const fetchSetAndCards = useCallback(async () => {
    if (!setId) return;
    setIsLoading(true);
    setError(null);
    try {
      const setDetailsResponse = await fetch(`https://api.tcgdex.net/v2/en/sets/${setId}`);
      if (!setDetailsResponse.ok) {
        throw new Error(`Failed to fetch set details from TCGdex: ${setDetailsResponse.statusText}`);
      }
      const setData: TcgDexSet = await setDetailsResponse.json();
      setSetDetails(setData);

      const cardsResponse = await fetch(`https://api.tcgdex.net/v2/en/cards?set.id=${setId}`);
      if(!cardsResponse.ok) {
          throw new Error(`Failed to fetch cards for set ${setId} from TCGdex: ${cardsResponse.statusText}`);
      }
      let fetchedCards: TcgDexCardResume[] = await cardsResponse.json();

      fetchedCards.sort((a, b) => {
        const numA = parseInt(a.localId.replace(/\D/g, ''), 10) || 0;
        const numB = parseInt(b.localId.replace(/\D/g, ''), 10) || 0;
        const suffixA = a.localId.replace(/\d/g, ''); 
        const suffixB = b.localId.replace(/\d/g, '');

        if (numA === numB) {
            return suffixA.localeCompare(suffixB); 
        }
        return numA - numB;
      });
      
      setCardsInSet(fetchedCards);
      setFilteredCards(fetchedCards);

    } catch (err) {
      console.error(`Error fetching TCGdex data for set ${setId}:`, err);
      setError(err instanceof Error ? err.message : "An unknown error occurred");
    } finally {
      setIsLoading(false);
    }
  }, [setId]);

  useEffect(() => {
    fetchSetAndCards();
  }, [fetchSetAndCards]);
  
  useEffect(() => {
    const lowercasedFilter = searchTerm.toLowerCase();
    const filteredData = cardsInSet.filter(card =>
      card.name.toLowerCase().includes(lowercasedFilter) ||
      card.localId.toLowerCase().includes(lowercasedFilter)
    );
    setFilteredCards(filteredData);
  }, [searchTerm, cardsInSet]);

  const handleAddCardToCollection = (condition: string) => {
    if (!selectedCard || !setDetails) return;
    
    const displayImageUrl = getSafeTcgDexImageUrl(selectedCard.image) || "https://placehold.co/250x350.png";
    
    const newCard: CollectionPokemonCard = {
      id: crypto.randomUUID(),
      name: selectedCard.name,
      set: setDetails.name, 
      cardNumber: selectedCard.localId, 
      rarity: "N/A", 
      condition: condition,
      value: 0, 
      imageUrl: displayImageUrl,
      variant: "Normal", 
    };

    try {
      const storedCardsRaw = localStorage.getItem("pokemonCards");
      const storedCards: CollectionPokemonCard[] = storedCardsRaw ? JSON.parse(storedCardsRaw) : [];
      
      const isDuplicate = storedCards.some(
        card => card.name === newCard.name && 
                card.set === newCard.set && 
                card.cardNumber === newCard.cardNumber &&
                card.condition === newCard.condition 
      );

      if (isDuplicate) {
        toast({
          variant: "destructive",
          title: "Duplicate Card",
          description: `${newCard.name} (${newCard.condition}) is already in your collection.`,
        });
        setIsDialogOpen(false);
        return;
      }
      
      const updatedCards = [newCard, ...storedCards];
      localStorage.setItem("pokemonCards", JSON.stringify(updatedCards));
      toast({
        title: "Card Added!",
        description: `${newCard.name} (${newCard.condition}) from ${newCard.set} has been added.`,
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

  const openDialogForCard = (card: TcgDexCardResume) => {
    setSelectedCard(card);
    setIsDialogOpen(true);
  };

  const setName = setDetails?.name || `Set ${setId}`;
  const setLogoUrl = setDetails?.logo ? getSafeTcgDexImageUrl(setDetails.logo) : null;

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <AppHeader />
      <main className="flex-grow container mx-auto p-4 md:p-8">
        <Link href="/tcgdex-browse-sets" passHref legacyBehavior>
          <Button variant="outline" className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to TCGdex Sets
          </Button>
        </Link>

        <Card className="shadow-xl">
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                <div>
                    {setLogoUrl && (
                        <Image src={setLogoUrl} alt={`${setName} logo`} width={100} height={40} objectFit="contain" className="mb-2" data-ai-hint="pokemon set logo" />
                    )}
                    <CardTitle className="font-headline text-3xl text-foreground">{setName}</CardTitle>
                    <CardDescription>Browse cards from {setName}. Click a card to add it. (TCGdex API)</CardDescription>
                </div>
                <div className="relative mt-4 md:mt-0 w-full md:w-1/3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                        type="text"
                        placeholder="Search cards by name or number..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                    />
                </div>
            </div>
            <CardDescription className="mt-2 text-xs italic text-muted-foreground flex items-center gap-1">
                <Info size={14}/> Card summaries from TCGdex. Full details (rarity, value) may require further API calls per card.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading && (
              <div className="flex justify-center items-center py-10">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="ml-4 text-lg text-muted-foreground">Loading cards from TCGdex...</p>
              </div>
            )}
            {error && (
              <div className="flex flex-col items-center justify-center py-10 text-destructive">
                <ServerCrash className="h-16 w-16 mb-4" />
                <p className="text-xl font-semibold">Oops! Something went wrong.</p>
                <p className="text-center">Could not load TCGdex cards for this set: {error}.<br />Please try again later.</p>
              </div>
            )}
            {!isLoading && !error && (
              <ScrollArea className="h-[calc(100vh-26rem)] md:h-[calc(100vh-30rem)]">
                {filteredCards.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                    {filteredCards.map((card) => {
                      const displayCardImageUrl = getSafeTcgDexImageUrl(card.image);
                      return (
                        <Card 
                            key={card.id} 
                            onClick={() => openDialogForCard(card)}
                            className="p-2 cursor-pointer hover:shadow-lg hover:border-primary transition-all group flex flex-col"
                        >
                        <div className="relative aspect-[2.5/3.5] w-full rounded-md overflow-hidden mb-2">
                            {displayCardImageUrl ? (
                                <Image 
                                    src={displayCardImageUrl}
                                    alt={card.name} 
                                    layout="fill" 
                                    objectFit="contain" 
                                    data-ai-hint="pokemon card front"
                                />
                            ) : (
                                <div className="w-full h-full bg-muted rounded flex items-center justify-center" data-ai-hint="image placeholder">
                                  <span className="text-xs text-muted-foreground">No Image</span>
                                </div>
                            )}
                        </div>
                        <div className="text-center mt-auto">
                            <p className="text-sm font-semibold truncate group-hover:text-primary">{card.name}</p>
                            <p className="text-xs text-muted-foreground">#{card.localId}</p>
                        </div>
                        </Card>
                      );
                    })}
                    </div>
                ): (
                    <div className="text-center py-10 text-muted-foreground">
                        <Images className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p className="text-lg">{searchTerm ? "No cards found matching your search." : "No cards found in this set via TCGdex."}</p>
                    </div>
                )}
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </main>
      {selectedCard && (
        <AddCardToCollectionDialog
          isOpen={isDialogOpen}
          onClose={() => setIsDialogOpen(false)}
          cardName={selectedCard.name}
          cardImageUrl={getSafeTcgDexImageUrl(selectedCard.image) || "https://placehold.co/200x280.png"}
          availableConditions={conditionOptions}
          onAddCard={handleAddCardToCollection}
        />
      )}
       <footer className="text-center py-4 text-sm text-muted-foreground border-t border-border mt-auto">
        Pokédex Tracker (TCGdex Test) &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
};

export default TcgDexSetDetailsPage;
    
