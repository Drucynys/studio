
"use client";

import { useState, useEffect, useCallback } from "react";
import { AppHeader } from "@/components/AppHeader";
import { CardList } from "@/components/CardList";
import type { PokemonCard, CardmarketPriceGuide } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { EditCardDialog } from "@/components/EditCardDialog"; 
import { AlertCircle, PackageOpen, Search, Filter, ListRestart, Trash2, Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export default function MyCollectionPage() {
  const [allCards, setAllCards] = useState<PokemonCard[]>([]);
  const [filteredCards, setFilteredCards] = useState<PokemonCard[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOption, setSortOption] = useState("dateAddedDesc"); // Default sort: newest first
  const [isClient, setIsClient] = useState(false);
  const [cardToEdit, setCardToEdit] = useState<PokemonCard | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [cardToDelete, setCardToDelete] = useState<PokemonCard | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const [cardmarketPriceGuide, setCardmarketPriceGuide] = useState<CardmarketPriceGuide | null>(null);
  const [isLoadingCmPrices, setIsLoadingCmPrices] = useState(false);

  const { toast } = useToast();

  const loadCards = useCallback(() => {
    const storedCardsRaw = localStorage.getItem("pokemonCards");
    const loadedCards: PokemonCard[] = storedCardsRaw ? JSON.parse(storedCardsRaw) : [];
    setAllCards(loadedCards);
  }, []);

  useEffect(() => {
    setIsClient(true);
    loadCards();

    const fetchCmPrices = async () => {
      setIsLoadingCmPrices(true);
      try {
        const response = await fetch('/api/cardmarket-prices');
        if (!response.ok) {
          let errorMessage = 'Failed to fetch Cardmarket prices';
          try {
            const errorData = await response.json();
            if (errorData && errorData.message) {
              errorMessage = `API Error: ${errorData.message}`;
              if (errorData.error) {
                 errorMessage += ` Details: ${errorData.error}`;
              }
            } else if (response.statusText) {
              errorMessage = `Failed to fetch Cardmarket prices: ${response.statusText} (status: ${response.status})`;
            }
          } catch (e) {
            // Failed to parse JSON from error response, use statusText from original response
            if (response.statusText) {
               errorMessage = `Failed to fetch Cardmarket prices: ${response.statusText} (status: ${response.status})`;
            }
          }
          throw new Error(errorMessage);
        }
        const data: CardmarketPriceGuide = await response.json();
        setCardmarketPriceGuide(data);
      } catch (error) {
        console.error("Error fetching Cardmarket prices:", error);
        toast({
          variant: "destructive",
          title: "Cardmarket Price Error",
          description: error instanceof Error ? error.message : "Could not load Cardmarket price data.",
        });
      } finally {
        setIsLoadingCmPrices(false);
      }
    };
    fetchCmPrices();
  }, [loadCards, toast]);


  // Listen for storage changes from other tabs (e.g., after adding a card)
  useEffect(() => {
    if (!isClient) return;
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === "pokemonCards") {
        loadCards();
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [isClient, loadCards]);


  useEffect(() => {
    let tempCards = [...allCards];

    // Filter by search term (name, set, card number)
    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      tempCards = tempCards.filter(
        (card) =>
          card.name?.toLowerCase().includes(lowerSearchTerm) ||
          card.set.toLowerCase().includes(lowerSearchTerm) ||
          card.cardNumber.toLowerCase().includes(lowerSearchTerm)
      );
    }

    // Sort cards
    switch (sortOption) {
      case "nameAsc":
        tempCards.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
        break;
      case "nameDesc":
        tempCards.sort((a, b) => (b.name || "").localeCompare(a.name || ""));
        break;
      case "valueDesc": // TCGPlayer value
        tempCards.sort((a, b) => b.value - a.value);
        break;
      case "valueAsc": // TCGPlayer value
        tempCards.sort((a, b) => a.value - b.value);
        break;
      case "setAsc":
        tempCards.sort((a, b) => a.set.localeCompare(b.set) || (a.name || "").localeCompare(b.name || ""));
        break;
      case "dateAddedDesc":
      default:
        // Already sorted by reverse chronological on load typically
        break; 
      case "dateAddedAsc":
        tempCards.reverse(); 
        break;
      case "quantityDesc":
        tempCards.sort((a, b) => b.quantity - a.quantity);
        break;
      case "quantityAsc":
        tempCards.sort((a, b) => a.quantity - b.quantity);
        break;
    }

    setFilteredCards(tempCards);
  }, [allCards, searchTerm, sortOption]);


  const handleRemoveCard = (cardId: string) => {
    const cardToRemove = allCards.find(c => c.id === cardId);
    if (cardToRemove) {
        setCardToDelete(cardToRemove);
        setIsDeleteDialogOpen(true);
    }
  };

  const confirmRemoveCard = () => {
    if (!cardToDelete) return;
    try {
      const updatedCards = allCards.filter((card) => card.id !== cardToDelete.id);
      localStorage.setItem("pokemonCards", JSON.stringify(updatedCards));
      setAllCards(updatedCards); 
       toast({
        title: "Card Removed",
        description: `${cardToDelete.name || cardToDelete.cardNumber} has been removed from your collection.`,
      });
    } catch (e) {
      console.error("Failed to remove card from localStorage", e);
      toast({
        variant: "destructive",
        title: "Storage Error",
        description: "Could not remove card from your collection.",
      });
    }
    setIsDeleteDialogOpen(false);
    setCardToDelete(null);
  };


  const handleEditCard = (card: PokemonCard) => {
    setCardToEdit(card);
    setIsEditDialogOpen(true);
  };

  const handleSaveChanges = (updatedCard: PokemonCard) => {
    try {
      const updatedCards = allCards.map(card => card.id === updatedCard.id ? updatedCard : card);
      localStorage.setItem("pokemonCards", JSON.stringify(updatedCards));
      setAllCards(updatedCards);
      toast({
        title: "Card Updated!",
        description: `${updatedCard.name || updatedCard.cardNumber} has been updated.`,
      });
    } catch (e) {
      console.error("Failed to save updated card", e);
      toast({
        variant: "destructive",
        title: "Update Error",
        description: "Could not update card details.",
      });
    }
    setIsEditDialogOpen(false);
    setCardToEdit(null);
  };

  const resetFilters = () => {
    setSearchTerm("");
    setSortOption("dateAddedDesc");
  };

  if (!isClient) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <AppHeader />
        <main className="flex-grow container mx-auto p-4 md:p-8 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="ml-3 text-xl text-muted-foreground">Loading your collection...</p>
        </main>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <AppHeader />
      <main className="flex-grow container mx-auto p-4 md:p-8 space-y-6">
        <section id="collection-controls" aria-labelledby="collection-controls-heading" className="bg-card p-4 md:p-6 rounded-lg shadow">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-4">
            <h2 id="collection-controls-heading" className="text-3xl font-headline font-semibold text-foreground flex items-center">
                <PackageOpen className="h-8 w-8 mr-2 text-primary" /> My Pokémon Card Collection
            </h2>
            <div className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-muted-foreground"/>
                <p className="text-sm text-muted-foreground font-medium">Filters & Sorting</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search collection..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 w-full"
              />
            </div>

            <Select value={sortOption} onValueChange={setSortOption}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Sort by..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dateAddedDesc">Date Added (Newest)</SelectItem>
                <SelectItem value="dateAddedAsc">Date Added (Oldest)</SelectItem>
                <SelectItem value="nameAsc">Name (A-Z)</SelectItem>
                <SelectItem value="nameDesc">Name (Z-A)</SelectItem>
                <SelectItem value="valueDesc">Value (High-Low)</SelectItem>
                <SelectItem value="valueAsc">Value (Low-High)</SelectItem>
                <SelectItem value="setAsc">Set Name (A-Z)</SelectItem>
                <SelectItem value="quantityDesc">Quantity (High-Low)</SelectItem>
                <SelectItem value="quantityAsc">Quantity (Low-High)</SelectItem>
              </SelectContent>
            </Select>
            {isLoadingCmPrices && (
              <div className="flex items-center justify-center text-muted-foreground text-sm">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading CM Prices...
              </div>
            )}
          </div>
           <Button onClick={resetFilters} variant="ghost" size="sm" className="mt-4 text-sm text-muted-foreground hover:text-primary">
              <ListRestart className="mr-2 h-4 w-4"/> Reset Filters
            </Button>
        </section>

        <CardList 
            cards={filteredCards} 
            onEditCard={handleEditCard} 
            onRemoveCard={handleRemoveCard} 
            cardmarketPriceGuide={cardmarketPriceGuide}
        />
        
        {filteredCards.length === 0 && searchTerm && (
          <div className="text-center py-10 text-muted-foreground">
              <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg">No cards found matching your search criteria.</p>
          </div>
        )}
      </main>

      {cardToEdit && (
        <EditCardDialog
          isOpen={isEditDialogOpen}
          onClose={() => {
            setIsEditDialogOpen(false);
            setCardToEdit(null);
          }}
          card={cardToEdit}
          onSave={handleSaveChanges}
          availableConditions={["Mint", "Near Mint", "Excellent", "Good", "Lightly Played", "Played", "Poor", "Damaged"]}
        />
      )}

      {cardToDelete && (
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2"><AlertCircle className="text-destructive"/>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This action cannot be undone. This will permanently remove the card <span className="font-semibold">{cardToDelete.name || cardToDelete.cardNumber} ({cardToDelete.set})</span> from your collection.
                </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setCardToDelete(null)}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={confirmRemoveCard} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                    <Trash2 className="mr-2 h-4 w-4" /> Delete Card
                </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      )}

      <footer className="text-center py-4 text-sm text-muted-foreground border-t border-border mt-auto">
        Pokédex Tracker &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
}
