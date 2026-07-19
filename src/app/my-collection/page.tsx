// src/app/my-collection/page.tsx
'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { AppHeader } from '@/components/AppHeader';
import { CardList } from '@/components/CardList';
import type { PokemonCard, WishlistItem, ExchangeItem } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useMyCollectionState } from '@/hooks/useMyCollectionState';
import { EditCardDialog } from '@/components/EditCardDialog';
import { AddCardToCollectionDialog } from '@/components/AddCardToCollectionDialog';
import { getVariantAbbreviation } from '@/utils/cardUtils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  TrendingUp,
  DollarSign,
  Layers,
  Library,
  Search,
  PlusCircle,
  Camera,
  Trash2,
  Check,
  X,
  PackageOpen,
  ArrowRight,
  Heart,
  Replace,
  Sparkles,
  ArrowUpRight,
  HelpCircle,
  Loader2,
  User,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// --- WishlistCard Helper Component ---
interface WishlistCardProps {
  item: WishlistItem;
  onRemove: () => void;
  onMoveToCollection: () => void;
}

function WishlistCard({
  item,
  onRemove,
  onMoveToCollection,
}: WishlistCardProps): React.JSX.Element {
  const [isImageLoading, setIsImageLoading] = useState(true);

  return (
    <div className="group relative aspect-[63/88] w-full rounded-xl overflow-hidden border border-border/40 bg-card/45 backdrop-blur-xl shadow-md hover:shadow-primary/20 hover:scale-[1.03] active:scale-[0.98] transition-all duration-300">
      {/* Hover action overlay */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10 flex flex-col justify-between p-3">
        <div className="flex justify-end gap-2">
          <Button
            size="icon"
            variant="destructive"
            className="h-8 w-8 rounded-full shadow-lg active:scale-90 transition-transform"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            title="Remove from Wishlist"
          >
            <X size={15} />
          </Button>
          <Button
            size="icon"
            className="h-8 w-8 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full shadow-lg active:scale-90 transition-transform"
            onClick={(e) => {
              e.stopPropagation();
              onMoveToCollection();
            }}
            title="Move to Collection"
          >
            <Check size={15} />
          </Button>
        </div>

        <div className="bg-background/90 dark:bg-card/90 border border-border/40 p-2 rounded-lg backdrop-blur-md shadow-sm">
          <p className="font-semibold text-xs text-foreground truncate">{item.name}</p>
          <p className="text-[10px] text-muted-foreground truncate">
            {item.set} • #{item.cardNumber}
          </p>
        </div>
      </div>

      <Image
        src={item.imageUrl || 'https://placehold.co/250x350.png'}
        alt={item.name}
        fill
        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 200px"
        className={cn(
          'object-contain w-full h-full transition-all duration-500',
          isImageLoading ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
        )}
        onLoad={() => setIsImageLoading(false)}
      />
    </div>
  );
}

// --- ExchangeCard Helper Component ---
interface ExchangeCardProps {
  item: ExchangeItem;
  onRemove: () => void;
}

function ExchangeCard({ item, onRemove }: ExchangeCardProps): React.JSX.Element {
  const [isImageLoading, setIsImageLoading] = useState(true);

  return (
    <div className="group relative aspect-[63/88] w-full rounded-xl overflow-hidden border border-border/40 bg-card/45 backdrop-blur-xl shadow-md hover:shadow-primary/20 hover:scale-[1.03] active:scale-[0.98] transition-all duration-300">
      {/* Listed Badge */}
      <span className="absolute top-2 left-2 z-10 px-2.5 py-0.5 rounded-full text-[9px] font-bold tracking-wider bg-primary/95 text-primary-foreground shadow-sm flex items-center gap-1 backdrop-blur-sm">
        <Replace size={10} />
        LISTED
      </span>

      {/* Hover action overlay */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10 flex flex-col justify-between p-3">
        <div className="flex justify-end gap-2">
          <Button
            size="icon"
            variant="destructive"
            className="h-8 w-8 rounded-full shadow-lg active:scale-90 transition-transform"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            title="Remove from Exchange"
          >
            <X size={15} />
          </Button>
        </div>

        <div className="bg-background/90 dark:bg-card/90 border border-border/40 p-2 rounded-lg backdrop-blur-md shadow-sm">
          <p className="font-semibold text-xs text-foreground truncate">{item.name}</p>
          <p className="text-[10px] text-muted-foreground truncate">
            {item.set} • #{item.cardNumber}
          </p>
        </div>
      </div>

      <Image
        src={item.imageUrl || 'https://placehold.co/250x350.png'}
        alt={item.name}
        fill
        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 200px"
        className={cn(
          'object-contain w-full h-full transition-all duration-500',
          isImageLoading ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
        )}
        onLoad={() => setIsImageLoading(false)}
      />

      {/* Variant badge */}
      {(() => {
        const abbrev = getVariantAbbreviation(item.variant);
        if (!abbrev) return null;

        let colorClasses = '';
        if (abbrev === 'RR') {
          colorClasses = 'bg-rose-500/85 border-rose-400/40 text-white shadow-rose-500/25';
        } else if (abbrev === '1st') {
          colorClasses = 'bg-amber-500/85 border-amber-400/40 text-white shadow-amber-500/25';
        } else if (abbrev === 'H') {
          colorClasses = 'bg-indigo-500/85 border-indigo-400/40 text-white shadow-indigo-500/25';
        } else if (abbrev === 'UNL') {
          colorClasses = 'bg-slate-500/85 border-slate-400/40 text-white shadow-slate-500/25';
        } else {
          colorClasses = 'bg-teal-500/85 border-teal-400/40 text-white shadow-teal-500/25';
        }

        return (
          <span
            className={cn(
              'absolute bottom-2.5 left-2.5 z-10 px-1.5 py-0.5 rounded text-[9px] font-black uppercase border backdrop-blur-md shadow-sm transition-all duration-300 group-hover:scale-105',
              colorClasses
            )}
          >
            {abbrev}
          </span>
        );
      })()}
    </div>
  );
}

// --- Main Page Component ---
export default function MyCollectionPage(): React.JSX.Element {
  const {
    user,
    loading,
    collection,
    loadingCollection,
    wishlist,
    myExchangeItems,
    searchTerm,
    setSearchTerm,
    sortOption,
    setSortOption,
    cardToEdit,
    setCardToEdit,
    cardToDelete,
    setCardToDelete,
    itemToDeleteFromWishlist,
    setItemToDeleteFromWishlist,
    itemToDeleteFromExchange,
    setItemToDeleteFromExchange,
    isDeleteDialogOpen,
    setIsDeleteDialogOpen,
    isFullScreenViewOpen,
    setIsFullScreenViewOpen,
    currentFullScreenCardIndex,
    setCurrentFullScreenCardIndex,
    masterCardData,
    loadingMasterData,
    collectionStats,
    sortedCards,
    filteredWishlist,
    filteredExchangeItems,
    updateCardInCollection,
    removeCardFromCollection,
    removeCardFromWishlist,
    moveCardFromWishlistToCollection,
    addCardToExchange,
    removeCardFromExchange,
    openAuthModal,
  } = useMyCollectionState();

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <AppHeader />
        <main className="flex-grow container mx-auto p-4 md:p-8 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground animate-pulse">
              Syncing with Card Vault...
            </p>
          </div>
        </main>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <AppHeader />
        <main className="flex-grow container mx-auto p-4 md:p-8 flex items-center justify-center">
          <div className="max-w-md w-full bg-card/45 backdrop-blur-xl border border-border/40 p-8 rounded-2xl shadow-2xl text-center space-y-6">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-8 w-8 text-primary" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold tracking-tight">Access Your Collection</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Log in or sign up for a free account to start tracking card values, managing your
                collections, and exploring rare cards.
              </p>
            </div>
            <Button
              size="lg"
              className="w-full bg-primary shadow-lg shadow-primary/20 active:scale-[0.98] transition-transform"
              onClick={openAuthModal}
            >
              Login / Sign Up
            </Button>
          </div>
        </main>
      </div>
    );
  }

  // Calculate net profit/difference in valuation
  const valueDifference = collectionStats.totalCurrentValue - collectionStats.totalValueAdded;

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <AppHeader />
      <main className="flex-grow container mx-auto px-4 py-6 md:p-8 space-y-8">
        {/* Page Title & Quick Links banner */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border/40 pb-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-headline font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent flex items-center gap-3">
              <Library className="h-8 w-8 text-primary" />
              My Collection Vault
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Curate, value, and track your rare Pokémon TCG collectibles.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            <Link href="/search" className="flex-1 md:flex-initial">
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-1.5 h-10 border-border/40 bg-card/45 backdrop-blur-xl active:scale-[0.98] transition-transform"
              >
                <Search size={14} />
                <span>Search Cards</span>
              </Button>
            </Link>
            <Link href="/add-card" className="flex-1 md:flex-initial">
              <Button
                size="sm"
                className="w-full gap-1.5 h-10 bg-primary shadow-lg shadow-primary/10 hover:bg-primary/95 active:scale-[0.98] transition-transform"
              >
                <Camera size={14} />
                <span>AI Card Scanner</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Bento Grid Collection Summary */}
        <section aria-label="Collection Summary" className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Valuations Card */}
          <div className="relative overflow-hidden bg-card/45 backdrop-blur-xl border border-border/40 p-6 rounded-2xl shadow-xl hover:scale-[1.01] hover:shadow-2xl transition-all duration-300 flex flex-col justify-between">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl -z-10" />
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Portfolio Value</span>
              <div className="p-2.5 bg-emerald-500/10 text-emerald-500 rounded-xl">
                <TrendingUp size={18} />
              </div>
            </div>
            <div className="mt-4 space-y-1">
              <p className="text-4xl font-extrabold tracking-tight text-foreground font-mono">
                $
                {collectionStats.totalCurrentValue.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
              <div className="flex items-center gap-1.5 text-xs">
                {valueDifference !== 0 && (
                  <span
                    className={cn(
                      'font-semibold flex items-center px-1.5 py-0.5 rounded',
                      valueDifference > 0
                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                        : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                    )}
                  >
                    {valueDifference > 0 ? '+' : '-'}$
                    {Math.abs(valueDifference).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                )}
                <span className="text-muted-foreground">
                  vs cost base ($
                  {collectionStats.totalValueAdded.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                  )
                </span>
              </div>
            </div>
          </div>

          {/* Catalog Metrics Card */}
          <div className="relative overflow-hidden bg-card/45 backdrop-blur-xl border border-border/40 p-6 rounded-2xl shadow-xl hover:scale-[1.01] hover:shadow-2xl transition-all duration-300 flex flex-col justify-between">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl -z-10" />
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Total Card Count</span>
              <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
                <Layers size={18} />
              </div>
            </div>
            <div className="mt-4 space-y-1">
              <p className="text-4xl font-extrabold tracking-tight text-foreground font-mono">
                {collectionStats.totalCards.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Sparkles size={12} className="text-accent" />
                <span>Across all items and expansion sets</span>
              </p>
            </div>
          </div>

          {/* Completion Indices Card */}
          <div className="relative overflow-hidden bg-card/45 backdrop-blur-xl border border-border/40 p-6 rounded-2xl shadow-xl hover:scale-[1.01] hover:shadow-2xl transition-all duration-300 flex flex-col justify-between">
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-2xl -z-10" />
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">
                Unique Species Cataloged
              </span>
              <div className="p-2.5 bg-purple-500/10 text-purple-500 rounded-xl">
                <Library size={18} />
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <div className="flex items-baseline gap-2">
                <p className="text-4xl font-extrabold tracking-tight text-foreground font-mono">
                  {collectionStats.uniqueCards.toLocaleString()}
                </p>
                <span className="text-xs text-muted-foreground">species</span>
              </div>

              {/* Sleek inline completion progress bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-semibold text-muted-foreground">
                  <span>Unique Completeness Ratio</span>
                  <span>
                    {collectionStats.totalCards > 0
                      ? ((collectionStats.uniqueCards / collectionStats.totalCards) * 100).toFixed(
                          0
                        )
                      : 0}
                    %
                  </span>
                </div>
                <div className="h-1.5 w-full bg-muted dark:bg-muted/30 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-purple-500 rounded-full transition-all duration-500"
                    style={{
                      width: `${collectionStats.totalCards > 0 ? (collectionStats.uniqueCards / collectionStats.totalCards) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Filter and Tab Section */}
        <Tabs defaultValue="collection" className="w-full space-y-6">
          {/* Unified Liquid Glass navigation and filter panel */}
          <div className="bg-card/45 backdrop-blur-xl border border-border/40 p-3 rounded-2xl shadow-lg flex flex-col md:flex-row gap-4 items-center justify-between">
            <TabsList className="grid grid-cols-3 w-full md:w-auto min-w-[280px] md:min-w-[400px] bg-background/50 border border-border/30 rounded-xl p-1">
              <TabsTrigger
                value="collection"
                className="text-xs font-semibold rounded-lg py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all"
              >
                Collection ({collection.length})
              </TabsTrigger>
              <TabsTrigger
                value="wishlist"
                className="text-xs font-semibold rounded-lg py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all"
              >
                Wishlist ({wishlist.length})
              </TabsTrigger>
              <TabsTrigger
                value="exchange"
                className="text-xs font-semibold rounded-lg py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all"
              >
                Exchange ({myExchangeItems.length})
              </TabsTrigger>
            </TabsList>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full md:w-auto md:max-w-md flex-grow">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Filter by name or set..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 bg-background/40 focus:bg-background/80 border-border/30 h-10 w-full rounded-xl transition-all"
                />
              </div>
              <Select value={sortOption} onValueChange={setSortOption}>
                <SelectTrigger className="bg-background/40 focus:bg-background/80 border-border/30 h-10 rounded-xl text-left">
                  <SelectValue placeholder="Sort cards..." />
                </SelectTrigger>
                <SelectContent className="rounded-xl border border-border/40">
                  <SelectItem value="dateAddedDesc">Date Added (Newest)</SelectItem>
                  <SelectItem value="favorites">Favorites First</SelectItem>
                  <SelectItem value="nameAsc">Name (A-Z)</SelectItem>
                  <SelectItem value="valueDesc">Market Value (High-Low)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* TAB 1: Collection Grid */}
          <TabsContent value="collection" className="mt-0 focus-visible:ring-0">
            <CardList
              cards={sortedCards}
              masterCardData={masterCardData}
              onViewCard={(idx) => {
                setCurrentFullScreenCardIndex(idx);
                setIsFullScreenViewOpen(true);
              }}
              isLoadingMasterData={loadingMasterData}
            />
          </TabsContent>

          {/* TAB 2: Wishlist Grid */}
          <TabsContent value="wishlist" className="mt-0 focus-visible:ring-0">
            {filteredWishlist.length === 0 ? (
              <div className="bg-card/45 backdrop-blur-xl border border-border/40 rounded-2xl p-12 text-center max-w-lg mx-auto space-y-5 shadow-xl">
                <div className="mx-auto w-12 h-12 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-500">
                  <Heart size={24} className="fill-current" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-foreground">Wishlist Empty</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {searchTerm
                      ? 'No cards matching your filter were found in your wishlist.'
                      : 'Add cards you desire to your wishlist from set lists or card detail sheets.'}
                  </p>
                </div>
                {!searchTerm && (
                  <Link href="/browse-sets" className="inline-block">
                    <Button size="sm" className="gap-1.5 active:scale-[0.98] transition-transform">
                      Browse Expansion Sets
                      <ArrowRight size={14} />
                    </Button>
                  </Link>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                {filteredWishlist.map((item) => (
                  <WishlistCard
                    key={item.id}
                    item={item}
                    onRemove={() => {
                      setItemToDeleteFromWishlist(item);
                      setIsDeleteDialogOpen(true);
                    }}
                    onMoveToCollection={() => moveCardFromWishlistToCollection(item)}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* TAB 3: Exchange Grid */}
          <TabsContent value="exchange" className="mt-0 focus-visible:ring-0">
            {filteredExchangeItems.length === 0 ? (
              <div className="bg-card/45 backdrop-blur-xl border border-border/40 rounded-2xl p-12 text-center max-w-lg mx-auto space-y-5 shadow-xl">
                <div className="mx-auto w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <Replace size={24} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-foreground">No Listings Active</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {searchTerm
                      ? 'No listed cards match your filter criteria.'
                      : "Share cards for trade by selecting 'Add to Exchange' inside your collection cards."}
                  </p>
                </div>
                {!searchTerm && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 border-border/40 active:scale-[0.98] transition-transform"
                    onClick={() => {
                      const collectionTab = document.querySelector(
                        '[value="collection"]'
                      ) as HTMLButtonElement | null;
                      if (collectionTab) collectionTab.click();
                    }}
                  >
                    View Collection Cards
                    <ArrowRight size={14} />
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                {filteredExchangeItems.map((item) => (
                  <ExchangeCard
                    key={item.exchangeId}
                    item={item}
                    onRemove={() => {
                      setItemToDeleteFromExchange(item);
                      setIsDeleteDialogOpen(true);
                    }}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* --- Fullscreen Card Modal --- */}
      {isFullScreenViewOpen && currentFullScreenCardIndex !== null && sortedCards[currentFullScreenCardIndex] && (
        <AddCardToCollectionDialog
          isOpen={isFullScreenViewOpen}
          onClose={() => setIsFullScreenViewOpen(false)}
          cardName={sortedCards[currentFullScreenCardIndex].name}
          initialCardImageUrl={sortedCards[currentFullScreenCardIndex].imageUrl}
          pokemonTcgApiCard={
            masterCardData.get(sortedCards[currentFullScreenCardIndex].apiId) || null
          }
          onPrevCard={
            currentFullScreenCardIndex > 0
              ? () => setCurrentFullScreenCardIndex(currentFullScreenCardIndex - 1)
              : undefined
          }
          onNextCard={
            currentFullScreenCardIndex < sortedCards.length - 1
              ? () => setCurrentFullScreenCardIndex(currentFullScreenCardIndex + 1)
              : undefined
          }
          hasPrevCard={currentFullScreenCardIndex > 0}
          hasNextCard={currentFullScreenCardIndex < sortedCards.length - 1}
          prevCardImageUrl={
            currentFullScreenCardIndex > 0
              ? sortedCards[currentFullScreenCardIndex - 1].imageUrl
              : null
          }
          nextCardImageUrl={
            currentFullScreenCardIndex < sortedCards.length - 1
              ? sortedCards[currentFullScreenCardIndex + 1].imageUrl
              : null
          }
          initialVariant={sortedCards[currentFullScreenCardIndex].variant}
          initialQuantity={sortedCards[currentFullScreenCardIndex].quantity}
          apiId={sortedCards[currentFullScreenCardIndex].apiId}
          collectionItemId={sortedCards[currentFullScreenCardIndex].id}
        />
      )}

      {/* --- Edit Card Value / Details Dialog --- */}
      {cardToEdit && (
        <EditCardDialog
          isOpen={!!cardToEdit}
          onClose={() => setCardToEdit(null)}
          card={cardToEdit}
          onSave={(updatedCard) => {
            updateCardInCollection(updatedCard);
            setCardToEdit(null);
          }}
        />
      )}

      {/* --- Universal Delete Confirmation Dialog --- */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="rounded-2xl border border-border/40 bg-card/90 backdrop-blur-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl">Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground">
              This action cannot be undone. It will permanently remove
              <span className="font-semibold text-foreground">
                {' '}
                {cardToDelete?.name ||
                  itemToDeleteFromWishlist?.name ||
                  itemToDeleteFromExchange?.name ||
                  'this item'}
              </span>{' '}
              from your list.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="rounded-xl border border-border/40">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl bg-destructive hover:bg-destructive/95 text-white active:scale-95 transition-transform"
              onClick={() => {
                if (cardToDelete) {
                  removeCardFromCollection(cardToDelete.id);
                  setCardToDelete(null);
                } else if (itemToDeleteFromWishlist) {
                  removeCardFromWishlist(itemToDeleteFromWishlist.id);
                  setItemToDeleteFromWishlist(null);
                } else if (itemToDeleteFromExchange) {
                  removeCardFromExchange(itemToDeleteFromExchange.exchangeId);
                  setItemToDeleteFromExchange(null);
                }
                setIsDeleteDialogOpen(false);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
