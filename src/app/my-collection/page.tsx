
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { AppHeader } from "@/components/AppHeader";
import { CardList } from "@/components/CardList";
import type { PokemonCard } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { EditCardDialog } from "@/components/EditCardDialog"; 
import { AlertCircle, PackageOpen, Search, Filter, ListRestart, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

export default function MyCollectionPage() {
  const [allCards, setAllCards] = useState<PokemonCard[]>([]);
  const [filteredCards, setFilteredCards] = useState<PokemonCard[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOption, setSortOption] = useState("dateAddedDesc"); // Default sort: newest first
  const [rarityFilter, setRarityFilter] = useState("");
  const [setFilter, setSetFilter] = useState("");
  const [conditionFilter, setConditionFilter] = useState("");
  const [isClient, setIsClient] = useState(false);
  const [cardToEdit, setCardToEdit] = useState<PokemonCard | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [cardToDelete, setCardToDelete] = useState<PokemonCard | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);


  const { toast } = useToast();

  const loadCards = useCallback(() => {
    const storedCardsRaw = localStorage.getItem("pokemonCards");
    const loadedCards: PokemonCard[] = storedCardsRaw ? JSON.parse(storedCardsRaw) : [];
    setAllCards(loadedCards);
  }, []);

  useEffect(() => {
    setIsClient(true);
    loadCards();
  }, [loadCards]);

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

    // Filter by rarity
    if (rarityFilter) {
      tempCards = tempCards.filter((card) => card.rarity === rarityFilter);
    }
    
    // Filter by set
    if (setFilter) {
      tempCards = tempCards.filter((card) => card.set === setFilter);
    }

    // Filter by condition
    if (conditionFilter) {
      tempCards = tempCards.filter((card) => card.condition === conditionFilter);
    }


    // Sort cards
    switch (sortOption) {
      case "nameAsc":
        tempCards.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
        break;
      case "nameDesc":
        tempCards.sort((a, b) => (b.name || "").localeCompare(a.name || ""));
        break;
      case "valueDesc":
        tempCards.sort((a, b) => b.value - a.value);
        break;
      case "valueAsc":
        tempCards.sort((a, b) => a.value - b.value);
        break;
      case "setAsc":
        tempCards.sort((a, b) => a.set.localeCompare(b.set) || (a.name || "").localeCompare(b.name || ""));
        break;
      // Default: dateAddedDesc (implicitly handled by how cards are added/loaded if ID is timestamp-based or array order)
      // If IDs are not time-based, this would need an actual 'dateAdded' field.
      // For now, it means reverse of current `allCards` order which is newest first.
      case "dateAddedDesc":
      default:
        // Assuming allCards is already in dateAddedDesc order due to unshift on add
        break; 
      case "dateAddedAsc":
        tempCards.reverse(); // if allCards is newest first, reverse for oldest first
        break;
      case "quantityDesc":
        tempCards.sort((a, b) => b.quantity - a.quantity);
        break;
      case "quantityAsc":
        tempCards.sort((a, b) => a.quantity - b.quantity);
        break;
    }

    setFilteredCards(tempCards);
  }, [allCards, searchTerm, sortOption, rarityFilter, setFilter, conditionFilter]);

  const uniqueRarities = useMemo(() => {
    if (!isClient) return [];
    const rarities = new Set(allCards.map(card => card.rarity));
    return Array.from(rarities).sort();
  }, [allCards, isClient]);

  const uniqueSets = useMemo(() => {
    if (!isClient) return [];
    const sets = new Set(allCards.map(card => card.set));
    return Array.from(sets).sort();
  }, [allCards, isClient]);

  const uniqueConditions = useMemo(() => {
    if (!isClient) return [];
    const conditions = new Set(allCards.map(card => card.condition));
    return Array.from(conditions).sort();
  }, [allCards, isClient]);


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
      setAllCards(updatedCards); // Update state to re-trigger filtering/sorting
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
    setRarityFilter("");
    setSetFilter("");
    setConditionFilter("");
  };

  if (!isClient) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <AppHeader />
        <main className="flex-grow container mx-auto p-4 md:p-8 flex items-center justify-center">
          <p className="text-xl text-muted-foreground animate-pulse">Loading your collection...</p>
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
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 items-end">
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

            <Select value={rarityFilter} onValueChange={setRarityFilter} disabled={uniqueRarities.length === 0}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Filter by Rarity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Rarities</SelectItem>
                {uniqueRarities.map(rarity => <SelectItem key={rarity} value={rarity}>{rarity}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={setFilter} onValueChange={setSetFilter} disabled={uniqueSets.length === 0}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Filter by Set" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Sets</SelectItem>
                {uniqueSets.map(setName => <SelectItem key={setName} value={setName}>{setName}</SelectItem>)}
              </SelectContent>
            </Select>
            
            <Select value={conditionFilter} onValueChange={setConditionFilter} disabled={uniqueConditions.length === 0}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Filter by Condition" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Conditions</SelectItem>
                {uniqueConditions.map(condition => <SelectItem key={condition} value={condition}>{condition}</SelectItem>)}
              </SelectContent>
            </Select>

          </div>
           <Button onClick={resetFilters} variant="ghost" size="sm" className="mt-4 text-sm text-muted-foreground hover:text-primary">
              <ListRestart className="mr-2 h-4 w-4"/> Reset Filters
            </Button>
        </section>

        <CardList cards={filteredCards} onEditCard={handleEditCard} onRemoveCard={handleRemoveCard} />
        
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

    

    