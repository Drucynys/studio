// src/app/my-collection/page.tsx
"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Image from "next/image";
import { AppHeader } from "@/components/AppHeader";
import { CardList } from "@/components/CardList";
import type { PokemonCard, WishlistItem, ExchangeItem } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useDebounce } from "@/hooks/useDebounce";
import { EditCardDialog } from "@/components/EditCardDialog";
import { FullScreenCardView } from "@/components/FullScreenCardView";
import { AlertCircle, PackageOpen, Search, Filter, ListRestart, Trash2, Loader2, User, TrendingUp, DollarSign, Layers, Library, Heart, Check, X, Redo, Replace } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { AddCardToCollectionDialog } from "@/components/AddCardToCollectionDialog";

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
    wishlist,
    loadingWishlist,
    myExchangeItems,
    loadingMyExchangeItems,
    updateCardInCollection, 
    removeCardFromCollection,
    removeCardFromWishlist,
    moveCardFromWishlistToCollection,
    addCardToExchange,
    removeCardFromExchange,
    openAuthModal
  } = useAuth();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOption, setSortOption] = useState("dateAddedDesc");
  const [cardToEdit, setCardToEdit] = useState<PokemonCard | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [cardToDelete, setCardToDelete] = useState<PokemonCard | null>(null);
  const [itemToDeleteFromWishlist, setItemToDeleteFromWishlist] = useState<WishlistItem | null>(null);
  const [itemToDeleteFromExchange, setItemToDeleteFromExchange] = useState<ExchangeItem | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const [isFullScreenViewOpen, setIsFullScreenViewOpen] = useState(false);
  const [currentFullScreenCardIndex, setCurrentFullScreenCardIndex] = useState<number | null>(null);
  
  const [masterCardData, setMasterCardData] = useState<Map<string, ApiPokemonCard>>(new Map());
  const [loadingMasterData, setLoadingMasterData] = useState(false);


  const { toast } = useToast();

  // Debounced search term to avoid excessive re-renders
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // Optimized master data fetching with caching
  const fetchMasterData = useCallback(async () => {
    const allApiIds = [
      ...new Set(collection.map(c => c.apiId).filter(Boolean)),
      ...new Set(wishlist.map(w => w.apiId).filter(Boolean)),
      ...new Set(myExchangeItems.map(e => e.apiId).filter(Boolean)),
    ];
    
    const uniqueApiIds = [...new Set(allApiIds)];

    if (uniqueApiIds.length === 0) {
      setMasterCardData(new Map());
      return;
    }

    // Check cache first
    const cacheKey = 'masterCardCache';
    const cacheTimeKey = 'masterCardCacheTime';
    const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
    
    try {
      const cached = sessionStorage.getItem(cacheKey);
      const cacheTime = sessionStorage.getItem(cacheTimeKey);
      
      if (cached && cacheTime && Date.now() - parseInt(cacheTime) < CACHE_DURATION) {
        console.log('Using cached master card data');
        const cachedData = JSON.parse(cached);
        const dataMap = new Map<string, ApiPokemonCard>(cachedData);
        setMasterCardData(dataMap);
        return;
      }
    } catch (cacheError) {
      console.warn('Cache read error, proceeding with fresh fetch:', cacheError);
    }
    
    setLoadingMasterData(true);
    try {
      // Single batch request instead of chunked requests
      const response = await fetch('/api/master-cards-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: uniqueApiIds }),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch master card data: ${response.status}`);
      }

      const fetchedCards: ApiPokemonCard[] = await response.json();
      const dataMap = new Map<string, ApiPokemonCard>();
      fetchedCards.forEach(card => dataMap.set(card.id, card));
      
      // Cache the result
      try {
        sessionStorage.setItem(cacheKey, JSON.stringify([...dataMap]));
        sessionStorage.setItem(cacheTimeKey, Date.now().toString());
      } catch (cacheError) {
        console.warn('Cache write error:', cacheError);
      }
      
      setMasterCardData(dataMap);

    } catch (error) {
      console.error("Error fetching master card data:", error);
      toast({
        variant: "destructive",
        title: "Update Error",
        description: "Could not retrieve the latest market prices for some cards.",
      });
    } finally {
      setLoadingMasterData(false);
    }
  }, [collection, wishlist, myExchangeItems, toast]);

  // Debounced effect for master data fetching
  useEffect(() => {
    if (!loadingCollection && !loadingWishlist && !loadingMyExchangeItems) {
      const timeoutId = setTimeout(() => {
        fetchMasterData();
      }, 100); // Small delay to batch rapid changes
      
      return () => clearTimeout(timeoutId);
    }
  }, [fetchMasterData, loadingCollection, loadingWishlist, loadingMyExchangeItems]);


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


  // Memoized filtering and sorting functions
  const sortCards = useCallback((cards: PokemonCard[], option: string, masterData: Map<string, ApiPokemonCard>) => {
    const sorted = [...cards];
    
    switch (option) {
      case "favorites":
        return sorted.sort((a, b) => (b.isFavorite ? 1 : 0) - (a.isFavorite ? 1 : 0));
      case "nameAsc":
        return sorted.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
      case "nameDesc":
        return sorted.sort((a, b) => (b.name || "").localeCompare(a.name || ""));
      case "valueDesc":
        return sorted.sort((a, b) => {
          const aValue = getMarketPrice(masterData.get(a.apiId), a.variant) || a.value || 0;
          const bValue = getMarketPrice(masterData.get(b.apiId), b.variant) || b.value || 0;
          return bValue - aValue;
        });
      case "valueAsc":
        return sorted.sort((a, b) => {
          const aValue = getMarketPrice(masterData.get(a.apiId), a.variant) || a.value || 0;
          const bValue = getMarketPrice(masterData.get(b.apiId), b.variant) || b.value || 0;
          return aValue - bValue;
        });
      case "setAsc":
        return sorted.sort((a, b) => a.set.localeCompare(b.set) || (a.name || "").localeCompare(b.name || ""));
      case "dateAddedAsc":
        return sorted.reverse();
      case "quantityDesc":
        return sorted.sort((a, b) => (b.quantity || 1) - (a.quantity || 1));
      case "quantityAsc":
        return sorted.sort((a, b) => (a.quantity || 1) - (b.quantity || 1));
      case "dateAddedDesc":
      default:
        return sorted; // Default sort from Firestore
    }
  }, []);

  const filterItems = useCallback((items: any[], searchTerm: string) => {
    if (!searchTerm) return items;
    const lowerSearchTerm = searchTerm.toLowerCase();
    return items.filter(
      (item) =>
        item.name?.toLowerCase().includes(lowerSearchTerm) ||
        item.set?.toLowerCase().includes(lowerSearchTerm) ||
        item.cardNumber?.toLowerCase().includes(lowerSearchTerm)
    );
  }, []);

  // Memoized filtered and sorted data
  const filteredCards = useMemo(() => {
    const filtered = filterItems(collection, debouncedSearchTerm);
    return sortCards(filtered, sortOption, masterCardData);
  }, [collection, debouncedSearchTerm, sortOption, masterCardData, filterItems, sortCards]);

  const filteredWishlist = useMemo(() => {
    return filterItems(wishlist, debouncedSearchTerm);
  }, [wishlist, debouncedSearchTerm, filterItems]);

  const filteredExchangeItems = useMemo(() => {
    return filterItems(myExchangeItems, debouncedSearchTerm);
  }, [myExchangeItems, debouncedSearchTerm, filterItems]);

  const handleRemoveCard = (cardId: string) => {
    const cardToRemove = collection.find(c => c.id === cardId);
    if (cardToRemove) {
      setCardToDelete(cardToRemove);
      setItemToDeleteFromWishlist(null);
      setItemToDeleteFromExchange(null);
      setIsDeleteDialogOpen(true);
    }
  };

  const handleRemoveFromWishlist = (itemId: string) => {
    const itemToRemove = wishlist.find(i => i.id === itemId);
    if (itemToRemove) {
      setItemToDeleteFromWishlist(itemToRemove);
      setCardToDelete(null);
      setItemToDeleteFromExchange(null);
      setIsDeleteDialogOpen(true);
    }
  };

  const handleRemoveFromExchange = (item: ExchangeItem) => {
      setItemToDeleteFromExchange(item);
      setCardToDelete(null);
      setItemToDeleteFromWishlist(null);
      setIsDeleteDialogOpen(true);
  };

  const handleMoveToCollection = async (item: WishlistItem) => {
    try {
        await moveCardFromWishlistToCollection(item);
        toast({
            title: "Card Moved!",
            description: `${item.name} has been moved from your wishlist to your collection. You can now edit its details.`,
        });
    } catch(e: any) {
         toast({
            variant: "destructive",
            title: "Error",
            description: "Could not move card: " + e.message,
        });
    }
  };

  const confirmDelete = async () => {
    if (cardToDelete) {
        try {
          await removeCardFromCollection(cardToDelete.id);
          toast({ title: "Card Removed", description: `${cardToDelete.name} has been removed.` });
        } catch (e: any) {
          toast({ variant: "destructive", title: "Error", description: "Could not remove card: " + e.message });
        }
    } else if (itemToDeleteFromWishlist) {
        try {
            await removeCardFromWishlist(itemToDeleteFromWishlist.id);
            toast({ title: "Removed from Wishlist", description: `${itemToDeleteFromWishlist.name} has been removed.`});
        } catch(e: any) {
            toast({ variant: "destructive", title: "Error", description: "Could not remove from wishlist: " + e.message });
        }
    } else if (itemToDeleteFromExchange) {
        try {
            await removeCardFromExchange(itemToDeleteFromExchange.exchangeId);
            toast({ title: "Removed from Exchange", description: `${itemToDeleteFromExchange.name} has been removed from public trade listings.`});
        } catch(e: any) {
            toast({ variant: "destructive", title: "Error", description: "Could not remove from exchange: " + e.message });
        }
    }
    setIsDeleteDialogOpen(false);
    setCardToDelete(null);
    setItemToDeleteFromWishlist(null);
    setItemToDeleteFromExchange(null);
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

  const handleAddToExchange = async (card: PokemonCard) => {
    if (myExchangeItems.some(item => item.id === card.id)) {
        toast({
            variant: "default",
            title: "Already Listed",
            description: "This card is already in your exchange list.",
        });
        return;
    }

    try {
        await addCardToExchange(card);
        toast({
            title: "Card Listed for Exchange!",
            description: `${card.name} is now visible to other users for trade.`,
        });
    } catch (e: any) {
        toast({
            variant: "destructive",
            title: "Error",
            description: "Could not list card for exchange: " + e.message,
        });
    }
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
  
  const [selectedApiCard, setSelectedApiCard] = useState<ApiPokemonCard | null>(null);
  const [isAddCardDialogOpen, setIsAddCardDialogOpen] = useState(false);
  const handleViewOnWishlist = (item: WishlistItem) => {
      const masterVersion = masterCardData.get(item.apiId);
      if (masterVersion) {
        setSelectedApiCard(masterVersion);
        setIsAddCardDialogOpen(true);
      } else {
        toast({
            variant: "destructive",
            title: "Card Data Missing",
            description: "Could not find the master data for this card to show details."
        });
      }
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <AppHeader />
        <main className="flex-grow container mx-auto p-4 md:p-8 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="ml-3 text-xl text-muted-foreground">Authenticating...</p>
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
    <>
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

        <Tabs defaultValue="collection" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="collection">
                    <PackageOpen className="mr-2 h-4 w-4"/> My Collection ({collection.length})
                </TabsTrigger>
                <TabsTrigger value="wishlist">
                    <Heart className="mr-2 h-4 w-4"/> Wishlist ({wishlist.length})
                </TabsTrigger>
                <TabsTrigger value="exchange">
                    <Replace className="mr-2 h-4 w-4"/> For Exchange ({myExchangeItems.length})
                </TabsTrigger>
            </TabsList>
            <section id="collection-controls" aria-labelledby="collection-controls-heading" className="bg-card p-4 md:p-6 rounded-lg shadow mt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search..."
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
                 <Button onClick={resetFilters} variant="ghost" size="sm" className="text-sm text-muted-foreground hover:text-primary justify-self-start sm:col-span-2 lg:col-span-1 lg:justify-self-end">
                  <ListRestart className="mr-2 h-4 w-4" /> Reset Filters
                </Button>
              </div>
            </section>
            
            <TabsContent value="collection" className="mt-6">
                {loadingCollection ? (
                  <Card className="shadow-lg">
                    <CardContent className="p-6">
                      <div className="text-center py-8 flex flex-col items-center gap-2">
                        <Loader2 className="h-8 w-8 animate-spin text-primary"/>
                        <p className="text-muted-foreground">Loading your collection...</p>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <CardList
                    cards={filteredCards}
                    masterCardData={masterCardData}
                    onEditCard={handleEditCard}
                    onRemoveCard={handleRemoveCard}
                    onViewCard={openFullScreenView}
                    onToggleFavorite={handleToggleFavorite}
                    onAddToExchange={handleAddToExchange}
                    isLoadingMasterData={loadingMasterData}
                  />
                )}
            </TabsContent>
            
            <TabsContent value="wishlist" className="mt-6">
              {loadingWishlist ? (
                <Card className="shadow-lg">
                  <CardContent className="p-6">
                    <div className="text-center py-8 flex flex-col items-center gap-2">
                      <Loader2 className="h-8 w-8 animate-spin text-primary"/>
                      <p className="text-muted-foreground">Loading your wishlist...</p>
                    </div>
                  </CardContent>
                </Card>
              ) : filteredWishlist.length === 0 ? (
                  <Card className="shadow-lg"><CardContent className="p-6">
                    <div className="text-center py-8 flex flex-col items-center gap-2">
                      <Heart className="h-12 w-12 text-muted-foreground opacity-70"/>
                      <p className="text-muted-foreground">Your wishlist is empty.</p>
                      <p className="text-sm text-muted-foreground">Use the search or browse pages to find and add cards you want.</p>
                    </div>
                  </CardContent></Card>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                    {filteredWishlist.map(item => (
                       <Card key={item.id} className="relative group overflow-hidden">
                           <div className="absolute top-1 right-1 z-10 flex gap-1">
                                <Button size="icon" variant="destructive" className="h-7 w-7" onClick={() => handleRemoveFromWishlist(item.id)}>
                                    <X className="h-4 w-4" />
                                    <span className="sr-only">Remove from wishlist</span>
                                </Button>
                               <Button size="icon" className="h-7 w-7 bg-green-500 hover:bg-green-600" onClick={() => handleMoveToCollection(item)}>
                                    <Check className="h-4 w-4"/>
                                    <span className="sr-only">Move to collection</span>
                                </Button>
                           </div>
                           <div className="cursor-pointer" onClick={() => handleViewOnWishlist(item)}>
                                <Image
                                  src={item.imageUrl || "https://placehold.co/250x350.png"}
                                  alt={item.name || item.cardNumber}
                                  width={250}
                                  height={350}
                                  className="object-contain w-full h-full transition-transform duration-200 group-hover:scale-105"
                                  data-ai-hint="pokemon card front"
                                />
                           </div>
                       </Card>
                    ))}
                  </div>
                )
              }
            </TabsContent>

            <TabsContent value="exchange" className="mt-6">
              {filteredExchangeItems.length === 0 ? (
                  <Card className="shadow-lg"><CardContent className="p-6">
                    <div className="text-center py-8 flex flex-col items-center gap-2">
                      <Replace className="h-12 w-12 text-muted-foreground opacity-70"/>
                      <p className="text-muted-foreground">You have no cards listed for exchange.</p>
                      <p className="text-sm text-muted-foreground">Go to your collection and click the "Add to Exchange" button on a card to list it.</p>
                    </div>
                  </CardContent></Card>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                    {filteredExchangeItems.map(item => (
                       <Card key={item.exchangeId} className="relative group overflow-hidden">
                           <div className="absolute top-1 right-1 z-10 flex gap-1">
                                <Button size="icon" variant="destructive" className="h-7 w-7" onClick={() => handleRemoveFromExchange(item)}>
                                    <X className="h-4 w-4" />
                                    <span className="sr-only">Remove from exchange</span>
                                </Button>
                           </div>
                           <div className="cursor-pointer">
                                <Image
                                  src={item.imageUrl || "https://placehold.co/250x350.png"}
                                  alt={item.name || item.cardNumber}
                                  width={250}
                                  height={350}
                                  className="object-contain w-full h-full"
                                  data-ai-hint="pokemon card front"
                                />
                           </div>
                       </Card>
                    ))}
                  </div>
                )
              }
            </TabsContent>
        </Tabs>
      </main>

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
      
      {selectedApiCard && (
         <AddCardToCollectionDialog
            isOpen={isAddCardDialogOpen}
            onClose={() => setIsAddCardDialogOpen(false)}
            cardName={selectedApiCard.name}
            initialCardImageUrl={selectedApiCard.images.small}
            pokemonTcgApiCard={selectedApiCard}
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

      {isDeleteDialogOpen && (
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2"><AlertCircle className="text-destructive"/>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently remove the card 
                <span className="font-semibold"> {cardToDelete?.name || itemToDeleteFromWishlist?.name || itemToDeleteFromExchange?.name}</span> from your {cardToDelete ? 'collection' : itemToDeleteFromWishlist ? 'wishlist' : 'exchange list'}.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setIsDeleteDialogOpen(false)}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      <footer className="text-center py-4 text-sm text-muted-foreground border-t border-border mt-auto">
        PokéTRKR &copy; {new Date().getFullYear()}
      </footer>
    </div>
    </>
  );
}
