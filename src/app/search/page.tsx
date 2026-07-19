// src/app/search/page.tsx
'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Image from 'next/image';
import { AppHeader } from '@/components/AppHeader';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AddCardToCollectionDialog } from '@/components/AddCardToCollectionDialog';
import type { ApiPokemonCard } from '@/app/sets/[setId]/page';
import { Loader2, ServerCrash, Search as SearchIcon, Info } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useUserCollection } from '@/hooks/useUserCollection';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export default function SearchPage() {
  const { user } = useAuth();
  const { collection } = useUserCollection(user?.uid);
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ApiPokemonCard[]>([]);
  const [totalResults, setTotalResults] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [offset, setOffset] = useState(0);
  const [limit] = useState(48); // Results per page
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const [selectedApiCard, setSelectedApiCard] = useState<ApiPokemonCard | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const currentCardIndex = useMemo(() => {
    if (!selectedApiCard) return -1;
    return searchResults.findIndex((c) => c.id === selectedApiCard.id);
  }, [selectedApiCard, searchResults]);

  const handlePrevCard = useCallback(() => {
    if (currentCardIndex > 0) {
      setSelectedApiCard(searchResults[currentCardIndex - 1]);
    }
  }, [currentCardIndex, searchResults]);

  const handleNextCard = useCallback(() => {
    if (currentCardIndex < searchResults.length - 1) {
      setSelectedApiCard(searchResults[currentCardIndex + 1]);
    }
  }, [currentCardIndex, searchResults]);

  // Fetch results with pagination
  const fetchSearchResults = useCallback(async (currentQuery: string, currentOffset: number) => {
    // Reset total results when fetching first page (new search)
    if (currentOffset === 0) {
      setTotalResults(0);
    }

    if (currentQuery.trim().length < 1) {
      setSearchResults([]);
      setHasSearched(false);
      setHasMore(false);
      setTotalResults(0);
      return;
    }

    setIsLoading(true);
    setError(null);
    setHasSearched(true);

    try {
      const params = new URLSearchParams({
        q: currentQuery,
        offset: String(currentOffset),
        limit: String(limit)
      });
      const response = await fetch(`/api/search-cards?${params.toString()}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `An error occurred: ${response.statusText}`);
      }

      const data = await response.json();

      // Assuming response format: { results: [], total: number, offset: number, limit: number }
      if (currentOffset === 0) {
        // First page, replace results
        setSearchResults(data.results);
      } else {
        // Additional page, append results
        setSearchResults(prev => [...prev, ...data.results]);
      }
      setTotalResults(data.total);
      setHasMore(data.results.length === limit); // More if we got a full page
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
      setHasMore(false);
      setTotalResults(0);
    } finally {
      setIsLoading(false);
      setLoadingMore(false);
    }
  }, [limit]);

  // Debounced search
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      fetchSearchResults(query, 0); // Reset offset to 0 on new query
    }, 150);

    return () => clearTimeout(debounceTimer);
  }, [query, fetchSearchResults]);

  // Load more when scrolling near bottom
  useEffect(() => {
    if (!hasMore || loadingMore) return;

    const handleScroll = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const windowHeight = window.innerHeight;
      const bodyHeight = document.body.offsetHeight;
      const buffer = 200; // Start loading 200px before bottom

      if (scrollTop + windowHeight >= bodyHeight - buffer) {
        // Load more
        setLoadingMore(true);
        fetchSearchResults(query, offset + limit);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [hasMore, loadingMore, offset, limit, query, fetchSearchResults]);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <AppHeader />
      <main className="flex-grow container mx-auto p-4 md:p-8">
        <div className="p-4 md:p-6 bg-card rounded-lg shadow-xl mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex flex-col text-left hidden md:block">
              <h1 className="font-headline text-3xl md:text-4xl text-foreground flex items-center gap-2 capitalize leading-tight">
                <SearchIcon className="h-8 w-8 text-primary" />
                Search for Cards
              </h1>
              <p className="text-sm md:text-base text-muted-foreground mt-1 leading-normal max-w-2xl">
                Find specific Pokémon TCG cards by name, set, or number. For example:{' '}
                <code className="bg-muted px-1.5 py-0.5 rounded text-foreground font-medium">
                  Charizard base 4
                </code>{' '}
                or{' '}
                <code className="bg-muted px-1.5 py-0.5 rounded text-foreground font-medium">
                  135/165
                </code>
                .
              </p>
            </div>
          </div>
          <div className="relative mt-0 md:mt-6">
            <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              id="search-bar"
              type="text"
              placeholder="Search by name, set, number, or collector number..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-11 text-lg h-12 rounded-xl focus-visible:ring-primary shadow-sm"
            />
          </div>
        </div>

        {error && (
          <div className="text-center py-10 text-destructive bg-card rounded-lg shadow-md">
            <ServerCrash className="h-16 w-16 mx-auto mb-4" />
            <p className="text-xl font-semibold">An error occurred.</p>
            <p>{error}</p>
          </div>
        )}

        {!isLoading && hasSearched && searchResults.length === 0 && !error && query.length > 0 && (
          <div className="text-center py-10 text-muted-foreground bg-card rounded-lg shadow-md">
            <Info className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg">No cards found matching your query.</p>
            <p>Try making your search less specific.</p>
          </div>
        )}

        {searchResults.length > 0 && (
          <>
            <div className="mt-4">
              <div className="flex items-center justify-between mb-4 border-b border-border/40 pb-2">
                <p className="text-sm text-muted-foreground">
                  Showing {Math.min(offset + searchResults.length, totalResults)} of {totalResults}
                  card(s) matching your query. Click on a card to add it to your collection.
                </p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 pt-2 pb-24">
                {searchResults.map((card, index) => {
                  const isCollected = collection.some(
                    (collected) =>
                      collected.name === card.name &&
                      collected.set === (card.set?.name || 'Unknown Set') &&
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
                      className="group relative aspect-[63/88] w-full cursor-pointer transition-all duration-200 hover:scale-105"
                    >
                      <div
                        className={cn(
                          'absolute inset-0 rounded-lg overflow-hidden',
                          isCollected && 'ring-2 ring-green-500'
                        )}
                      >
                        <Image
                          src={card.images?.small || card.images?.large || 'https://placehold.co/200x280.png'}
                          alt={card.name}
                          fill
                          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 200px"
                          priority={index < 8}
                          className={cn(
                            'bg-card shadow-md rounded-lg object-contain',
                            isCollected
                              ? 'saturate-100'
                              : 'saturate-[.15] group-hover:saturate-100 transition-all duration-300'
                          )}
                          data-ai-hint="pokemon card front"
                        />
                      </div>
                      <Badge
                        className={cn(
                          'absolute bottom-1.5 right-1.5 z-10 text-[10px] font-bold text-white border-transparent transition-opacity group-hover:opacity-0',
                          isCollected ? 'bg-green-600' : 'bg-black/60'
                        )}
                      >
                        #{card.number}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Load more indicator */}
            {loadingMore && (
              <div className="flex justify-center items-center py-6">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <p className="ml-2 text-sm text-muted-foreground">Loading more...</p>
              </div>
            )}
          </>
        )}

        {isLoading && (
          <div className="flex justify-center items-center py-10">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="ml-4 text-lg text-muted-foreground">Searching...</p>
          </div>
        )}
      </main>
      {selectedApiCard && (
        <AddCardToCollectionDialog
          isOpen={isDialogOpen}
          onClose={() => setIsDialogOpen(false)}
          cardName={selectedApiCard.name}
          initialCardImageUrl={selectedApiCard.images?.small || selectedApiCard.images?.large || null}
          pokemonTcgApiCard={selectedApiCard}
          onPrevCard={currentCardIndex > 0 ? handlePrevCard : undefined}
          onNextCard={currentCardIndex < searchResults.length - 1 ? handleNextCard : undefined}
          hasPrevCard={currentCardIndex > 0}
          hasNextCard={currentCardIndex < searchResults.length - 1}
          prevCardImageUrl={
            currentCardIndex > 0
              ? searchResults[currentCardIndex - 1].images?.large ||
                searchResults[currentCardIndex - 1].images?.small || null
              : null
          }
          nextCardImageUrl={
            currentCardIndex < searchResults.length - 1
              ? searchResults[currentCardIndex + 1].images?.large ||
                searchResults[currentCardIndex + 1].images?.small || null
              : null
          }
        />
      )}
    </div>
  );
}