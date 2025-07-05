
"use client";

import type { NextPage } from "next";
import { useEffect, useState, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { AppHeader } from "@/components/AppHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, ServerCrash, Search, CheckCircle, Package, Paintbrush, User, RefreshCcw } from "lucide-react";
import Image from "next/image";
import { Progress } from "@/components/ui/progress";
import type { PokemonCard as CollectionPokemonCard } from "@/types";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ARTIST_DATA, type Artist } from "../browse-artists/artistData";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";

// This interface matches the data structure of sets stored in Firestore
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

// Unified structure for display
interface DisplaySet {
  id: string;
  name: string;
  series?: string; 
  logoUrl?: string;
  releaseDate: string;
  totalCards: number;
  language: 'English' | 'Japanese';
}

const BrowsePageContent: NextPage = () => {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const initialTab = tabParam === 'artists' ? 'artists' : 'sets';
  const [activeTab, setActiveTab] = useState(initialTab);

  const [displaySets, setDisplaySets] = useState<DisplaySet[]>([]);
  const [filteredDisplaySets, setFilteredDisplaySets] = useState<DisplaySet[]>([]);
  const [allArtists, setAllArtists] = useState<Artist[]>([]);
  const [filteredArtists, setFilteredArtists] = useState<Artist[]>([]);

  const [collectionCards, setCollectionCards] = useState<CollectionPokemonCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isClient, setIsClient] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setIsClient(true);
    
    const storedCardsRaw = localStorage.getItem("pokemonCards");
    if (storedCardsRaw) {
      try {
        const parsedCards = JSON.parse(storedCardsRaw) as CollectionPokemonCard[];
        if (Array.isArray(parsedCards)) {
          setCollectionCards(parsedCards);
        }
      } catch (error) {
        console.error("Failed to parse collection cards from localStorage", error);
      }
    }

    const artistMap = new Map<string, Artist>();
    ARTIST_DATA.forEach(artist => {
      if (artist && artist.name) {
        const existing = artistMap.get(artist.name);
        if (!existing || (artist.cardCount !== undefined && (!existing.cardCount || artist.cardCount > existing.cardCount))) {
          artistMap.set(artist.name, artist);
        }
      }
    });

    const uniqueArtists = Array.from(artistMap.values());
    const sortedArtists = uniqueArtists.sort((a, b) => a.name.localeCompare(b.name));
    setAllArtists(sortedArtists);
    setFilteredArtists(sortedArtists);

  }, []);

  useEffect(() => {
    if (!isClient) return;
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === "pokemonCards") {
         const storedCardsRaw = localStorage.getItem("pokemonCards");
        if (storedCardsRaw) {
          setCollectionCards(JSON.parse(storedCardsRaw));
        } else {
          setCollectionCards([]);
        }
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [isClient]);

  const fetchSets = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/sets');

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: `Failed to fetch sets from the database. Status: ${response.statusText}` }));
        throw new Error(errorData.message);
      }
      
      const fetchedSets: ApiSet[] = await response.json();

      if (!fetchedSets || fetchedSets.length === 0) {
        const countResponse = await fetch('/api/sets-count');
        const countData = await countResponse.json();
        if (countData.count === 0) {
            throw new Error("No sets found in the database. Please sync the sets in the Admin page first.");
        } else {
            throw new Error("No sets data found. The API returned an empty list but the database is not empty.");
        }
      }

      const fetchedDisplaySets: DisplaySet[] = fetchedSets.map(apiSet => ({
          id: apiSet.id,
          name: apiSet.name,
          series: apiSet.series,
          logoUrl: apiSet.images.logo,
          releaseDate: apiSet.releaseDate,
          totalCards: apiSet.total > 0 ? apiSet.total : apiSet.printedTotal,
          language: 'English',
      }));
      
      setDisplaySets(fetchedDisplaySets);
      setFilteredDisplaySets(fetchedDisplaySets);

    } catch (err) {
      console.error(`Error fetching sets from database:`, err);
      let detailedError = err instanceof Error ? err.message : "An unknown error occurred while fetching sets.";
      setError(detailedError);
      toast({
        variant: "destructive",
        title: "Could Not Load Sets",
        description: detailedError,
        duration: 10000,
        action: <ToastAction altText="Go to Admin" onClick={() => window.location.href = '/admin/sync'}>Go to Admin</ToastAction>,
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchSets();
  }, [fetchSets]);

  useEffect(() => {
    const lowercasedFilter = searchTerm.toLowerCase();
    if (activeTab === 'sets') {
      const filteredData = displaySets.filter(item =>
        item.name.toLowerCase().includes(lowercasedFilter) ||
        (item.series && item.series.toLowerCase().includes(lowercasedFilter)) ||
        item.id.toLowerCase().includes(lowercasedFilter)
      );
      setFilteredDisplaySets(filteredData);
    } else {
      const filteredData = allArtists.filter(artist =>
        artist.name.toLowerCase().includes(lowercasedFilter)
      );
      setFilteredArtists(filteredData);
    }
  }, [searchTerm, displaySets, allArtists, activeTab]);

  const getSetCompletion = (set: DisplaySet) => {
    if (!isClient) return { collected: 0, total: set.totalCards, percentage: 0 };
    
    const collectedCardIdentifiersInSet = new Set<string>();
    collectionCards.forEach(card => {
        if (card.language === set.language && card.set === set.name) {
            collectedCardIdentifiersInSet.add(`${card.name}-${card.cardNumber}`);
        }
    });
    const uniqueCollectedCount = collectedCardIdentifiersInSet.size;
    const totalInSet = set.totalCards > 0 ? set.totalCards : 1; 
    const percentage = totalInSet > 0 ? (uniqueCollectedCount / totalInSet) * 100 : 0;
    
    return { collected: uniqueCollectedCount, total: totalInSet, percentage };
  };
  
  const getArtistCompletion = (artist: Artist) => {
    if (!isClient || artist.cardCount === undefined) return { collected: 0, total: 0, percentage: 0 };
    
    const collectedCardIdentifiersByArtist = new Set<string>();
    collectionCards.forEach(card => {
        if (card.artist === artist.name) {
            collectedCardIdentifiersByArtist.add(`${card.name}-${card.cardNumber}-${card.set}`);
        }
    });
    const uniqueCollectedCount = collectedCardIdentifiersByArtist.size;
    const totalForArtist = artist.cardCount > 0 ? artist.cardCount : 1;
    const percentage = totalForArtist > 0 ? (uniqueCollectedCount / totalForArtist) * 100 : 0;
    
    return { collected: uniqueCollectedCount, total: artist.cardCount, percentage };
  };


  if (!isClient && isLoading) {
     return (
      <div className="flex flex-col min-h-screen bg-background">
        <AppHeader />
        <main className="flex-grow container mx-auto p-4 md:p-8 flex items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
           <p className="ml-4 text-lg text-muted-foreground">Loading...</p>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <AppHeader />
      <main className="flex-grow container mx-auto p-4 md:p-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <Card className="shadow-xl">
            <CardHeader>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <CardTitle className="font-headline text-3xl text-foreground">Browse TCG Catalog</CardTitle>
                    <TabsList className="grid w-full md:w-auto md:grid-cols-2">
                        <TabsTrigger value="sets"><Package className="mr-2 h-4 w-4"/>By Set</TabsTrigger>
                        <TabsTrigger value="artists"><Paintbrush className="mr-2 h-4 w-4"/>By Artist</TabsTrigger>
                    </TabsList>
                </div>
                <CardDescription>
                  {activeTab === 'sets' 
                    ? 'Explore different Pokémon TCG sets from throughout history.' 
                    : 'Explore the entire catalog through the lens of its talented illustrators.'}
                </CardDescription>
                <div className="relative mt-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                    type="text"
                    placeholder={activeTab === 'sets' ? "Search sets by name, series, or ID..." : "Search for an artist..."}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-full md:w-1/2"
                />
                </div>
            </CardHeader>
            <CardContent>
                <TabsContent value="sets">
                    {isLoading && (
                    <div className="flex justify-center items-center py-10">
                        <Loader2 className="h-12 w-12 animate-spin text-primary" />
                        <p className="ml-4 text-lg text-muted-foreground">Loading sets from database...</p>
                    </div>
                    )}
                    {error && (
                    <div className="flex flex-col items-center justify-center py-10 text-destructive text-center">
                        <ServerCrash className="h-16 w-16 mx-auto mb-4" />
                        <p className="text-xl font-semibold">Oops! Something went wrong.</p>
                        <p className="mt-2 max-w-md">{error}</p>
                         <Button onClick={fetchSets} className="mt-4"><RefreshCcw className="mr-2 h-4 w-4"/>Retry</Button>
                    </div>
                    )}
                    {!isLoading && !error && (
                    <ScrollArea className="h-[calc(100vh-22rem)] md:h-[calc(100vh-27rem)]">
                        {filteredDisplaySets.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 pt-4 pb-24 px-4">
                            {filteredDisplaySets.map((set) => {
                            const completion = getSetCompletion(set);
                            const linkHref = `/sets/${set.id}`;
                            return (
                                <Link key={set.id} href={linkHref} className="block group">
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
                                </Link>
                            );
                            })}
                            </div>
                        ) : (
                            <div className="text-center py-10 text-muted-foreground">
                                <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                <p className="text-lg">No sets found matching your search criteria.</p>
                            </div>
                        )}
                    </ScrollArea>
                    )}
                </TabsContent>
                <TabsContent value="artists">
                  <ScrollArea className="h-[calc(100vh-22rem)] md:h-[calc(100vh-27rem)]">
                      {filteredArtists.length > 0 ? (
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-6 pt-4 pb-24 px-4">
                          {filteredArtists.map((artist) => {
                            const completion = getArtistCompletion(artist);
                            return (
                              <Link key={artist.name} href={`/browse-artists/${encodeURIComponent(artist.name)}?tab=artists`} className="block group">
                                <Card className="bg-card hover:shadow-primary/20 hover:border-primary transition-all duration-300 ease-in-out transform hover:scale-105 flex flex-col items-center p-4 text-center h-full">
                                  <div className="flex items-center justify-center w-16 h-16 mb-4 bg-muted rounded-full" data-ai-hint="artist avatar">
                                    <User className="w-8 h-8 text-muted-foreground" />
                                  </div>
                                  <p className="font-semibold text-card-foreground group-hover:text-primary capitalize">{artist.name}</p>
                                  
                                  {artist.cardCount !== undefined && (
                                    <div className="w-full mt-2 mb-3 px-2">
                                      <Progress value={completion.percentage} className="h-2 [&>div]:bg-primary" />
                                      <p className="text-xs text-muted-foreground mt-1">
                                        {completion.collected} / {completion.total} unique cards
                                        {completion.percentage >= 100 && completion.total > 0 && <CheckCircle className="inline-block ml-1 h-3 w-3 text-green-500" />}
                                      </p>
                                    </div>
                                  )}
                                  
                                  <Button variant="outline" size="sm" className="mt-auto w-full group-hover:bg-primary group-hover:text-primary-foreground">View Cards</Button>
                                </Card>
                              </Link>
                            );
                          })}
                          </div>
                      ) : (
                          <div className="text-center py-10 text-muted-foreground">
                              <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                              <p className="text-lg">No artists found matching your search.</p>
                          </div>
                      )}
                  </ScrollArea>
                </TabsContent>
            </CardContent>
            </Card>
        </Tabs>
      </main>
       <footer className="text-center py-4 text-sm text-muted-foreground border-t border-border mt-auto">
        Pokédex Tracker &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
};

const BrowsePage: NextPage = () => {
  return (
    <Suspense fallback={
      <div className="flex flex-col min-h-screen bg-background">
        <AppHeader />
        <main className="flex-grow container mx-auto p-4 md:p-8 flex items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
           <p className="ml-4 text-lg text-muted-foreground">Loading...</p>
        </main>
      </div>
    }>
      <BrowsePageContent />
    </Suspense>
  );
};

export default BrowsePage;

    