
"use client";

import type { NextPage } from "next";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AppHeader } from "@/components/AppHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, ServerCrash, Search, CheckCircle, LanguagesIcon } from "lucide-react";
import Image from "next/image";
import { Progress } from "@/components/ui/progress";
import type { PokemonCard as CollectionPokemonCard } from "@/types";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// For api.pokemontcg.io
interface ApiSet {
  id: string;
  name: string;
  series: string;
  printedTotal: number;
  total: number;
  releaseDate: string; // YYYY-MM-DD
  images: {
    symbol: string;
    logo: string;
  };
}

// For api.tcgdex.net/v2/jp/sets or api.tcgdex.dev/v2/jp/sets
interface TcgDexApiSet {
  id: string;
  name: string;
  logo?: string;
  releaseDate?: string; // YYYY/MM/DD
  cardCount?: {
    official?: number;
    total?: number;
  };
  // TCGdex doesn't typically provide 'series' in the main set list
}

// Unified structure for display
interface DisplaySet {
  id: string;
  name: string;
  series?: string; 
  logoUrl?: string;
  releaseDate: string; // Store as YYYY-MM-DD for consistency
  totalCards: number;
  language: 'English' | 'Japanese';
}

const BrowseSetsPage: NextPage = () => {
  const [displaySets, setDisplaySets] = useState<DisplaySet[]>([]);
  const [filteredDisplaySets, setFilteredDisplaySets] = useState<DisplaySet[]>([]);
  const [collectionCards, setCollectionCards] = useState<CollectionPokemonCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isClient, setIsClient] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<'English' | 'Japanese'>('English');

  const loadCollectionCards = useCallback(() => {
    if (typeof window === "undefined") return;
    const storedCards = localStorage.getItem("pokemonCards");
    if (storedCards) {
      try {
        const parsedCards = JSON.parse(storedCards) as CollectionPokemonCard[];
        if (Array.isArray(parsedCards)) {
          setCollectionCards(parsedCards);
        }
      } catch (error) {
        console.error("Failed to parse collection cards from localStorage", error);
      }
    }
  }, []);

  useEffect(() => {
    setIsClient(true);
    loadCollectionCards();
  }, [loadCollectionCards]);

  useEffect(() => {
    if (!isClient) return;
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === "pokemonCards") {
        loadCollectionCards();
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [isClient, loadCollectionCards]);

  const fetchSets = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setDisplaySets([]);
    setFilteredDisplaySets([]);

    try {
      let fetchedDisplaySets: DisplaySet[] = [];

      if (selectedLanguage === 'English') {
        const headers: HeadersInit = {};
        if (process.env.NEXT_PUBLIC_POKEMONTCG_API_KEY) {
          headers['X-Api-Key'] = process.env.NEXT_PUBLIC_POKEMONTCG_API_KEY;
        }
        const response = await fetch("https://api.pokemontcg.io/v2/sets?orderBy=-releaseDate", { headers });
        if (!response.ok) {
          throw new Error(`Failed to fetch English sets: ${response.statusText || 'Server responded with an error'} (status: ${response.status})`);
        }
        const data = await response.json();
        fetchedDisplaySets = (data.data as ApiSet[]).map(apiSet => ({
          id: apiSet.id,
          name: apiSet.name,
          series: apiSet.series,
          logoUrl: apiSet.images.logo,
          releaseDate: apiSet.releaseDate,
          totalCards: apiSet.total > 0 ? apiSet.total : apiSet.printedTotal,
          language: 'English',
        }));
      } else { // Japanese
        // Updated to use api.tcgdex.dev based on user hint
        const response = await fetch("https://api.tcgdex.dev/v2/jp/sets");
        if (!response.ok) {
          throw new Error(`Failed to fetch Japanese sets: ${response.statusText || 'Server responded with an error'} (status: ${response.status})`);
        }
        const data = await response.json();
        fetchedDisplaySets = (data as TcgDexApiSet[]).map(tcgDexSet => ({
          id: tcgDexSet.id,
          name: tcgDexSet.name,
          // series: undefined, // TCGdex set list doesn't usually have 'series'
          logoUrl: tcgDexSet.logo,
          releaseDate: tcgDexSet.releaseDate ? tcgDexSet.releaseDate.replace(/\//g, '-') : new Date().toISOString().split('T')[0], // Convert YYYY/MM/DD to YYYY-MM-DD
          totalCards: tcgDexSet.cardCount?.official || tcgDexSet.cardCount?.total || 0,
          language: 'Japanese',
        }));
      }
      
      // Sort by release date descending
      const sortedSets = fetchedDisplaySets.sort((a, b) => new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime());
      setDisplaySets(sortedSets);
      setFilteredDisplaySets(sortedSets);

    } catch (err) {
      console.error(`Error fetching ${selectedLanguage} sets:`, err);
      let detailedError = err instanceof Error ? err.message : "An unknown error occurred";
      if (err instanceof Error && err.message.includes("(status: 404)") && selectedLanguage === 'Japanese') {
        detailedError = "The data source for Japanese sets (TCGdex API) returned a 'Not Found' error. This might be a temporary issue with the API or the endpoint may have changed. Please try again later or select English sets.";
      }
      setError(detailedError);
    } finally {
      setIsLoading(false);
    }
  }, [selectedLanguage]);

  useEffect(() => {
    fetchSets();
  }, [fetchSets]);

  useEffect(() => {
    const lowercasedFilter = searchTerm.toLowerCase();
    const filteredData = displaySets.filter(item =>
      item.name.toLowerCase().includes(lowercasedFilter) ||
      (item.series && item.series.toLowerCase().includes(lowercasedFilter)) ||
      item.id.toLowerCase().includes(lowercasedFilter)
    );
    setFilteredDisplaySets(filteredData);
  }, [searchTerm, displaySets]);

  const getSetCompletion = (set: DisplaySet) => {
    if (!isClient) return { collected: 0, total: set.totalCards, percentage: 0 };
    
    const collectedCardIdentifiersInSet = new Set<string>();
    collectionCards.forEach(card => {
        if (card.language === set.language && card.set === set.name) {
            collectedCardIdentifiersInSet.add(`${card.name}-${card.cardNumber}`);
        }
    });
    const uniqueCollectedCount = collectedCardIdentifiersInSet.size;
    const totalInSet = set.totalCards > 0 ? set.totalCards : 1; // Avoid division by zero
    const percentage = totalInSet > 0 ? (uniqueCollectedCount / totalInSet) * 100 : 0;
    
    return { collected: uniqueCollectedCount, total: totalInSet, percentage };
  };

  if (!isClient && isLoading) {
     return (
      <div className="flex flex-col min-h-screen bg-background">
        <AppHeader />
        <main className="flex-grow container mx-auto p-4 md:p-8 flex items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
           <p className="ml-4 text-lg text-muted-foreground">Loading {selectedLanguage} sets...</p>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <AppHeader />
      <main className="flex-grow container mx-auto p-4 md:p-8">
        <Card className="shadow-xl">
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <CardTitle className="font-headline text-3xl text-foreground">Browse Pokémon TCG Sets</CardTitle>
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <LanguagesIcon className="h-5 w-5 text-muted-foreground"/>
                    <Select value={selectedLanguage} onValueChange={(value: 'English' | 'Japanese') => setSelectedLanguage(value)}>
                        <SelectTrigger className="w-full md:w-[180px]">
                            <SelectValue placeholder="Select Language" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="English">English Sets</SelectItem>
                            <SelectItem value="Japanese">Japanese Sets</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
            <CardDescription>Select a set to view its cards. Current language: {selectedLanguage}.</CardDescription>
             <div className="relative mt-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder={`Search ${selectedLanguage} sets by name, series, or ID...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full md:w-1/2"
              />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading && (
              <div className="flex justify-center items-center py-10">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="ml-4 text-lg text-muted-foreground">Loading {selectedLanguage} sets...</p>
              </div>
            )}
            {error && (
              <div className="flex flex-col items-center justify-center py-10 text-destructive">
                <ServerCrash className="h-16 w-16 mb-4" />
                <p className="text-xl font-semibold">Oops! Something went wrong.</p>
                <p className="text-center">Could not load {selectedLanguage} sets: {error}<br />Please try again later.</p>
              </div>
            )}
            {!isLoading && !error && (
              <ScrollArea className="h-[calc(100vh-22rem)] md:h-[calc(100vh-27rem)]">
                {filteredDisplaySets.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 pt-4 pb-24 px-4">
                    {filteredDisplaySets.map((set) => {
                      const completion = getSetCompletion(set);
                      const linkHref = set.language === 'English' ? `/sets/${set.id}` : `/tcgdex-sets/${set.id}`;
                      return (
                        <Link key={set.id} href={linkHref} passHref legacyBehavior>
                        <a className="block group">
                            <Card className={cn(
                                "bg-card hover:shadow-primary/20 hover:border-primary transition-all duration-300 ease-in-out transform hover:scale-105 flex flex-col items-center p-4 text-center h-full",
                                "group-hover:z-10 relative"
                              )}>
                            {set.logoUrl ? (
                                <div className="relative w-32 h-16 mb-3">
                                <Image src={set.logoUrl} alt={`${set.name} logo`} layout="fill" objectFit="contain" data-ai-hint="pokemon set logo"/>
                                </div>
                            ) : (
                                <div className="w-32 h-16 mb-3 bg-muted rounded flex items-center justify-center" data-ai-hint="logo placeholder">
                                <span className="text-xs text-muted-foreground">No Logo</span>
                                </div>
                            )}
                            <p className="font-semibold text-card-foreground group-hover:text-primary">{set.name}</p>
                            {set.series && <p className="text-xs text-muted-foreground">{set.series} Series</p>}
                            <p className="text-xs text-muted-foreground">{new Date(set.releaseDate).toLocaleDateString()}</p>
                            
                            <div className="w-full mt-2 mb-3 px-2">
                                <Progress value={completion.percentage} className="h-2 [&>div]:bg-primary" />
                                <p className="text-xs text-muted-foreground mt-1">
                                  {completion.collected} / {completion.total} unique cards
                                  {completion.percentage >= 100 && <CheckCircle className="inline-block ml-1 h-3 w-3 text-green-500" />}
                                </p>
                            </div>
                            
                            <Button variant="outline" size="sm" className="mt-auto w-full group-hover:bg-primary group-hover:text-primary-foreground">View Set</Button>
                            </Card>
                        </a>
                        </Link>
                      );
                    })}
                    </div>
                ) : (
                    <div className="text-center py-10 text-muted-foreground">
                        <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p className="text-lg">No {selectedLanguage} sets found matching your search criteria.</p>
                    </div>
                )}
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </main>
       <footer className="text-center py-4 text-sm text-muted-foreground border-t border-border mt-auto">
        Pokédex Tracker &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
};

export default BrowseSetsPage;
    

    

    

    