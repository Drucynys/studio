// src/app/pokedex/[pokemonName]/page.tsx
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { AppHeader } from '@/components/AppHeader';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { AddCardToCollectionDialog } from '@/components/AddCardToCollectionDialog';
import {
  Loader2,
  ServerCrash,
  ArrowLeft,
  Target,
  Images,
  Search,
  Hash,
  Grid,
  List,
  ChevronDown,
} from 'lucide-react';
import type { ApiPokemonCard } from '@/app/sets/[setId]/page';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useUserCollection } from '@/hooks/useUserCollection';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CardSkeleton } from '@/components/CardSkeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface Pokemon {
  id: number;
  name: string;
  sprite: string;
  generation: number;
}

const CARDS_PER_PAGE = 50;

const getRegionName = (genNum: number): string => {
  const regions: Record<number, string> = {
    1: 'Kanto',
    2: 'Johto',
    3: 'Hoenn',
    4: 'Sinnoh',
    5: 'Unova',
    6: 'Kalos',
    7: 'Alola',
    8: 'Galar',
    9: 'Paldea',
  };
  return regions[genNum] || `Gen ${genNum}`;
};

const getCardPrice = (card: ApiPokemonCard): number => {
  if (!card.tcgplayer?.prices) return 0;
  const prices = card.tcgplayer.prices;
  let minMarket = Infinity;
  let hasPrice = false;

  for (const variantKey in prices) {
    const marketPrice = prices[variantKey as keyof typeof prices]?.market;
    if (marketPrice !== undefined && marketPrice !== null) {
      if (marketPrice < minMarket) {
        minMarket = marketPrice;
        hasPrice = true;
      }
    }
  }
  return hasPrice ? minMarket : 0;
};

const getRarityRank = (rarity?: string): number => {
  if (!rarity) return 0;
  const ranks: Record<string, number> = {
    'Rare Secret': 100,
    'Secret Rare': 100,
    Secret: 100,
    'Hyper Rare': 95,
    'Special Illustration Rare': 90,
    'Ultra Rare': 85,
    'Illustration Rare': 80,
    'Rare Ultra': 80,
    'Double Rare': 75,
    'Rare Rainbow': 70,
    'Rare Shiny GX': 65,
    'Rare Shiny': 60,
    'Shiny Rare': 60,
    'Rare Art': 55,
    'ACE SPEC Rare': 55,
    PROMO: 50,
    Promo: 50,
    'Rare Holo VMAX': 45,
    'Rare Holo VSTAR': 45,
    'Rare Holo V': 40,
    'Rare Holo GX': 40,
    'Rare Holo EX': 40,
    'Rare Holo LV.X': 40,
    'Rare Holo Star': 40,
    'Rare Holo': 35,
    'Holo Rare': 35,
    'Rare Prime': 35,
    'Rare BREAK': 35,
    'Rare Prism Star': 35,
    Rare: 30,
    Uncommon: 20,
    Common: 10,
  };

  const lowerRarity = rarity.toLowerCase();
  for (const [key, val] of Object.entries(ranks)) {
    if (lowerRarity.includes(key.toLowerCase())) {
      return val;
    }
  }
  return 15;
};

const GalleryCard = ({
  card,
  isCollected,
  onClick,
  priority,
}: {
  card: ApiPokemonCard;
  isCollected: boolean;
  onClick: () => void;
  priority?: boolean;
}) => {
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
          isCollected && 'ring-2 ring-green-500'
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
            isCollected ? 'saturate-100' : 'saturate-[.1] group-hover:saturate-100'
          )}
          onLoad={() => setIsImageLoading(false)}
          data-ai-hint="pokemon card front"
        />
      </div>

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

const PokemonDetailPage = () => {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { collection } = useUserCollection(user?.uid);
  const pokemonName = params.pokemonName as string;

  const [cardsForPokemon, setCardsForPokemon] = useState<ApiPokemonCard[]>([]);
  const [filteredCards, setFilteredCards] = useState<ApiPokemonCard[]>([]);
  const [pokemonData, setPokemonData] = useState<Pokemon | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedApiCard, setSelectedApiCard] = useState<ApiPokemonCard | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [ownershipFilter, setOwnershipFilter] = useState<'all' | 'owned' | 'missing'>('all');
  const [densityMode, setDensityMode] = useState<'gallery' | 'list'>('gallery');
  const [sortBy, setSortBy] = useState<'default' | 'value-high' | 'value-low' | 'rarity'>(
    'default'
  );

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedMode = localStorage.getItem('poketrkr-density-mode') as 'gallery' | 'list';
      if (savedMode === 'gallery' || savedMode === 'list') {
        setDensityMode(savedMode);
      }
    }
  }, []);

  const handleSetDensityMode = (mode: 'gallery' | 'list') => {
    setDensityMode(mode);
    localStorage.setItem('poketrkr-density-mode', mode);
  };

  const fetchPageData = useCallback(
    async (pageNum = 1, loadMore = false) => {
      if (!pokemonName) return;
      if (loadMore) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
        setCardsForPokemon([]);
      }
      setError(null);

      try {
        const fetchPromises = [];
        if (!loadMore) {
          fetchPromises.push(fetch(`/api/pokedex/${pokemonName}`));
        }
        fetchPromises.push(
          fetch(
            `/api/cards/by-pokemon/${encodeURIComponent(pokemonName)}?page=${pageNum}&pageSize=${CARDS_PER_PAGE}`
          )
        );

        const responses = await Promise.all(fetchPromises);

        if (!loadMore) {
          const pokemonDetailsResponse = responses[0];
          if (!pokemonDetailsResponse.ok)
            throw new Error(`Failed to fetch Pokémon details from database.`);
          const pokemonDetailsData = await pokemonDetailsResponse.json();
          setPokemonData(pokemonDetailsData);
        }

        const cardsResponse = loadMore ? responses[0] : responses[1];
        if (!cardsResponse.ok)
          throw new Error(`Failed to fetch cards: ${cardsResponse.statusText}`);
        const cardsData = await cardsResponse.json();
        const newCards: ApiPokemonCard[] = cardsData.data || [];

        setCardsForPokemon((prev) => {
          if (!loadMore) return newCards;
          const existingIds = new Set(prev.map((c) => c.id));
          const uniqueNewCards = newCards.filter((c) => !existingIds.has(c.id));
          return [...prev, ...uniqueNewCards];
        });
        setHasMore(newCards.length === CARDS_PER_PAGE);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [pokemonName]
  );

  useEffect(() => {
    fetchPageData(1, false);
  }, [fetchPageData]);

  const handleLoadMore = useCallback(() => {
    if (isLoading || isLoadingMore || !hasMore) return;
    const nextPage = page + 1;
    setPage(nextPage);
    fetchPageData(nextPage, true);
  }, [page, isLoading, isLoadingMore, hasMore, fetchPageData]);

  useEffect(() => {
    const lowercasedFilter = searchTerm.toLowerCase();
    let filteredData = cardsForPokemon.filter(
      (card) =>
        card.name.toLowerCase().includes(lowercasedFilter) ||
        card.number.toLowerCase().includes(lowercasedFilter) ||
        (card.rarity && card.rarity.toLowerCase().includes(lowercasedFilter)) ||
        card.set.name.toLowerCase().includes(lowercasedFilter)
    );

    if (user) {
      const ownedCardApiIds = new Set(collection.map((c) => c.apiId));
      if (ownershipFilter === 'owned') {
        filteredData = filteredData.filter((card) => ownedCardApiIds.has(card.id));
      } else if (ownershipFilter === 'missing') {
        filteredData = filteredData.filter((card) => !ownedCardApiIds.has(card.id));
      }
    }

    if (sortBy === 'value-high') {
      filteredData = [...filteredData].sort((a, b) => getCardPrice(b) - getCardPrice(a));
    } else if (sortBy === 'value-low') {
      filteredData = [...filteredData].sort((a, b) => {
        const priceA = getCardPrice(a);
        const priceB = getCardPrice(b);
        if (priceA === 0 && priceB !== 0) return 1;
        if (priceB === 0 && priceA !== 0) return -1;
        return priceA - priceB;
      });
    } else if (sortBy === 'rarity') {
      filteredData = [...filteredData].sort(
        (a, b) => getRarityRank(b.rarity) - getRarityRank(a.rarity)
      );
    }

    setFilteredCards(filteredData);
  }, [searchTerm, cardsForPokemon, ownershipFilter, user, collection, sortBy]);

  const pokemonCompletion = useMemo(() => {
    if (cardsForPokemon.length === 0) return { collected: 0, total: 0, percentage: 0 };
    const collectedCardIdentifiers = new Set<string>();
    collection.forEach((card) => {
      const apiCardForCollected = cardsForPokemon.find((apiCard) => apiCard.id === card.apiId);
      if (apiCardForCollected && card.language === 'English') {
        collectedCardIdentifiers.add(`${card.name}-${card.cardNumber}`);
      }
    });

    const uniqueCollectedCount = collectedCardIdentifiers.size;
    const totalForThisPokemon = cardsForPokemon.length;
    const percentage =
      totalForThisPokemon > 0
        ? parseFloat(((uniqueCollectedCount / totalForThisPokemon) * 100).toFixed(1))
        : 0;
    return { collected: uniqueCollectedCount, total: totalForThisPokemon, percentage };
  }, [cardsForPokemon, collection]);
  const selectedCardIndex = selectedApiCard
    ? filteredCards.findIndex((c) => c.id === selectedApiCard.id)
    : -1;
  const hasPrevCard = selectedCardIndex > 0;
  const hasNextCard = selectedCardIndex >= 0 && selectedCardIndex < filteredCards.length - 1;

  const handlePrevCard = useCallback(() => {
    if (hasPrevCard) {
      setSelectedApiCard(filteredCards[selectedCardIndex - 1]);
    }
  }, [hasPrevCard, filteredCards, selectedCardIndex]);

  const handleNextCard = useCallback(() => {
    if (hasNextCard) {
      setSelectedApiCard(filteredCards[selectedCardIndex + 1]);
    }
  }, [hasNextCard, filteredCards, selectedCardIndex]);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <AppHeader />
      <main className="flex-grow container mx-auto p-4 md:p-8">
        <div className="p-4 md:p-6 bg-card rounded-lg shadow-xl mb-6">
          <CardHeader className="p-0">
            <div className="flex flex-row items-center justify-between w-full gap-4">
              <div className="flex flex-row items-center gap-4 min-w-0">
                {pokemonData && pokemonData.sprite && (
                  <div className="relative w-16 h-16 shrink-0" data-ai-hint="pokemon sprite">
                    <Image
                      src={pokemonData.sprite}
                      alt={pokemonName}
                      fill
                      sizes="64px"
                      unoptimized
                      className="object-contain"
                    />
                  </div>
                )}
                <div className="flex flex-col text-left min-w-0">
                  <CardTitle className="font-headline text-2xl sm:text-3xl md:text-4xl text-foreground capitalize leading-tight truncate">
                    {pokemonName}
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm md:text-base text-muted-foreground font-bold mt-1 leading-none truncate">
                    {pokemonData?.generation && `${getRegionName(pokemonData.generation)} Region`}
                  </CardDescription>
                </div>
              </div>
              {/* Floating Circular Progress Ring */}
              <div className="shrink-0 flex items-center">
                <div className="flex items-center bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200/50 dark:border-zinc-800/50 p-2 rounded-2xl shadow-sm hover:scale-[1.02] transition-transform duration-200">
                  {/* Circular Progress Ring */}
                  <div className="relative flex items-center justify-center h-14 w-14 flex-shrink-0">
                    <svg className="h-14 w-14 transform -rotate-90">
                      {/* Track Circle */}
                      <circle
                        className="text-zinc-200 dark:text-zinc-800"
                        strokeWidth="3.5"
                        stroke="currentColor"
                        fill="transparent"
                        r="23"
                        cx="28"
                        cy="28"
                      />
                      {/* Progress Circle */}
                      <circle
                        className="text-primary transition-all duration-500 ease-out"
                        strokeWidth="3.5"
                        strokeDasharray={2 * Math.PI * 23}
                        strokeDashoffset={
                          2 * Math.PI * 23 -
                          (pokemonCompletion.percentage / 100) * (2 * Math.PI * 23)
                        }
                        strokeLinecap="round"
                        stroke="currentColor"
                        fill="transparent"
                        r="23"
                        cx="28"
                        cy="28"
                      />
                    </svg>
                    {/* Inner Collected / Total text */}
                    <span className="absolute text-[10px] font-black text-foreground">
                      {pokemonCompletion.collected}/{pokemonCompletion.total}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-4 border-t border-border mt-4">
              {user && (
                <div className="flex bg-muted p-1 rounded-lg border w-full sm:w-auto justify-center">
                  <Button
                    variant={ownershipFilter === 'all' ? 'secondary' : 'ghost'}
                    size="sm"
                    className={cn(
                      'h-8 text-xs font-semibold flex-1 sm:flex-initial transition-all rounded-md',
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
                      'h-8 text-xs font-semibold flex-1 sm:flex-initial transition-all rounded-md',
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
                      'h-8 text-xs font-semibold flex-1 sm:flex-initial transition-all rounded-md',
                      ownershipFilter === 'missing' &&
                        'bg-destructive/10 text-destructive hover:bg-destructive/15'
                    )}
                    onClick={() => setOwnershipFilter('missing')}
                  >
                    Missing
                  </Button>
                </div>
              )}
              <div className="flex items-center gap-2 self-center sm:self-auto shrink-0 mt-2 sm:mt-0">
                {/* Sort Order Select */}
                <Select value={sortBy} onValueChange={(value) => setSortBy(value as any)}>
                  <SelectTrigger className="h-10 w-[155px] text-xs font-semibold bg-muted hover:bg-muted/80 text-foreground border border-border rounded-lg shadow-sm">
                    <SelectValue placeholder="Sort Order" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Default Set Order</SelectItem>
                    <SelectItem value="value-high">Value: High to Low</SelectItem>
                    <SelectItem value="value-low">Value: Low to High</SelectItem>
                    <SelectItem value="rarity">Rarity: Rarest First</SelectItem>
                  </SelectContent>
                </Select>

                {/* View Toggle */}
                <div className="flex bg-muted p-1 rounded-lg border h-10 items-center shrink-0">
                  <Button
                    variant={densityMode === 'gallery' ? 'secondary' : 'ghost'}
                    size="sm"
                    className={cn(
                      'h-8 w-8 p-0 transition-all rounded-md',
                      densityMode === 'gallery' &&
                        'bg-background shadow-sm text-foreground hover:bg-background'
                    )}
                    onClick={() => handleSetDensityMode('gallery')}
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
                    onClick={() => handleSetDensityMode('list')}
                    title="List View"
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardHeader>
        </div>

        {isLoading && (
          <div className="pb-8">
            <CardSkeleton count={12} />
          </div>
        )}
        {error && (
          <div className="text-center py-10 text-destructive">
            <ServerCrash className="h-16 w-16 mx-auto mb-4" />
            <p className="text-xl font-semibold">Could not load cards for {pokemonName}.</p>
            <p>{error}</p>
          </div>
        )}

        {!isLoading && !error && (
          <div className="pb-8">
            {densityMode === 'list' ? (
              <div className="border rounded-lg overflow-hidden bg-card mt-4 px-4 divide-y divide-border mx-4">
                {filteredCards.map((card) => {
                  const isCollected = collection.some(
                    (collected) => collected.apiId === card.id && collected.language === 'English'
                  );

                  return (
                    <div
                      key={card.id}
                      onClick={() => {
                        setSelectedApiCard(card);
                        setIsDialogOpen(true);
                      }}
                      className="flex items-center justify-between py-3 hover:bg-muted/30 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
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
                            #{card.number} {card.rarity && `• ${card.rarity}`}{' '}
                            {card.set.name && `• ${card.set.name}`}
                          </p>
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
                    (collected) => collected.apiId === card.id && collected.language === 'English'
                  );
                  return (
                    <GalleryCard
                      key={card.id}
                      card={card}
                      isCollected={isCollected}
                      priority={index < 8}
                      onClick={() => {
                        setSelectedApiCard(card);
                        setIsDialogOpen(true);
                      }}
                    />
                  );
                })}
              </div>
            )}
            {filteredCards.length === 0 && (
              <div className="text-center py-10 text-muted-foreground">
                <Images className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg">No cards found for this Pokémon.</p>
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
                          handleLoadMore();
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
      <div className="hidden lg:block fixed bottom-6 left-6 z-50">
        <Button
          onClick={() => router.back()}
          variant="secondary"
          size="icon"
          className="rounded-full h-14 w-14 shadow-lg border transition-colors hover:bg-primary hover:text-primary-foreground"
        >
          <ArrowLeft className="h-6 w-6" />
          <span className="sr-only">Back</span>
        </Button>
      </div>
      {selectedApiCard && (
        <AddCardToCollectionDialog
          isOpen={isDialogOpen}
          onClose={() => setIsDialogOpen(false)}
          cardName={selectedApiCard.name}
          initialCardImageUrl={selectedApiCard.images.small}
          pokemonTcgApiCard={selectedApiCard}
          hasPrevCard={hasPrevCard}
          hasNextCard={hasNextCard}
          onPrevCard={handlePrevCard}
          onNextCard={handleNextCard}
          prevCardImageUrl={
            hasPrevCard
              ? filteredCards[selectedCardIndex - 1].images.large ||
                filteredCards[selectedCardIndex - 1].images.small
              : null
          }
          nextCardImageUrl={
            hasNextCard
              ? filteredCards[selectedCardIndex + 1].images.large ||
                filteredCards[selectedCardIndex + 1].images.small
              : null
          }
        />
      )}
    </div>
  );
};

export default PokemonDetailPage;
