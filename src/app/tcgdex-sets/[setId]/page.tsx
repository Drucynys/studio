
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
import type { TcgDexCardResume, TcgDexSet, TcgDexCard, TcgDexCardPrices } from "@/types/tcgdex";
import { Loader2, ServerCrash, ArrowLeft, Images, Search, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { getSafeTcgDexCardImageUrl, getSafeTcgDexSetAssetUrl } from '@/lib/tcgdexUtils';


const conditionOptions = ["Mint", "Near Mint", "Excellent", "Good", "Lightly Played", "Played", "Poor", "Damaged"];

const getTcgDexPriceForVariant = (prices: TcgDexCardPrices | undefined, variantKey: string): number => {
  if (!prices) return 0;
  const priceVariant = prices[variantKey];
  if (priceVariant && typeof priceVariant.market === 'number') {
    return priceVariant.market;
  }
  return 0; 
};

// Helper to format variant keys for display (consistent with other forms)
const formatVariantKeyDialog = (key: string): string => {
  if (!key) return "N/A";
  if (key === "firstEditionNormal") return "1st Edition Normal";
  if (key === "firstEditionHolofoil") return "1st Edition Holofoil";
  if (key === "reverseHolo") return "Reverse Holo";
  
  return key
    .replace(/([A-Z0-9])/g, ' $1') 
    .replace(/^./, str => str.toUpperCase()) 
    .trim();
};


const TcgDexSetDetailsPage: NextPage<{ params: { setId: string } }> = ({ params: paramsFromProps }) => {
  const resolvedParams = use(paramsFromProps);
  const { setId } = resolvedParams;

  const [setDetails, setSetDetails] = useState<TcgDexSet | null>(null);
  const [cardsInSet, setCardsInSet] = useState<TcgDexCardResume[]>([]);
  const [filteredCards, setFilteredCards] = useState<TcgDexCardResume[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [selectedCardResume, setSelectedCardResume] = useState<TcgDexCardResume | null>(null); 
  const [fullSelectedCardDetails, setFullSelectedCardDetails] = useState<TcgDexCard | null>(null);
  const [isFetchingFullCardDetails, setIsFetchingFullCardDetails] = useState(false);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const { toast } = useToast();

  const fetchSetAndCards = useCallback(async () => {
    if (!setId) return;
    setIsLoading(true);
    setError(null);
    setSetDetails(null); 
    setCardsInSet([]); 
    setFilteredCards([]); 

    try {
      const [setDetailsResponseSettled, cardsResponseSettled] = await Promise.allSettled([
        fetch(`https://api.tcgdex.net/v2/en/sets/${setId}`),
        fetch(`https://api.tcgdex.net/v2/en/cards?set.id=${setId}`)
      ]);

      if (setDetailsResponseSettled.status === 'fulfilled') {
        const setDetailsResponse = setDetailsResponseSettled.value;
        if (setDetailsResponse.ok) {
          const setData: TcgDexSet = await setDetailsResponse.json();
          setSetDetails(setData);
        } else {
          console.warn(`Failed to fetch set details for ${setId} from TCGdex. API responded with status ${setDetailsResponse.status}${setDetailsResponse.statusText ? ': ' + setDetailsResponse.statusText : '.'}`);
          setSetDetails(null); 
        }
      } else { 
        console.warn(`Network error fetching set details for ${setId}:`, (setDetailsResponseSettled.reason as Error).message);
        setSetDetails(null);
      }

      if (cardsResponseSettled.status === 'fulfilled') {
        const cardsResponse = cardsResponseSettled.value;
        if (cardsResponse.ok) {
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
        } else {
          
          throw new Error(`Failed to fetch cards for set ${setId} from TCGdex. API responded with status ${cardsResponse.status}${cardsResponse.statusText ? ': ' + cardsResponse.statusText : '.'}`);
        }
      } else { 
         throw new Error(`Network error fetching cards for set ${setId}: ${(cardsResponseSettled.reason as Error).message}`);
      }

    } catch (err) {
      console.error(`Error in fetchSetAndCards for set ${setId}:`, err);
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

  const handleAddCardToCollection = (condition: string, variant: string) => {
    if (!fullSelectedCardDetails || !setDetails) { 
        toast({
            variant: "destructive",
            title: "Error",
            description: "Full card details or set details are missing. Cannot add to collection.",
        });
        return;
    }
    
    const displayImageUrl = getSafeTcgDexCardImageUrl(fullSelectedCardDetails.image, 'high', 'webp') || "https://placehold.co/250x350.png";
    const collectorNumber = fullSelectedCardDetails.number || fullSelectedCardDetails.localId; 

    const newCard: CollectionPokemonCard = {
      id: crypto.randomUUID(),
      name: fullSelectedCardDetails.name,
      set: setDetails.name, 
      cardNumber: collectorNumber, 
      rarity: fullSelectedCardDetails.rarity || "N/A", 
      condition: condition,
      value: getTcgDexPriceForVariant(fullSelectedCardDetails.prices, variant), 
      imageUrl: displayImageUrl,
      variant: variant, 
    };

    try {
      const storedCardsRaw = localStorage.getItem("pokemonCards");
      const storedCards: CollectionPokemonCard[] = storedCardsRaw ? JSON.parse(storedCardsRaw) : [];
      
      const isDuplicate = storedCards.some(
        card => card.name === newCard.name && 
                card.set === newCard.set && 
                card.cardNumber === newCard.cardNumber && 
                card.condition === newCard.condition &&
                card.variant === newCard.variant
      );

      if (isDuplicate) {
        toast({
          variant: "destructive",
          title: "Duplicate Card",
          description: `${newCard.name} (${formatVariantKeyDialog(newCard.variant || "")}, ${newCard.condition}) is already in your collection.`,
        });
        setIsDialogOpen(false);
        return;
      }
      
      const updatedCards = [newCard, ...storedCards];
      localStorage.setItem("pokemonCards", JSON.stringify(updatedCards));
      toast({
        title: "Card Added!",
        description: `${newCard.name} (${formatVariantKeyDialog(newCard.variant || "")}, ${newCard.condition}) from ${newCard.set} has been added.`,
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
    setFullSelectedCardDetails(null); 
    setSelectedCardResume(null);
  };

  const openDialogForCard = async (cardResume: TcgDexCardResume) => {
    setSelectedCardResume(cardResume); 
    setFullSelectedCardDetails(null); 
    setIsFetchingFullCardDetails(true); 
    setIsDialogOpen(true); 
    
    try {
      const response = await fetch(`https://api.tcgdex.net/v2/en/cards/${cardResume.id}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch full card details for ${cardResume.name}. API responded with status ${response.status}${response.statusText ? ': ' + response.statusText : '.'}`);
      }
      const fullData: TcgDexCard = await response.json();
      setFullSelectedCardDetails(fullData);
    } catch (err) {
      console.error("Error fetching full card details:", err);
      toast({
        variant: "destructive",
        title: "Error Fetching Details",
        description: err instanceof Error ? err.message : "Could not load full card details.",
      });
      setFullSelectedCardDetails(null); 
    } finally {
      setIsFetchingFullCardDetails(false); 
    }
  };

  const pageTitleName = setDetails?.name || `Set ${setId}`;
  const pageSetLogoUrl = setDetails?.logo ? getSafeTcgDexSetAssetUrl(setDetails.logo, 'webp') : null;

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const target = e.currentTarget;
    target.src = "https://placehold.co/200x280.png/CCCCCC/333333?text=No+Image"; // Fallback placeholder
    target.onerror = null; // Prevent infinite loop if placeholder also fails
  };


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
                    {pageSetLogoUrl && (
                        <Image src={pageSetLogoUrl} alt={`${pageTitleName} logo`} width={100} height={40} style={{objectFit: "contain"}} className="mb-2" data-ai-hint="pokemon set logo" onError={handleImageError}/>
                    )}
                    <CardTitle className="font-headline text-3xl text-foreground">{pageTitleName}</CardTitle>
                    <CardDescription>Browse cards from {pageTitleName}. Click a card to add it. (TCGdex API)</CardDescription>
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
                <Info size={14}/> Cardmarket prices via TCGdex. Click card for variant options.
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
                <p className="text-center">Could not load TCGdex cards for this set: {error}<br />Please try again later.</p>
              </div>
            )}
            {!isLoading && !error && (
              <ScrollArea className="h-[calc(100vh-26rem)] md:h-[calc(100vh-30rem)]">
                {filteredCards.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                    {filteredCards.map((card) => {
                      const displayCardImageUrl = getSafeTcgDexCardImageUrl(card.image, 'low', 'webp') || "https://placehold.co/200x280.png/CCCCCC/333333?text=No+Image";
                      return (
                        <Card 
                            key={card.id} 
                            onClick={() => openDialogForCard(card)}
                            className="p-2 cursor-pointer hover:shadow-lg hover:border-primary transition-all group flex flex-col"
                        >
                        <div className="relative aspect-[2.5/3.5] w-full rounded-md overflow-hidden mb-2">
                            <Image 
                                src={displayCardImageUrl}
                                alt={card.name} 
                                layout="fill" 
                                objectFit="contain" 
                                data-ai-hint="pokemon card front"
                                onError={handleImageError}
                            />
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
      {selectedCardResume && (
        <AddCardToCollectionDialog
          isOpen={isDialogOpen}
          onClose={() => {
            setIsDialogOpen(false);
            setFullSelectedCardDetails(null); 
            setSelectedCardResume(null);
          }}
          sourceApi="tcgdex"
          cardName={selectedCardResume.name}
          initialCardImageUrl={selectedCardResume.image} 
          availableConditions={conditionOptions}
          tcgDexFullCard={fullSelectedCardDetails}
          isFetchingCardDetails={isFetchingFullCardDetails}
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
