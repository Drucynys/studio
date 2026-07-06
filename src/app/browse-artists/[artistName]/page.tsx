// src/app/browse-artists/[artistName]/page.tsx
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { AppHeader } from '@/components/AppHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { AddCardToCollectionDialog } from '@/components/AddCardToCollectionDialog';
import {
  Loader2,
  ServerCrash,
  ArrowLeft,
  Images,
  Paintbrush,
  Search,
  CheckCircle,
  Hash,
  Grid,
  List,
} from 'lucide-react';
import type { ApiPokemonCard } from '@/app/sets/[setId]/page';
import { useAuth } from '@/hooks/useAuth';
import { useUserCollection } from '@/hooks/useUserCollection';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CardSkeleton } from '@/components/CardSkeleton';

const CARDS_PER_PAGE = 1000; // Reverted to a high limit

const ArtistDetailPage = () => {
  const params = useParams();
  const router = useRouter();
  const artistNameParam = params.artistName as string;
  const { user } = useAuth();
  const { collection } = useUserCollection(user?.uid);

  const [cardsByArtist, setCardsByArtist] = useState<ApiPokemonCard[]>([]);
  const [filteredCards, setFilteredCards] = useState<ApiPokemonCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedApiCard, setSelectedApiCard] = useState<ApiPokemonCard | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [ownershipFilter, setOwnershipFilter] = useState<'all' | 'owned' | 'missing'>('all');
  const [densityMode, setDensityMode] = useState<'gallery' | 'list'>('gallery');

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

  const artistName = decodeURIComponent(artistNameParam);

  const fetchCardsByArtist = useCallback(
    async (loadMore = false) => {
      if (!artistName) return;

      if (loadMore) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
        setCardsByArtist([]);
      }
      setError(null);

      try {
        const params = new URLSearchParams({
          limit: String(CARDS_PER_PAGE),
        });

        const response = await fetch(
          `/api/cards/by-artist/${encodeURIComponent(artistName)}?${params.toString()}`
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.message ||
              `Failed to fetch cards: ${response.statusText} (status: ${response.status})`
          );
        }

        const newCards: ApiPokemonCard[] = await response.json();

        setCardsByArtist((prev) => (loadMore ? [...prev, ...newCards] : newCards));
        setHasMore(newCards.length === CARDS_PER_PAGE);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [artistName]
  );

  useEffect(() => {
    fetchCardsByArtist(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [artistName]);

  useEffect(() => {
    const lowercasedFilter = searchTerm.toLowerCase();
    let filteredData = cardsByArtist.filter(
      (card) =>
        card.name.toLowerCase().includes(lowercasedFilter) ||
        card.number.toLowerCase().includes(lowercasedFilter) ||
        (card.rarity && card.rarity.toLowerCase().includes(lowercasedFilter)) ||
        card.set.name.toLowerCase().includes(lowercasedFilter)
    );

    if (user) {
      if (ownershipFilter !== 'all') {
        filteredData = filteredData.filter((card) => {
          const isCollected = collection.some(
            (collected) =>
              collected.name === card.name &&
              collected.set === card.set.name &&
              collected.cardNumber === card.number &&
              collected.language === 'English'
          );
          return ownershipFilter === 'owned' ? isCollected : !isCollected;
        });
      }
    }

    setFilteredCards(filteredData);
  }, [searchTerm, cardsByArtist, ownershipFilter, user, collection]);

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

  const artistCompletion = useMemo(() => {
    if (cardsByArtist.length === 0) return { collected: 0, total: 0, percentage: 0 };
    const collectedCardIdentifiers = new Set<string>();
    collection.forEach((card) => {
      if (card.artist === artistName && card.language === 'English') {
        collectedCardIdentifiers.add(`${card.name}-${card.cardNumber}`);
      }
    });
    const uniqueCollectedCount = collectedCardIdentifiers.size;
    const totalByThisArtist = cardsByArtist.length;
    const percentage =
      totalByThisArtist > 0
        ? parseFloat(((uniqueCollectedCount / totalByThisArtist) * 100).toFixed(1))
        : 0;
    return { collected: uniqueCollectedCount, total: totalByThisArtist, percentage };
  }, [cardsByArtist, collection, artistName]);

  // Removed full screen loading spinner to allow skeletal components to load seamlessly

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <AppHeader />
      <main className="flex-grow container mx-auto p-4 md:p-8">
        <div className="p-4 md:p-6 bg-card rounded-lg shadow-xl mb-6">
          <CardHeader className="p-0">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex flex-col md:flex-row md:items-center md:gap-4">
                <Paintbrush className="h-12 w-12 text-primary self-center md:self-auto mb-2 md:mb-0" />
                <div>
                  <CardTitle className="font-headline text-3xl md:text-4xl text-foreground text-center md:text-left capitalize">
                    {artistName}
                  </CardTitle>
                  <CardDescription className="text-md md:text-lg text-center md:text-left">
                    All cards illustrated by this artist
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2 w-full md:w-auto mt-4 md:mt-0">
                <div className="relative flex-grow md:w-[240px] lg:w-[280px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search cards..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-full"
                  />
                </div>
                <div className="flex bg-muted p-1 rounded-lg border shrink-0">
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
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-y-4 gap-x-8 pt-4 border-t border-border mt-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Hash className="h-4 w-4 text-primary" />
                <span>
                  {filteredCards.length} of {cardsByArtist.length} cards shown
                </span>
              </div>
              {user && (
                <div className="flex bg-muted p-1 rounded-lg border w-full sm:w-auto">
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
              <div className="flex-grow max-w-sm sm:max-w-none sm:flex-1 min-w-[150px]">
                <div className="flex justify-between items-baseline mb-1">
                  <h3 className="text-sm font-medium text-muted-foreground">
                    Artist Completion (Loaded)
                  </h3>
                  <p className="text-sm font-semibold text-primary">
                    {artistCompletion.collected} / {artistCompletion.total}
                  </p>
                </div>
                <Progress value={artistCompletion.percentage} className="h-2" />
              </div>
            </div>
          </CardHeader>
        </div>

        {error && (
          <div className="text-center py-10 text-destructive">
            <ServerCrash className="h-16 w-16 mx-auto mb-4" />
            <p className="text-xl font-semibold">Could not load cards for {artistName}.</p>
            <p>{error}</p>
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
              <div className="border rounded-lg overflow-hidden bg-card mt-4 px-4 divide-y divide-border mx-4">
                {filteredCards.map((card) => {
                  const isCollected = collection.some(
                    (collected) =>
                      collected.name === card.name &&
                      collected.set === card.set.name &&
                      collected.cardNumber === card.number &&
                      collected.language === 'English'
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
                    (collected) =>
                      collected.name === card.name &&
                      collected.set === card.set.name &&
                      collected.cardNumber === card.number &&
                      collected.language === 'English'
                  );
                  return (
                    <div
                      key={card.id}
                      onClick={() => {
                        setSelectedApiCard(card);
                        setIsDialogOpen(true);
                      }}
                      className="group relative aspect-[2.5/3.5] w-full cursor-pointer transition-transform duration-200 hover:scale-105"
                    >
                      <div
                        className={cn(
                          'absolute inset-0 rounded-lg overflow-hidden',
                          isCollected && 'ring-2 ring-green-500'
                        )}
                      >
                        <Image
                          src={card.images.small}
                          alt={card.name}
                          fill
                          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 200px"
                          priority={index < 8}
                          className={cn(
                            'bg-card shadow-md rounded-lg object-contain',
                            isCollected ? 'saturate-100' : 'saturate-[.1] group-hover:saturate-100'
                          )}
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
                })}
              </div>
            )}
            {filteredCards.length === 0 && (
              <div className="text-center py-10 text-muted-foreground">
                <Images className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg">No cards found for this artist.</p>
              </div>
            )}

            {hasMore && !searchTerm && ownershipFilter === 'all' && (
              <div className="w-full mt-8">
                {isLoadingMore && (
                  <div className="mb-6">
                    <CardSkeleton count={6} />
                  </div>
                )}
                <div className="flex justify-center">
                  <Button onClick={() => fetchCardsByArtist(true)} disabled={isLoadingMore}>
                    {isLoadingMore ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      'Load More Cards'
                    )}
                  </Button>
                </div>
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
      <footer className="text-center py-4 text-sm text-muted-foreground border-t border-border mt-auto">
        PokéTRKR &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
};

export default ArtistDetailPage;
