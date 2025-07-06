// src/app/search/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { AppHeader } from "@/components/AppHeader";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AddCardToCollectionDialog } from "@/components/AddCardToCollectionDialog";
import type { ApiPokemonCard } from "@/app/sets/[setId]/page";
import { Loader2, ServerCrash, Search as SearchIcon, Info } from "lucide-react";

const conditionOptions = ["Mint", "Near Mint", "Excellent", "Good", "Lightly Played", "Played", "Poor", "Damaged"];

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ApiPokemonCard[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const [selectedApiCard, setSelectedApiCard] = useState<ApiPokemonCard | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleSearch = useCallback(async (currentQuery: string) => {
    if (currentQuery.trim().length < 3) {
      setSearchResults([]);
      setHasSearched(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    setHasSearched(true);
    setSearchResults([]);

    try {
      const params = new URLSearchParams({ q: currentQuery });
      const response = await fetch(`/api/search-cards?${params.toString()}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `An error occurred: ${response.statusText}`);
      }
      
      const data: ApiPokemonCard[] = await response.json();
      setSearchResults(data);

    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      handleSearch(query);
    }, 500);

    return () => clearTimeout(debounceTimer);
  }, [query, handleSearch]);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <AppHeader />
      <main className="flex-grow container mx-auto p-4 md:p-8">
        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="font-headline text-3xl text-foreground flex items-center gap-2">
              <SearchIcon className="h-8 w-8 text-primary"/>
              Search for Cards
            </CardTitle>
            <CardDescription>
              Find specific Pokémon TCG cards by name, set, or number. For example: <code className="bg-muted px-1 py-0.5 rounded">Charizard base 4</code> or <code className="bg-muted px-1 py-0.5 rounded">135/165</code>.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative mb-8">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                id="search-bar"
                type="text"
                placeholder="Search by name, set, number, or collector number..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-10 text-lg h-12"
              />
            </div>
            
            {error && (
              <div className="text-center py-10 text-destructive">
                <ServerCrash className="h-16 w-16 mx-auto mb-4" />
                <p className="text-xl font-semibold">An error occurred.</p>
                <p>{error}</p>
              </div>
            )}
            
            {!isLoading && hasSearched && searchResults.length === 0 && !error && query.length > 2 && (
              <div className="text-center py-10 text-muted-foreground">
                <Info className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg">No cards found matching your query.</p>
                <p>Try making your search less specific.</p>
              </div>
            )}
            
            {searchResults.length > 0 && (
               <ScrollArea className="h-[calc(100vh-28rem)]">
                <p className="text-sm text-muted-foreground mb-4">Found {searchResults.length} card(s). Click on a card to add it to your collection.</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 pt-4 pb-24 px-4">
                  {searchResults.map(card => (
                    <Card
                      key={card.id}
                      onClick={() => {
                        setSelectedApiCard(card);
                        setIsDialogOpen(true);
                      }}
                      className="p-2 cursor-pointer group flex flex-col relative bg-card transform transition-all duration-200 ease-out hover:scale-105 hover:-translate-y-1 hover:shadow-lg"
                    >
                      <div className="relative aspect-[2.5/3.5] w-full rounded-md overflow-hidden">
                        <Image
                          src={card.images.small}
                          alt={card.name}
                          layout="fill"
                          objectFit="contain"
                          data-ai-hint="pokemon card front"
                        />
                      </div>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            )}

            {isLoading && (
              <div className="flex justify-center items-center py-10">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="ml-4 text-lg text-muted-foreground">Searching...</p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
       {selectedApiCard && (
        <AddCardToCollectionDialog
          isOpen={isDialogOpen}
          onClose={() => setIsDialogOpen(false)}
          cardName={selectedApiCard.name}
          initialCardImageUrl={selectedApiCard.images.small}
          pokemonTcgApiCard={selectedApiCard}
          availableConditions={conditionOptions}
        />
      )}
      <footer className="text-center py-4 text-sm text-muted-foreground border-t border-border mt-auto">
        Pokédex Tracker &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
}
