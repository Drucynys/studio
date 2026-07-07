// src/app/sets/[setId]/page.tsx
'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { AppHeader } from '@/components/AppHeader';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AddCardToCollectionDialog } from '@/components/AddCardToCollectionDialog';
import { useAuth } from '@/hooks/useAuth';
import { useUserCollection } from '@/hooks/useUserCollection';
import { useBulkAdd } from '@/hooks/useBulkAdd';
import { BulkAddDialog } from '@/components/BulkAddDialog';
import { formatVariantKey } from '@/utils/cardUtils';
import { useUIStore } from '@/store/useUIStore';
import {
  Loader2,
  ServerCrash,
  ArrowLeft,
  Images,
  Search,
  CalendarDays,
  Hash,
  Grid,
  List,
  Check,
  Layers,
  X,
} from 'lucide-react';
import { CardSkeleton } from '@/components/CardSkeleton';
import { useToast } from '@/hooks/use-toast';
import { ToastAction } from '@/components/ui/toast';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';

export interface ApiPokemonCard {
  id: string;
  name: string;
  set: {
    id: string;
    name: string;
    series: string;
    logo?: string;
    releaseDate: string;
    printedTotal: number;
    total: number;
  };
  number: string;
  rarity?: string;
  artist?: string;
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
  supertypes?: string[];
  types?: string[];
}

interface SetDetails {
  id: string;
  name: string;
  logoUrl?: string;
  releaseDate: string;
  totalCards: number;
  series: string;
}

const CARDS_PER_PAGE = 60;

const GalleryCard = ({
  card,
  isCollected,
  onClick,
  priority,
  isBulkMode = false,
  isSelected = false,
}: {
  card: ApiPokemonCard;
  isCollected: boolean;
  onClick: () => void;
  priority?: boolean;
  isBulkMode?: boolean;
  isSelected?: boolean;
}): React.JSX.Element => {
  const [isImageLoading, setIsImageLoading] = useState(true);

  return (
    <div
      onClick={onClick}
      className="group relative aspect-[2.5/3.5] w-full cursor-pointer transition-transform duration-200 hover:scale-105"
    >
      <div
        className={cn(
          'absolute inset-0 rounded-lg overflow-hidden transition-all duration-300',
          isImageLoading && 'animate-shimmer bg-muted/40',
          isBulkMode
            ? isSelected
              ? 'ring-2 ring-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.4)]'
              : 'opacity-60'
            : isCollected && 'ring-2 ring-green-500'
        )}
      >
        <Image
          src={card.images.small}
          alt={card.name}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 200px"
          priority={priority}
          className={cn(
            'bg-card shadow-md rounded-lg transition-all duration-300 object-contain',
            isImageLoading ? 'opacity-0 scale-95' : 'opacity-100 scale-100',
            isBulkMode
              ? isSelected
                ? 'saturate-100'
                : 'saturate-[.3] group-hover:saturate-100'
              : isCollected
              ? 'saturate-100'
              : 'saturate-[.1] group-hover:saturate-100'
          )}
          onLoad={() => setIsImageLoading(false)}
          data-ai-hint="pokemon card front"
        />
      </div>

      {isBulkMode && (
        <div
          className={cn(
            'absolute top-1.5 left-1.5 z-10 h-6 w-6 rounded-full flex items-center justify-center border shadow-sm transition-all duration-200',
            isSelected
              ? 'bg-blue-600 border-blue-400 text-white scale-110'
              : 'bg-black/40 border-white/20 text-transparent group-hover:bg-black/60 group-hover:border-white/40'
          )}
        >
          <Check className={cn('h-3.5 w-3.5 stroke-[3px]', isSelected ? 'opacity-100' : 'opacity-0')} />
        </div>
      )}

      <Badge
        className={cn(
          'absolute bottom-1 right-1 z-10 text-white border-transparent transition-opacity group-hover:opacity-0',
          isCollected ? 'bg-green-600' : 'bg-black/60'
        )}
      >
        #{card.number}
      </Badge>
    </div>
  );
};

const SetDetailsPage = (): React.JSX.Element => {
  const params = useParams();
  const router = useRouter();
  const setId = params.setId as string;
  const { user } = useAuth();
  const { openAuthModal } = useUIStore();
  const { collection } = useUserCollection(user?.uid);

  const {
    isBulkMode,
    selectedCards,
    isDialogOpen: isBulkDialogOpen,
    isAdding: isAddingBulk,
    quantities: bulkQuantities,
    toggleBulkMode,
    toggleCardSelection,
    isSelected: isSelectedFn,
    clearSelection,
    selectAllCards,
    openBulkDialog,
    closeBulkDialog,
    setQuantity,
    incrementQuantity,
    decrementQuantity,
    submitBulkAdd,
  } = useBulkAdd(collection);

  const [setDetails, setSetDetails] = useState<SetDetails | null>(null);
  const [cardsInSet, setCardsInSet] = useState<ApiPokemonCard[]>([]);
  const [filteredCards, setFilteredCards] = useState<ApiPokemonCard[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [lastLoadedNumber, setLastLoadedNumber] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [selectedApiCard, setSelectedApiCard] = useState<ApiPokemonCard | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [ownershipFilter, setOwnershipFilter] = useState<'all' | 'owned' | 'missing'>('all');
  const [densityMode, setDensityMode] = useState<'gallery' | 'list'>('gallery');
  const [lastScrollY, setLastScrollY] = useState(0);
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);

  const { toast } = useToast();

  const currentCardIndex = useMemo(() => {
    if (!selectedApiCard) return -1;
    return filteredCards.findIndex((c) => c.id === selectedApiCard.id);
  }, [selectedApiCard, filteredCards]);

  const handlePrevCard = useCallback(() => {
    if (currentCardIndex > 0) {
      setSelectedApiCard(filteredCards[currentCardIndex - 1]);
    }
  }, [currentCardIndex, filteredCards]);

  const handleNextCard = useCallback(() => {
    if (currentCardIndex < filteredCards.length - 1) {
      setSelectedApiCard(filteredCards[currentCardIndex + 1]);
    }
  }, [currentCardIndex, filteredCards]);

  const safeFormatDate = (dateString?: string) => {
    if (!dateString) return 'Unknown Release Date';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      return format(date, 'MMM d, yyyy');
    } catch {
      return dateString;
    }
  };

  const fetchSetDetails = useCallback(async () => {
    try {
      const setResponse = await fetch(`/api/sets/${setId}`);
      if (!setResponse.ok) {
        const errorData = await setResponse.json().catch(() => ({}));
        throw new Error(errorData.message || `Set with ID "${setId}" not found in database.`);
      }
      const setInfo = await setResponse.json();
      setSetDetails({
        id: setInfo.id,
        name: setInfo.name,
        logoUrl: setInfo.images?.logo,
        releaseDate: setInfo.releaseDate,
        totalCards: setInfo.printedTotal || setInfo.total || 0,
        series: setInfo.series,
      });
    } catch (err: any) {
      setError(err.message);
    }
  }, [setId]);

  const fetchCards = useCallback(
    async (loadMore = false, cursorOverride?: string | null) => {
      if (!setId) return;

      const cursor = loadMore ? (cursorOverride ?? lastLoadedNumber) : null;

      if (loadMore) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
        setCardsInSet([]);
        setLastLoadedNumber(null);
      }
      setError(null);

      try {
        const queryParams = new URLSearchParams({ limit: String(CARDS_PER_PAGE) });
        if (cursor) {
          queryParams.set('startAfterNumber', cursor);
        }

        const cardsResponse = await fetch(`/api/cards/by-set/${setId}?${queryParams.toString()}`);
        if (!cardsResponse.ok) {
          const errorData = await cardsResponse.json().catch(() => ({}));
          throw new Error(errorData.message || `Failed to fetch cards for set ${setId}`);
        }

        let newCards: ApiPokemonCard[] = await cardsResponse.json();

        setCardsInSet((prev) => {
          if (!loadMore) return newCards;
          const existingIds = new Set(prev.map((c) => c.id));
          const uniqueNewCards = newCards.filter((c) => !existingIds.has(c.id));
          return [...prev, ...uniqueNewCards];
        });
        setHasMore(newCards.length === CARDS_PER_PAGE);

        if (newCards.length > 0) {
          setLastLoadedNumber(newCards[newCards.length - 1].number);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [setId, lastLoadedNumber]
  ); // Still depends on lastLoadedNumber for the cursor

  // Initial load effect - only run once when setId changes
  useEffect(() => {
    fetchSetDetails();
    // We call fetchCards(false) here.
    // To avoid the loop, we use a separate effect for initial load.
    const loadInitial = async () => {
      if (setId) {
        // We pass null to ensure it's an initial load
        const params = new URLSearchParams({ limit: String(CARDS_PER_PAGE) });
        setIsLoading(true);
        try {
          const res = await fetch(`/api/cards/by-set/${setId}?${params.toString()}`);
          const data = await res.json();
          setCardsInSet(data);
          setHasMore(data.length === CARDS_PER_PAGE);
          if (data.length > 0) {
            setLastLoadedNumber(data[data.length - 1].number);
          }
        } catch (err: any) {
          setError(err.message);
        } finally {
          setIsLoading(false);
        }
      }
    };
    loadInitial();
  }, [setId, fetchSetDetails]);

  useEffect(() => {
    const scrollHandler = () => {
      const currentScrollY = window.scrollY;

      setLastScrollY((prevLastScrollY) => {
        if (Math.abs(currentScrollY - prevLastScrollY) < 10) return prevLastScrollY;

        if (currentScrollY > prevLastScrollY && currentScrollY > 100) {
          setIsHeaderVisible(false); // scrolling down
        } else {
          setIsHeaderVisible(true); // scrolling up
        }

        return currentScrollY;
      });
    };

    window.addEventListener('scroll', scrollHandler, { passive: true });

    return () => {
      window.removeEventListener('scroll', scrollHandler);
    };
  }, []);

  useEffect(() => {
    const lowercasedFilter = searchTerm.toLowerCase();
    let filteredData = cardsInSet.filter(
      (card) =>
        card.name.toLowerCase().includes(lowercasedFilter) ||
        card.number.toLowerCase().includes(lowercasedFilter) ||
        (card.rarity && card.rarity.toLowerCase().includes(lowercasedFilter))
    );

    if (user) {
      const ownedCardApiIds = new Set(collection.map((c) => c.apiId));
      if (ownershipFilter === 'owned') {
        filteredData = filteredData.filter((card) => ownedCardApiIds.has(card.id));
      } else if (ownershipFilter === 'missing') {
        filteredData = filteredData.filter((card) => !ownedCardApiIds.has(card.id));
      }
    }

    setFilteredCards(filteredData);
  }, [searchTerm, cardsInSet, ownershipFilter, user, collection]);

  const openDialogForCard = (card: ApiPokemonCard) => {
    setSelectedApiCard(card);
    setIsDialogOpen(true);
  };

  const setCompletion = useMemo(() => {
    if (!setDetails?.name || cardsInSet.length === 0)
      return { collected: 0, total: 0, percentage: 0 };
    const collectedCardIdentifiersInSet = new Set<string>();
    collection.forEach((card) => {
      if (card.set === setDetails.name && card.language === 'English') {
        collectedCardIdentifiersInSet.add(`${card.name}-${card.cardNumber}`);
      }
    });
    const uniqueCollectedCount = collectedCardIdentifiersInSet.size;
    const totalInThisSet = cardsInSet.length;
    const percentage =
      totalInThisSet > 0
        ? parseFloat(((uniqueCollectedCount / totalInThisSet) * 100).toFixed(1))
        : 0;
    return { collected: uniqueCollectedCount, total: totalInThisSet, percentage };
  }, [setDetails, cardsInSet, collection]);

  if (isLoading && !setDetails) {
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
        {setDetails && (
          <div
            className={cn(
              'p-4 md:p-6 bg-card rounded-lg shadow-xl mb-6 sticky z-40 transition-all duration-300 ease-in-out',
              isHeaderVisible
                ? 'top-[65px] md:top-[77px] opacity-100'
                : 'top-[-300px] opacity-0 pointer-events-none shadow-none'
            )}
          >
            <CardHeader className="p-0">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-center justify-between w-full md:w-auto gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    {setDetails.logoUrl && (
                      <div className="relative w-16 h-12 flex-shrink-0">
                        <Image
                          src={setDetails.logoUrl}
                          alt={`${setDetails.name} logo`}
                          fill
                          sizes="64px"
                          className="self-start object-contain"
                          data-ai-hint="pokemon set logo"
                        />
                      </div>
                    )}
                    <div className="min-w-0">
                      <CardTitle className="font-headline text-xl md:text-3xl text-foreground truncate">
                        {setDetails.name}
                      </CardTitle>
                      <CardDescription className="text-xs md:text-md text-muted-foreground truncate">
                        {setDetails.series} Series
                      </CardDescription>
                    </div>
                  </div>

                  {/* Standalone Circular Completion badge for consistency */}
                  <div className="shrink-0 flex items-center bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200/50 dark:border-zinc-800/50 p-1.5 rounded-2xl shadow-sm hover:scale-[1.02] transition-transform duration-200">
                    <div className="relative flex items-center justify-center h-12 w-12 flex-shrink-0">
                      <svg className="h-12 w-12 transform -rotate-90">
                        {/* Track Circle */}
                        <circle
                          className="text-zinc-200 dark:text-zinc-800"
                          strokeWidth="3"
                          stroke="currentColor"
                          fill="transparent"
                          r="20"
                          cx="24"
                          cy="24"
                        />
                        {/* Progress Circle */}
                        <circle
                          className="text-primary transition-all duration-500 ease-out"
                          strokeWidth="3"
                          strokeDasharray={2 * Math.PI * 20}
                          strokeDashoffset={
                            2 * Math.PI * 20 - (setCompletion.percentage / 100) * (2 * Math.PI * 20)
                          }
                          strokeLinecap="round"
                          stroke="currentColor"
                          fill="transparent"
                          r="20"
                          cx="24"
                          cy="24"
                        />
                      </svg>
                      {/* Inner text */}
                      <span className="absolute text-[9px] font-black text-foreground">
                        {setCompletion.collected}/{setCompletion.total}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto mt-4 md:mt-0">
                  <div className="relative flex-grow md:w-[240px] lg:w-[280px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Search cards in set..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 w-full"
                    />
                  </div>
                  <Button
                    variant={isBulkMode ? 'destructive' : 'outline'}
                    size="sm"
                    className={cn(
                      'h-9 font-bold px-3 transition-all rounded-lg shrink-0 flex items-center gap-1.5 shadow-sm select-none',
                      isBulkMode
                        ? 'bg-red-500/10 text-red-600 hover:bg-red-500/20 hover:text-red-700 border-red-500/30 dark:border-red-500/20'
                        : 'bg-white/40 dark:bg-zinc-800/10 hover:bg-white/60 dark:hover:bg-zinc-800/20 border-white/50 dark:border-white/10'
                    )}
                    onClick={() => {
                      if (!user) {
                        openAuthModal();
                      } else {
                        toggleBulkMode();
                      }
                    }}
                  >
                    {isBulkMode ? (
                      <>
                        <X className="h-4 w-4" />
                        <span>Cancel</span>
                      </>
                    ) : (
                      <>
                        <Layers className="h-4 w-4 text-primary" />
                        <span>Bulk Add</span>
                      </>
                    )}
                  </Button>
                  <div className="flex bg-muted p-1 rounded-lg border shrink-0">
                    <Button
                      variant={densityMode === 'gallery' ? 'secondary' : 'ghost'}
                      size="sm"
                      className={cn(
                        'h-8 w-8 p-0 transition-all rounded-md',
                        densityMode === 'gallery' &&
                          'bg-background shadow-sm text-foreground hover:bg-background'
                      )}
                      onClick={() => setDensityMode('gallery')}
                      title="Gallery View"
                    >
                      <Grid className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={densityMode === 'list' ? 'secondary' : 'ghost'}
                      size="sm"
                      className={cn(
                        'h-8 w-8 p-0 transition-all rounded-md',
                        densityMode === 'list' &&
                          'bg-background shadow-sm text-foreground hover:bg-background'
                      )}
                      onClick={() => setDensityMode('list')}
                      title="List View"
                    >
                      <List className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-y-4 gap-x-8 pt-3 border-t border-border/40 mt-3">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <CalendarDays className="h-3.5 w-3.5 text-primary" />
                    {safeFormatDate(setDetails.releaseDate)}
                  </span>
                  <span className="text-border/60 hidden sm:inline">•</span>
                  <span className="flex items-center gap-1">
                    <Hash className="h-3.5 w-3.5 text-primary" />
                    <span>
                      {filteredCards.length} of {setDetails.totalCards} cards shown
                    </span>
                  </span>
                </div>
                {user && (
                  <div className="flex bg-muted p-1 rounded-lg border w-full md:w-auto">
                    <Button
                      variant={ownershipFilter === 'all' ? 'secondary' : 'ghost'}
                      size="sm"
                      className={cn(
                        'h-8 text-xs font-semibold flex-1 md:flex-initial transition-all rounded-md',
                        ownershipFilter === 'all' &&
                          'bg-background shadow-sm text-foreground hover:bg-background'
                      )}
                      onClick={() => setOwnershipFilter('all')}
                    >
                      All
                    </Button>
                    <Button
                      variant={ownershipFilter === 'owned' ? 'secondary' : 'ghost'}
                      size="sm"
                      className={cn(
                        'h-8 text-xs font-semibold flex-1 md:flex-initial transition-all rounded-md',
                        ownershipFilter === 'owned' &&
                          'bg-green-500/10 text-green-600 hover:bg-green-500/15'
                      )}
                      onClick={() => setOwnershipFilter('owned')}
                    >
                      Owned
                    </Button>
                    <Button
                      variant={ownershipFilter === 'missing' ? 'secondary' : 'ghost'}
                      size="sm"
                      className={cn(
                        'h-8 text-xs font-semibold flex-1 md:flex-initial transition-all rounded-md',
                        ownershipFilter === 'missing' &&
                          'bg-destructive/10 text-destructive hover:bg-destructive/15'
                      )}
                      onClick={() => setOwnershipFilter('missing')}
                    >
                      Missing
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center py-10 text-destructive">
            <ServerCrash className="h-16 w-16 mb-4" />
            <p className="text-xl font-semibold">Oops! Something went wrong.</p>
            <p className="text-center">
              Could not load cards for this set: {error}.<br />
              Please try again later or check the set ID.
            </p>
          </div>
        )}
        {isLoading && (
          <div className="pb-8">
            <CardSkeleton count={12} />
          </div>
        )}
        {!isLoading && !error && (
          <div className="pb-8">
            {densityMode === 'list' ? (
              <div className="border rounded-lg overflow-hidden bg-card mt-4 px-4 divide-y divide-border">
                {filteredCards.map((card) => {
                  const cardCollectedItems = collection.filter(
                    (collected) =>
                      collected.name === card.name &&
                      collected.set === card.set.name &&
                      collected.cardNumber === card.number &&
                      collected.language === 'English'
                  );
                  const isCollected = cardCollectedItems.length > 0;
                  const isSelected = isBulkMode && isSelectedFn(card.id);

                  return (
                    <div
                      key={card.id}
                      onClick={() => {
                        if (isBulkMode) {
                          toggleCardSelection(card);
                        } else {
                          openDialogForCard(card);
                        }
                      }}
                      className={cn(
                        'flex items-center justify-between py-3 px-3 -mx-3 hover:bg-muted/30 cursor-pointer transition-colors rounded-lg',
                        isSelected && 'bg-blue-500/5 dark:bg-blue-500/10 border border-blue-500/20'
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {isBulkMode && (
                          <div
                            className={cn(
                              'h-5 w-5 rounded-full flex items-center justify-center border transition-all duration-200 mr-1 flex-shrink-0',
                              isSelected
                                ? 'bg-blue-600 border-blue-400 text-white'
                                : 'bg-transparent border-border text-transparent'
                            )}
                          >
                            <Check className={cn('h-3 w-3 stroke-[3px]', isSelected ? 'opacity-100' : 'opacity-0')} />
                          </div>
                        )}
                        {/* Mini artwork thumbnail sprite */}
                        <div className="relative w-10 h-14 bg-muted/20 rounded border border-border/30 overflow-hidden flex-shrink-0">
                          <Image
                            src={card.images.small}
                            alt={card.name}
                            fill
                            sizes="40px"
                            className="object-cover"
                            unoptimized
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-sm text-foreground truncate">
                            {card.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            #{card.number} {card.rarity && `• ${card.rarity}`}
                          </p>
                          {isCollected && (
                            <div className="flex flex-wrap gap-1 mt-1.5" onClick={(e) => e.stopPropagation()}>
                              {cardCollectedItems.map((item) => (
                                <span
                                  key={item.id}
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/15"
                                >
                                  {item.variant ? formatVariantKey(item.variant) : 'Standard'}
                                  <span className="text-muted-foreground font-normal">
                                    x{item.quantity}
                                  </span>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {isCollected ? (
                          <Badge className="bg-green-500/10 text-green-600 border-green-500/20 hover:bg-green-500/15">
                            Owned
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="text-muted-foreground border-border bg-transparent"
                          >
                            Missing
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 pt-4 px-4">
                {filteredCards.map((card, index) => {
                  const isCollected = collection.some(
                    (collected) =>
                      collected.name === card.name &&
                      collected.set === card.set.name &&
                      collected.cardNumber === card.number &&
                      collected.language === 'English'
                  );
                  return (
                    <GalleryCard
                      key={card.id}
                      card={card}
                      isCollected={isCollected}
                      priority={index < 8}
                      isBulkMode={isBulkMode}
                      isSelected={isSelectedFn(card.id)}
                      onClick={() => {
                        if (isBulkMode) {
                          toggleCardSelection(card);
                        } else {
                          openDialogForCard(card);
                        }
                      }}
                    />
                  );
                })}
              </div>
            )}
            {!isLoading && !error && filteredCards.length === 0 && (
              <div className="text-center py-10 text-muted-foreground">
                <Images className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg">
                  {searchTerm
                    ? 'No cards found matching your search.'
                    : 'No cards found in this set, or the database returned no data.'}
                </p>
              </div>
            )}

            {/* Infinite Scroll Sentinel */}
            {hasMore && !searchTerm && ownershipFilter === 'all' && (
              <div
                id="infinite-scroll-sentinel"
                className="flex justify-center p-10"
                ref={(el) => {
                  if (el) {
                    const observer = new IntersectionObserver(
                      (entries) => {
                        if (entries[0].isIntersecting && !isLoadingMore) {
                          fetchCards(true);
                        }
                      },
                      { threshold: 0.1 }
                    );
                    observer.observe(el);
                  }
                }}
              >
                {isLoadingMore && (
                  <div className="w-full space-y-4">
                    <CardSkeleton count={6} />
                    <div className="flex flex-col items-center gap-2 mt-4">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      <p className="text-sm text-muted-foreground italic">
                        Summoning more cards...
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      <Button
        variant="secondary"
        size="icon"
        className="hidden lg:flex fixed bottom-6 left-6 rounded-full h-14 w-14 shadow-lg border transition-colors hover:bg-primary hover:text-primary-foreground z-50 items-center justify-center"
        onClick={() => router.back()}
      >
        <ArrowLeft className="h-6 w-6" />
        <span className="sr-only">Back to Sets</span>
      </Button>

      {selectedApiCard && (
        <AddCardToCollectionDialog
          isOpen={isDialogOpen}
          onClose={() => {
            setIsDialogOpen(false);
            setSelectedApiCard(null);
          }}
          cardName={selectedApiCard.name}
          initialCardImageUrl={selectedApiCard.images.large}
          pokemonTcgApiCard={selectedApiCard}
          onPrevCard={currentCardIndex > 0 ? handlePrevCard : undefined}
          onNextCard={currentCardIndex < filteredCards.length - 1 ? handleNextCard : undefined}
          hasPrevCard={currentCardIndex > 0}
          hasNextCard={currentCardIndex < filteredCards.length - 1}
          prevCardImageUrl={
            currentCardIndex > 0
              ? filteredCards[currentCardIndex - 1].images.large ||
                filteredCards[currentCardIndex - 1].images.small
              : null
          }
          nextCardImageUrl={
            currentCardIndex < filteredCards.length - 1
              ? filteredCards[currentCardIndex + 1].images.large ||
                filteredCards[currentCardIndex + 1].images.small
              : null
          }
        />
      )}

      {isBulkMode && selectedCards.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center justify-between gap-4 px-4 py-3 rounded-full bg-white/70 dark:bg-zinc-950/70 border border-white/40 dark:border-white/10 shadow-2xl backdrop-blur-xl max-w-[90vw] w-fit min-w-[300px] sm:min-w-[380px] animate-in fade-in slide-in-from-bottom-5 duration-300">
          <div className="text-xs sm:text-sm font-black text-foreground pl-2 select-none">
            {selectedCards.length} card{selectedCards.length !== 1 ? 's' : ''} selected
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={clearSelection}
              className="h-8 text-xs font-semibold hover:bg-background/50 rounded-full"
            >
              Clear
            </Button>
            <Button
              onClick={openBulkDialog}
              size="sm"
              className="h-8 text-xs font-bold rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-sm animate-pulse"
            >
              Next Step
            </Button>
          </div>
        </div>
      )}

      {isBulkMode && (
        <BulkAddDialog
          isOpen={isBulkDialogOpen}
          onClose={closeBulkDialog}
          selectedCards={selectedCards}
          quantities={bulkQuantities}
          isAdding={isAddingBulk}
          onIncrement={incrementQuantity}
          onDecrement={decrementQuantity}
          onQuantityChange={setQuantity}
          onSubmit={() => {
            if (user) {
              submitBulkAdd(user.uid);
            }
          }}
        />
      )}
      <footer className="text-center py-4 text-sm text-muted-foreground border-t border-border mt-auto">
        PokéTRKR &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
};

export default SetDetailsPage;
