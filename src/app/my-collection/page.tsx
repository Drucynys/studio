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
import { AlertCircle, PackageOpen, Search, ListRestart, Trash2, Loader2, User, TrendingUp, DollarSign, Layers, Library, Heart, Check, X, Replace } from "lucide-react";
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
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const fetchMasterData = useCallback(async () => {
    const allApiIds = [
      ...new Set([
        ...collection.map(c => c.apiId),
        ...wishlist.map(w => w.apiId),
        ...myExchangeItems.map(e => e.apiId)
      ].filter(Boolean))
    ];

    if (allApiIds.length === 0) {
      setMasterCardData(new Map());
      return;
    }

    setLoadingMasterData(true);
    try {
      const CHUNK_SIZE = 100;
      const dataMap = new Map<string, ApiPokemonCard>();
      
      for (let i = 0; i < allApiIds.length; i += CHUNK_SIZE) {
        const chunk = allApiIds.slice(i, i + CHUNK_SIZE);
        const response = await fetch('/api/master-cards-batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: chunk }),
        });

        if (response.ok) {
          const fetchedCards: ApiPokemonCard[] = await response.json();
          fetchedCards.forEach(card => dataMap.set(card.id, card));
        }
      }
      
      setMasterCardData(dataMap);
    } catch (error) {
      console.error("Error fetching master card data:", error);
    } finally {
      setLoadingMasterData(false);
    }
  }, [collection, wishlist, myExchangeItems]);

  useEffect(() => {
    if (!loadingCollection && !loadingWishlist && !loadingMyExchangeItems && user) {
      fetchMasterData();
    }
  }, [user?.uid, loadingCollection, loadingWishlist, loadingMyExchangeItems, fetchMasterData]);

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
    
    const totalCards = collection.reduce((acc, card) => acc + (card.quantity || 1), 0);
    return { totalValueAdded, totalCurrentValue, totalCards, uniqueCards: collection.length };
  }, [collection, masterCardData]);

  const sortedCards = useMemo(() => {
    const filtered = collection.filter(item => {
      if (!debouncedSearchTerm) return true;
      const lower = debouncedSearchTerm.toLowerCase();
      return item.name?.toLowerCase().includes(lower) || 
             item.set?.toLowerCase().includes(lower) || 
             item.cardNumber?.toLowerCase().includes(lower);
    });

    return [...filtered].sort((a, b) => {
      switch (sortOption) {
        case "favorites": return (b.isFavorite ? 1 : 0) - (a.isFavorite ? 1 : 0);
        case "nameAsc": return (a.name || "").localeCompare(b.name || "");
        case "nameDesc": return (b.name || "").localeCompare(a.name || "");
        case "valueDesc": 
          const aV = getMarketPrice(masterCardData.get(a.apiId), a.variant) || a.value || 0;
          const bV = getMarketPrice(masterCardData.get(b.apiId), b.variant) || b.value || 0;
          return bV - aV;
        default: return 0;
      }
    });
  }, [collection, debouncedSearchTerm, sortOption, masterCardData]);

  const filteredWishlist = useMemo(() => 
    wishlist.filter(item => {
      if (!debouncedSearchTerm) return true;
      const lower = debouncedSearchTerm.toLowerCase();
      return item.name?.toLowerCase().includes(lower) || item.set?.toLowerCase().includes(lower);
    }), [wishlist, debouncedSearchTerm]);

  const filteredExchangeItems = useMemo(() => 
    myExchangeItems.filter(item => {
      if (!debouncedSearchTerm) return true;
      const lower = debouncedSearchTerm.toLowerCase();
      return item.name?.toLowerCase().includes(lower) || item.set?.toLowerCase().includes(lower);
    }), [myExchangeItems, debouncedSearchTerm]);

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <AppHeader />
        <main className="flex-grow container mx-auto p-4 md:p-8 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl font-headline font-semibold flex items-center gap-2">
              <TrendingUp className="h-6 w-6 text-primary" />
              Collection Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
              <div className="bg-muted p-4 rounded-lg">
                <h3 className="text-sm font-medium text-muted-foreground flex items-center justify-center gap-1"><DollarSign size={16}/>Total Value</h3>
                <p className="text-3xl font-bold text-primary">${collectionStats.totalCurrentValue.toFixed(2)}</p>
              </div>
              <div className="bg-muted p-4 rounded-lg">
                <h3 className="text-sm font-medium text-muted-foreground flex items-center justify-center gap-1"><Layers size={16}/>Total Cards</h3>
                <p className="text-3xl font-bold text-primary">{collectionStats.totalCards}</p>
              </div>
              <div className="bg-muted p-4 rounded-lg">
                <h3 className="text-sm font-medium text-muted-foreground flex items-center justify-center gap-1"><Library size={16}/>Unique</h3>
                <p className="text-3xl font-bold text-primary">{collectionStats.uniqueCards}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="collection" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="collection">Collection ({collection.length})</TabsTrigger>
            <TabsTrigger value="wishlist">Wishlist ({wishlist.length})</TabsTrigger>
            <TabsTrigger value="exchange">Exchange ({myExchangeItems.length})</TabsTrigger>
          </TabsList>

          <div className="bg-card p-4 rounded-lg shadow mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
            </div>
            <Select value={sortOption} onValueChange={setSortOption}>
              <SelectTrigger>
                <SelectValue placeholder="Sort by..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dateAddedDesc">Date Added (Newest)</SelectItem>
                <SelectItem value="favorites">Favorites First</SelectItem>
                <SelectItem value="nameAsc">Name (A-Z)</SelectItem>
                <SelectItem value="valueDesc">Value (High-Low)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <TabsContent value="collection" className="mt-6">
            <CardList
              cards={sortedCards}
              masterCardData={masterCardData}
              onEditCard={setCardToEdit}
              onRemoveCard={(id) => { setCardToDelete(collection.find(c => c.id === id) || null); setIsDeleteDialogOpen(true); }}
              onViewCard={(idx) => { setCurrentFullScreenCardIndex(idx); setIsFullScreenViewOpen(true); }}
              onToggleFavorite={(c) => updateCardInCollection({ ...c, isFavorite: !c.isFavorite })}
              onAddToExchange={addCardToExchange}
              isLoadingMasterData={loadingMasterData}
            />
          </TabsContent>
          
          <TabsContent value="wishlist" className="mt-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
              {filteredWishlist.map(item => (
                <Card key={item.id} className="relative group overflow-hidden">
                  <div className="absolute top-1 right-1 z-10 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button size="icon" variant="destructive" className="h-7 w-7" onClick={() => removeCardFromWishlist(item.id)}><X size={14}/></Button>
                    <Button size="icon" className="h-7 w-7 bg-green-500" onClick={() => moveCardFromWishlistToCollection(item)}><Check size={14}/></Button>
                  </div>
                  <Image src={item.imageUrl || "https://placehold.co/250x350.png"} alt={item.name} width={250} height={350} className="object-contain w-full" />
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="exchange" className="mt-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
              {filteredExchangeItems.map(item => (
                <Card key={item.exchangeId} className="relative group overflow-hidden">
                  <Button size="icon" variant="destructive" className="absolute top-1 right-1 z-10 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => removeCardFromExchange(item.exchangeId)}><X size={14}/></Button>
                  <Image src={item.imageUrl || "https://placehold.co/250x350.png"} alt={item.name} width={250} height={350} className="object-contain w-full" />
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {isFullScreenViewOpen && currentFullScreenCardIndex !== null && (
        <FullScreenCardView
          isOpen={isFullScreenViewOpen}
          onClose={() => setIsFullScreenViewOpen(false)}
          cards={sortedCards}
          currentIndex={currentFullScreenCardIndex}
          onNavigate={setCurrentFullScreenCardIndex}
          masterCardData={masterCardData}
        />
      )}

      {cardToEdit && (
        <EditCardDialog
          isOpen={!!cardToEdit}
          onClose={() => setCardToEdit(null)}
          card={cardToEdit}
          onSave={(u) => { updateCardInCollection(u); setCardToEdit(null); }}
        />
      )}

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently remove the item.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              if (cardToDelete) removeCardFromCollection(cardToDelete.id);
              setIsDeleteDialogOpen(false);
            }}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
