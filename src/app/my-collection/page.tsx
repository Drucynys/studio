// src/app/my-collection/page.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import { AppHeader } from "@/components/AppHeader";
import { CardList } from "@/components/CardList";
import type { PokemonCard } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { EditCardDialog } from "@/components/EditCardDialog";
import { FullScreenCardView } from "@/components/FullScreenCardView";
import { AlertCircle, PackageOpen, Search, Filter, ListRestart, Trash2, Loader2, User, TrendingUp, DollarSign, Layers, Library } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import type { ApiPokemonCard } from "@/app/sets/[setId]/page";
import { CollectionUploadDialog } from "@/components/CollectionUploadDialog";

const getMarketPrice = (apiCard: ApiPokemonCard | undefined, variant?: string | null): number => {
  if (!apiCard || !apiCard.tcgplayer?.prices) return 0;
  const prices = apiCard.tcgplayer.prices;
  
  if (variant && prices[variant]?.market) {
    return prices[variant].market;
  }
  const variantPriority = ['normal', 'holofoil', 'reverseHolofoil', '1stEditionNormal', '1stEditionHolofoil', 'unlimitedHolofoil', 'unlimitedNormal'];
  for (const v of variantPriority) {
    if (prices[v]?.market) {
      return prices[v].market;
    }
  }
  for (const key in prices) {
    if (Object.prototype.hasOwnProperty.call(prices, key) && prices[key]?.market) {
      return prices[key].market;
    }
  }
  return 0;
};


export default function MyCollectionPage() {
  const { 
    user, 
    loading, 
    collection, 
    loadingCollection, 
    updateCardInCollection, 
    removeCardFromCollection,
    openAuthModal
  } = useAuth();
  
  const [filteredCards, setFilteredCards] = useState<PokemonCard[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOption, setSortOption] = useState("dateAddedDesc");
  const [cardToEdit, setCardToEdit] = useState<PokemonCard | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [cardToDelete, setCardToDelete] = useState<PokemonCard | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const [isFullScreenViewOpen, setIsFullScreenViewOpen] = useState(false);
  const [currentFullScreenCardIndex, setCurrentFullScreenCardIndex] = useState<number | null>(null);
  
  const [masterCardData, setMasterCardData] = useState<Map<string, ApiPokemonCard>>(new Map());
  const [loadingMasterData, setLoadingMasterData] = useState(false);

  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);


  const { toast } = useToast();

  useEffect(() => {
    const fetchMasterData = async () => {
      if (collection.length === 0) {
        setMasterCardData(new Map());
        return;
      }
      setLoadingMasterData(true);
      try {
        const apiIds = [...new Set(collection.map(c => c.apiId).filter(Boolean))];
        if (apiIds.length === 0) {
           setMasterCardData(new Map());
           return;
        }

        const response = await fetch('/api/master-cards-batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: apiIds }),
        });

        if (!response.ok) {
          throw new Error('Failed to fetch latest card data.');
        }

        const masterData: ApiPokemonCard[] = await response.json();
        const dataMap = new Map<string, ApiPokemonCard>();
        masterData.forEach(card => dataMap.set(card.id, card));
        setMasterCardData(dataMap);

      } catch (error) {
        console.error("Error fetching master card data:", error);
        // Not showing a toast here to avoid bothering user for a non-critical background fetch
      } finally {
        setLoadingMasterData(false);
      }
    };

    if (!loadingCollection) {
      fetchMasterData();
    }
  }, [collection, loadingCollection]);


  const collectionStats = useMemo(() => {
    if (!collection || collection.length === 0) {
      return { totalValueAdded: 0, totalCurrentValue: 0, totalCards: 0, uniqueCards: 0 };
    }

    let totalCurrentValue = 0;
    const totalValueAdded = collection.reduce((acc, card) => {
      const value = card.value || 0;
      const quantity = card.quantity || 1;
      
      const masterCard = masterCardData.get(card.apiId);
      const currentValue = getMarketPrice(masterCard, card.variant);
      totalCurrentValue += (currentValue > 0 ? currentValue : value) * quantity;

      return acc + value * quantity;
    }, 0);
    
    const totalCards = collection.reduce((acc, card) => {
      return acc + (card.quantity || 1);
    }, 0);

    const uniqueCards = collection.length;

    return { totalValueAdded, totalCurrentValue, totalCards, uniqueCards };
  }, [collection, masterCardData]);


  useEffect(() => {
    let tempCards = [...collection];

    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      tempCards = tempCards.filter(
        (card) =>
          card.name?.toLowerCase().includes(lowerSearchTerm) ||
          card.set.toLowerCase().includes(lowerSearchTerm) ||
          card.cardNumber.toLowerCase().includes(lowerSearchTerm)
      );
    }

    switch (sortOption) {
      case "favorites":
        tempCards.sort((a, b) => {
          const aFav = a.isFavorite ? 1 : 0;
          const bFav = b.isFavorite ? 1 : 0;
          if (aFav !== bFav) return bFav - aFav;
          const timeA = a.timestamp?.toMillis ? a.timestamp.toMillis() : 0;
          const timeB = b.timestamp?.toMillis ? b.timestamp.toMillis() : 0;
          return timeB - timeA;
        });
        break;
      case "nameAsc":
        tempCards.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
        break;
      case "nameDesc":
        tempCards.sort((a, b) => (b.name || "").localeCompare(a.name || ""));
        break;
      case "valueDesc":
        tempCards.sort((a, b) => {
            const masterA = masterCardData.get(a.apiId);
            const currentA = getMarketPrice(masterA, a.variant);
            const masterB = masterCardData.get(b.apiId);
            const currentB = getMarketPrice(masterB, b.variant);
            return (currentB > 0 ? currentB : (b.value || 0)) - (currentA > 0 ? currentA : (a.value || 0));
        });
        break;
      case "valueAsc":
        tempCards.sort((a, b) => {
            const masterA = masterCardData.get(a.apiId);
            const currentA = getMarketPrice(masterA, a.variant);
            const masterB = masterCardData.get(b.apiId);
            const currentB = getMarketPrice(masterB, b.variant);
            return (currentA > 0 ? currentA : (a.value || 0)) - (currentB > 0 ? currentB : (b.value || 0));
        });
        break;
      case "setAsc":
        tempCards.sort((a, b) => a.set.localeCompare(b.set) || (a.name || "").localeCompare(b.name || ""));
        break;
      case "dateAddedDesc":
      default:
        // Firestore data is already sorted by timestamp desc by default in context
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
  }, [collection, searchTerm, sortOption, masterCardData]);

  const handleRemoveCard = (cardId: string) => {
    const cardToRemove = collection.find(c => c.id === cardId);
    if (cardToRemove) {
      setCardToDelete(cardToRemove);
      setIsDeleteDialogOpen(true);
    }
  };

  const confirmRemoveCard = async () => {
    if (!cardToDelete) return;
    try {
      await removeCardFromCollection(cardToDelete.id);
      toast({
        title: "Card Removed",
        description: `${cardToDelete.name || cardToDelete.cardNumber} has been removed.`,
      });
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not remove card: " + e.message,
      });
    }
    setIsDeleteDialogOpen(false);
    setCardToDelete(null);
  };

  const handleEditCard = (card: PokemonCard) => {
    setCardToEdit(card);
    setIsEditDialogOpen(true);
  };

  const handleSaveChanges = async (updatedCard: PokemonCard) => {
    try {
      await updateCardInCollection(updatedCard);
      toast({
        title: "Card Updated!",
        description: `${updatedCard.name || updatedCard.cardNumber} has been updated.`,
      });
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Update Error",
        description: "Could not update card details: " + e.message,
      });
    }
    setIsEditDialogOpen(false);
    setCardToEdit(null);
  };

  const resetFilters = () => {
    setSearchTerm("");
    setSortOption("dateAddedDesc");
  };

  const openFullScreenView = (cardIndex: number) => {
    setCurrentFullScreenCardIndex(cardIndex);
    setIsFullScreenViewOpen(true);
  };

  const closeFullScreenView = () => {
    setIsFullScreenViewOpen(false);
    setCurrentFullScreenCardIndex(null);
  };

  const navigateFullScreen = (newIndex: number) => {
    if (newIndex >= 0 && newIndex < filteredCards.length) {
      setCurrentFullScreenCardIndex(newIndex);
    }
  };

  const handleToggleFavorite = async (card: PokemonCard) => {
    try {
      const updatedCard = { ...card, isFavorite: !card.isFavorite };
      await updateCardInCollection(updatedCard);
      toast({
        title: card.isFavorite ? "Card Unfavorited" : "Card Favorited!",
        description: `${card.name} has been updated.`,
      });
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not update favorite status: " + e.message,
      });
    }
  };

  if (loading || loadingCollection) {
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

  if (!user) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <AppHeader />
        <main className="flex-grow container mx-auto p-4 md:p-8 flex items-center justify-center">
          <div className="text-center">
            <User className="mx-auto h-12 w-12 text-muted-foreground" />
            <h2 className="mt-4 text-2xl font-semibold">Access Your Collection</h2>
            <p className="mt-2 text-muted-foreground">Please log in to view and manage your saved Pokémon cards.</p>
            <Button className="mt-6" onClick={openAuthModal}>Login / Sign Up</Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <AppHeader />
      <main className="flex-grow container mx-auto p-4 md:p-8 space-y-6">
        
        <section id="collection-summary" aria-labelledby="collection-summary-heading">
          <Card className="shadow-lg">
            <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle id="collection-summary-heading" className="text-2xl font-headline font-semibold text-foreground flex items-center gap-2">
                      <TrendingUp className="h-6 w-6 text-primary" />
                      Collection Summary
                    </CardTitle>
                    <CardDescription>An at-a-glance overview of your entire collection.</CardDescription>
                  </div>
                  <Button onClick={() => setIsUploadDialogOpen(true)} className="mt-4 sm:mt-0">Upload from CSV</Button>
                </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-center">
                <div className="bg-muted p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-muted-foreground flex items-center justify-center gap-1"><DollarSign className="h-4 w-4" />Total Current Value</h3>
                  <p className="text-3xl font-bold text-primary">${collectionStats.totalCurrentValue.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">(Added Value: ${collectionStats.totalValueAdded.toFixed(2)})</p>
                </div>
                <div className="bg-muted p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-muted-foreground flex items-center justify-center gap-1"><Layers className="h-4 w-4" />Total Cards</h3>
                  <p className="text-3xl font-bold text-primary">{collectionStats.totalCards}</p>
                </div>
                <div className="bg-muted p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-muted-foreground flex items-center justify-center gap-1"><Library className="h-4 w-4" />Unique Cards</h3>
                  <p className="text-3xl font-bold text-primary">{collectionStats.uniqueCards}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        <section id="collection-controls" aria-labelledby="collection-controls-heading" className="bg-card p-4 md:p-6 rounded-lg shadow">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-4">
            <h2 id="collection-controls-heading" className="text-3xl font-headline font-semibold text-foreground flex items-center">
              <PackageOpen className="h-8 w-8 mr-2 text-primary" /> My Pokémon Card Collection
            </h2>
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-muted-foreground" />
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
                <SelectItem value="favorites">Favorites First</SelectItem>
                <SelectItem value="nameAsc">Name (A-Z)</SelectItem>
                <SelectItem value="nameDesc">Name (Z-A)</SelectItem>
                <SelectItem value="valueDesc">Value (High-Low)</SelectItem>
                <SelectItem value="valueAsc">Value (Low-High)</SelectItem>
                <SelectItem value="setAsc">Set Name (A-Z)</SelectItem>
                <SelectItem value="quantityDesc">Quantity (High-Low)</SelectItem>
                <SelectItem value="quantityAsc">Quantity (Low-High)</SelectItem>
              </SelectContent>
            </Select>
             <Button onClick={resetFilters} variant="ghost" size="sm" className="mt-4 text-sm text-muted-foreground hover:text-primary justify-self-start sm:col-span-2 lg:col-span-1 lg:justify-self-end">
              <ListRestart className="mr-2 h-4 w-4" /> Reset Filters
            </Button>
          </div>
        </section>

        <CardList
          cards={filteredCards}
          masterCardData={masterCardData}
          onEditCard={handleEditCard}
          onRemoveCard={handleRemoveCard}
          onViewCard={openFullScreenView}
          onToggleFavorite={handleToggleFavorite}
          isLoadingMasterData={loadingMasterData}
        />
        
        {filteredCards.length === 0 && searchTerm && (
          <div className="text-center py-10 text-muted-foreground">
            <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg">No cards found matching your search criteria.</p>
          </div>
        )}
      </main>

      <CollectionUploadDialog 
        isOpen={isUploadDialogOpen}
        onClose={() => setIsUploadDialogOpen(false)}
      />

      {isFullScreenViewOpen && currentFullScreenCardIndex !== null && (
        <FullScreenCardView
          isOpen={isFullScreenViewOpen}
          onClose={closeFullScreenView}
          cards={filteredCards}
          currentIndex={currentFullScreenCardIndex}
          onNavigate={navigateFullScreen}
          masterCardData={masterCardData}
        />
      )}

      {cardToEdit && (
        <EditCardDialog
          isOpen={isEditDialogOpen}
          onClose={() => {
            setIsEditDialogOpen(false);
            setCardToEdit(null);
          }}
          card={cardToEdit}
          onSave={handleSaveChanges}
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
        PokéTRKR &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
}
