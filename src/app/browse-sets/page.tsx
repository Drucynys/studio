// src/app/browse-sets/page.tsx
"use client";

import type { NextPage } from "next";
import { useEffect, useState, useCallback, Suspense, useMemo, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { AppHeader } from "@/components/AppHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, ServerCrash, Search, CheckCircle, Package, Paintbrush, User, RefreshCcw, Hash, Filter } from "lucide-react";
import Image from "next/image";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/useAuth";
import type { PokemonCard as CollectionPokemonCard } from "@/types";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { CircularProgress } from "@/components/ui/circular-progress";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter
} from "@/components/ui/sheet";


interface ApiSet {
  id: string;
  name: string;
  series: string;
  printedTotal: number;
  total: number;
  releaseDate: string;
  images: {
    symbol: string;
    logo: string;
  };
}

interface Artist {
  name: string;
  cardCount: number;
}

const BrowsePageContent: NextPage = () => {
  const searchParams = useSearchParams();
  const { collection, loading: authLoading, user } = useAuth();
  
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);

  const tabParam = searchParams.get('tab');
  const initialTab = tabParam === 'artists' ? 'artists' : 'sets';
  const [activeTab, setActiveTab] = useState(initialTab);

  const [allSets, setAllSets] = useState<ApiSet[]>([]);
  const [filteredSets, setFilteredSets] = useState<ApiSet[]>([]);
  const [loadingSets, setLoadingSets] = useState(true);
  const [setsError, setSetsError] = useState<string | null>(null);
  
  const [allArtists, setAllArtists] = useState<Artist[]>([]);
  const [filteredArtists, setFilteredArtists] = useState<Artist[]>([]);
  const [loadingArtists, setLoadingArtists] = useState(false);
  const [artistsError, setArtistsError] = useState<string | null>(null);

  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSeries, setSelectedSeries] = useState<string[]>([]);
  const { toast } = useToast();
  
  const isLoading = loadingSets || loadingArtists || authLoading;

  const handleScroll = useCallback((event: Event) => {
    const target = event.target as HTMLDivElement;
    const currentScrollY = target.scrollTop;
    
    // Only hide header if we've scrolled more than 10px and are scrolling down
    if (Math.abs(currentScrollY - lastScrollY) < 10) return;

    if (currentScrollY > lastScrollY && currentScrollY > 100) {
      setIsHeaderVisible(false); // scrolling down
    } else {
      setIsHeaderVisible(true); // scrolling up
    }
    setLastScrollY(currentScrollY);
  }, [lastScrollY]);

  // Attach scroll event listener to the scroll area
  useEffect(() => {
    const scrollElement = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]') as HTMLDivElement;
    
    if (scrollElement) {
      scrollElement.addEventListener('scroll', handleScroll, { passive: true });
      
      return () => {
        scrollElement.removeEventListener('scroll', handleScroll);
      };
    }
  }, [handleScroll]);

  const fetchSets = useCallback(async () => {
    setLoadingSets(true);
    setSetsError(null);
    try {
      const response = await fetch('/api/sets');
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: `Failed to fetch sets. Status: ${response.statusText}` }));
        throw new Error(errorData.message);
      }
      const fetchedSets: ApiSet[] = await response.json();
      if (!fetchedSets || fetchedSets.length === 0) {
        throw new Error("No sets found in the database. Please sync them in the Admin page first.");
      }
      setAllSets(fetchedSets);
      setFilteredSets(fetchedSets);
    } catch (err) {
      const message = err instanceof Error ? err.message : "An unknown error occurred while fetching sets.";
      setSetsError(message);
      toast({
        variant: "destructive",
        title: "Could Not Load Sets",
        description: message,
        duration: 10000,
        action: <ToastAction altText="Go to Admin" onClick={() => window.location.href = '/admin/sync'}>Go to Admin</ToastAction>,
      });
    } finally {
      setLoadingSets(false);
    }
  }, [toast]);

  const fetchArtists = useCallback(async () => {
    setLoadingArtists(true);
    setArtistsError(null);
    try {
      const response = await fetch('/api/artists');
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: `Failed to fetch artists. Status: ${response.statusText}` }));
        throw new Error(errorData.message);
      }
      const fetchedArtists: Artist[] = await response.json();
       if (!fetchedArtists || fetchedArtists.length === 0) {
        toast({
            variant: "default",
            title: "Artists Not Found",
            description: "Please generate the artist database from the Admin page to enable artist browsing.",
            duration: 10000,
            action: <ToastAction altText="Go to Admin" onClick={() => window.location.href = '/admin/sync'}>Go to Admin</ToastAction>,
        });
      }
      setAllArtists(fetchedArtists);
      setFilteredArtists(fetchedArtists);
    } catch (err) {
      const message = err instanceof Error ? err.message : "An unknown error occurred while fetching artists.";
      setArtistsError(message);
      toast({
        variant: "destructive",
        title: "Could Not Load Artists",
        description: message,
        duration: 10000,
        action: <ToastAction altText="Go to Admin" onClick={() => window.location.href = '/admin/sync'}>Go to Admin</ToastAction>,
      });
    } finally {
      setLoadingArtists(false);
    }
  }, [toast]);


  // Fetch initial data based on the active tab
  useEffect(() => {
    if (activeTab === 'sets') {
      if (allSets.length === 0) fetchSets();
    } else {
      if (allArtists.length === 0) fetchArtists();
    }
  }, [activeTab, fetchSets, fetchArtists, allSets, allArtists]);


  useEffect(() => {
    const lowercasedFilter = searchTerm.toLowerCase();
    if (activeTab === 'sets') {
      let filteredData = allSets;

      if (selectedSeries.length > 0) {
        filteredData = filteredData.filter(set => selectedSeries.includes(set.series));
      }

      if (searchTerm) {
          filteredData = filteredData.filter(item =>
            item.name.toLowerCase().includes(lowercasedFilter) ||
            item.id.toLowerCase().includes(lowercasedFilter)
          );
      }

      filteredData.sort((a, b) => {
        const dateA = new Date(a.releaseDate).getTime();
        const dateB = new Date(b.releaseDate).getTime();
        return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
      });

      setFilteredSets(filteredData);
    } else {
      const filteredData = allArtists.filter(artist =>
        artist.name.toLowerCase().includes(lowercasedFilter)
      );
      setFilteredArtists(filteredData);
    }
  }, [searchTerm, allSets, allArtists, activeTab, sortOrder, selectedSeries]);
  
  const availableSeries = useMemo(() => {
    const seriesSet = new Set(allSets.map(set => set.series));
    return Array.from(seriesSet).sort((a,b) => b.localeCompare(a)); // Sort alphabetically or by another logic if needed
  }, [allSets]);


  const setCompletions = useMemo(() => {
    if (!user) return new Map();
    const map = new Map<string, { collected: number; total: number; percentage: number }>();
    allSets.forEach(set => {
      const collectedInSet = new Set(collection.filter(c => c.set === set.name).map(c => `${c.name}-${c.cardNumber}`));
      const uniqueCollectedCount = collectedInSet.size;
      const totalInSet = set.printedTotal > 0 ? set.printedTotal : 1; 
      const percentage = totalInSet > 0 ? (uniqueCollectedCount / totalInSet) * 100 : 0;
      map.set(set.id, { collected: uniqueCollectedCount, total: totalInSet, percentage });
    });
    return map;
  }, [collection, allSets, user]);

  const artistCompletions = useMemo(() => {
    if (!user) return new Map();
    const map = new Map<string, { collected: number; total: number; percentage: number }>();
    allArtists.forEach(artist => {
      const collectedByArtist = new Set(collection.filter(c => c.artist === artist.name).map(c => `${c.name}-${c.cardNumber}-${c.set}`));
      const uniqueCollectedCount = collectedByArtist.size;
      const totalForArtist = artist.cardCount > 0 ? artist.cardCount : 1;
      const percentage = totalForArtist > 0 ? (uniqueCollectedCount / totalForArtist) * 100 : 0;
      map.set(artist.name, { collected: uniqueCollectedCount, total: artist.cardCount, percentage });
    });
    return map;
  }, [collection, allArtists, user]);

  const groupedSets = useMemo(() => {
    return filteredSets.reduce((acc, set) => {
        const series = set.series || "Uncategorized";
        if (!acc[series]) {
            acc[series] = [];
        }
        acc[series].push(set);
        return acc;
    }, {} as Record<string, ApiSet[]>);
  }, [filteredSets]);

  const sortedSeriesKeys = useMemo(() => {
      return Object.keys(groupedSets).sort((a, b) => {
          if (!groupedSets[a][0] || !groupedSets[b][0]) return 0;
          const dateA = new Date(groupedSets[a][0].releaseDate).getTime();
          const dateB = new Date(groupedSets[b][0].releaseDate).getTime();
          return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
      });
  }, [groupedSets, sortOrder]);


  if (isLoading) {
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
  
  const handleSeriesToggle = (series: string) => {
    setSelectedSeries(prev => {
        const isSelected = prev.includes(series);
        if (isSelected) {
            return prev.filter(s => s !== series);
        } else {
            return [...prev, series];
        }
    });
  };

  const FilterControls = ({ isSheet = false }: { isSheet?: boolean }) => (
    <>
      <div className="space-y-2">
        <label className="text-sm font-medium">Sort Order</label>
        <Select value={sortOrder} onValueChange={(value) => setSortOrder(value as 'desc' | 'asc')}>
            <SelectTrigger>
                <SelectValue placeholder="Sort by year" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="desc">Newest First</SelectItem>
                <SelectItem value="asc">Oldest First</SelectItem>
            </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">Filter by Series</label>
         <DropdownMenu>
            <DropdownMenuTrigger asChild>
               <Button variant="outline" className="w-full justify-between">
                  <span>{selectedSeries.length === 0 ? "All Series" : `${selectedSeries.length} selected`}</span>
                  {selectedSeries.length > 0 && (
                    <Badge variant="secondary" className="ml-2">{selectedSeries.length}</Badge>
                  )}
               </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width]">
              <DropdownMenuLabel>Filter by Series</DropdownMenuLabel>
              <DropdownMenuSeparator />
               <DropdownMenuCheckboxItem
                  checked={selectedSeries.length === 0}
                  onCheckedChange={() => setSelectedSeries([])}
               >
                  All Series
               </DropdownMenuCheckboxItem>
              <DropdownMenuSeparator />
              {availableSeries.map(series => (
                 <DropdownMenuCheckboxItem
                    key={series}
                    checked={selectedSeries.includes(series)}
                    onCheckedChange={() => handleSeriesToggle(series)}
                 >
                    {series}
                 </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
      </div>
    </>
  );

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <AppHeader />
      <main className="flex-grow container mx-auto p-4 md:p-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className={cn(
              "p-4 md:p-6 bg-card rounded-lg shadow-xl mb-6 sticky top-[65px] md:top-[77px] z-40 transition-transform duration-300",
              !isHeaderVisible && "-translate-y-full"
              )}>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="space-y-1">
                      <h1 className="font-headline text-3xl text-foreground">Browse TCG Catalog</h1>
                      <p className="text-muted-foreground">
                        {activeTab === 'sets' 
                          ? 'Explore different Pokémon TCG sets from throughout history.' 
                          : 'Explore the entire catalog through the lens of its talented illustrators.'}
                      </p>
                    </div>
                    <TabsList className="grid w-full sm:w-auto grid-cols-2">
                        <TabsTrigger value="sets"><Package className="mr-2 h-4 w-4"/>By Set</TabsTrigger>
                        <TabsTrigger value="artists"><Paintbrush className="mr-2 h-4 w-4"/>By Artist</TabsTrigger>
                    </TabsList>
                </div>
                
                <div className="flex flex-col md:flex-row gap-4 mt-4">
                  <div className="relative flex-grow">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                        type="text"
                        placeholder={activeTab === 'sets' ? "Search sets by name..." : "Search for an artist..."}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 w-full"
                    />
                  </div>
                  {activeTab === 'sets' && (
                    <>
                      {/* Desktop Filters */}
                      <div className="hidden md:flex flex-shrink-0 gap-4">
                         <FilterControls />
                      </div>
                       {/* Mobile Filter Button */}
                       <div className="md:hidden">
                          <Sheet>
                              <SheetTrigger asChild>
                                <Button variant="outline" className="w-full relative">
                                  <Filter className="mr-2 h-4 w-4" />
                                  Filter
                                  {selectedSeries.length > 0 && (
                                      <Badge variant="destructive" className="absolute -top-2 -right-2 px-2">{selectedSeries.length}</Badge>
                                  )}
                                </Button>
                              </SheetTrigger>
                              <SheetContent side="bottom" className="rounded-t-lg">
                                <SheetHeader>
                                  <SheetTitle>Filter & Sort</SheetTitle>
                                </SheetHeader>
                                <div className="grid gap-4 py-4">
                                  <FilterControls isSheet={true} />
                                </div>
                                <SheetFooter>
                                  <SheetTrigger asChild>
                                    <Button className="w-full">Done</Button>
                                  </SheetTrigger>
                                </SheetFooter>
                              </SheetContent>
                          </Sheet>
                       </div>
                    </>
                  )}
                </div>
            </div>

            <TabsContent value="sets">
                {setsError ? (
                <div className="flex flex-col items-center justify-center py-10 text-destructive text-center bg-card rounded-lg shadow-xl">
                    <ServerCrash className="h-16 w-16 mx-auto mb-4" />
                    <p className="text-xl font-semibold">Oops! Something went wrong.</p>
                    <p className="mt-2 max-w-md">{setsError}</p>
                     <Button onClick={fetchSets} className="mt-4"><RefreshCcw className="mr-2 h-4 w-4"/>Retry</Button>
                </div>
                ) : (
                <ScrollArea className="h-[calc(100vh-22rem)] md:h-[calc(100vh-27rem)]" ref={scrollAreaRef}>
                    {sortedSeriesKeys.length > 0 ? (
                       sortedSeriesKeys.map(seriesName => (
                           <div key={seriesName} className="mb-8">
                               <h2 className="text-2xl font-bold tracking-tight mt-6 mb-2 flex items-center gap-2 px-4">
                                 {seriesName} Series
                               </h2>
                               <Separator className="mb-4 mx-4" />
                               <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-6 pt-4 px-4">
                                 {groupedSets[seriesName].map((set) => {
                                   const completion = setCompletions.get(set.id) || { collected: 0, total: set.printedTotal, percentage: 0 };
                                   const linkHref = `/sets/${set.id}`;
                                   return (
                                        <Link key={set.id} href={linkHref} className="block group">
                                            <Card className={cn("bg-card hover:shadow-primary/20 hover:border-primary transition-all duration-300 ease-in-out transform hover:scale-105 flex flex-col justify-between p-3 text-center aspect-square", "group-hover:z-10 relative")}>
                                                <div className="flex justify-between items-start w-full">
                                                    <div className="relative h-6 w-6">
                                                        {set.images.symbol && <Image src={set.images.symbol} alt={`${set.name} symbol`} layout="fill" objectFit="contain" data-ai-hint="pokemon set symbol"/>}
                                                    </div>
                                                    {user && (
                                                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                            <span>{completion.collected}/{completion.total}</span>
                                                            <CircularProgress value={completion.percentage} size={16} strokeWidth={3} />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex-grow flex items-center justify-center w-full my-2">
                                                  {set.images.logo ? (
                                                      <div className="relative w-full h-full">
                                                          <Image src={set.images.logo} alt={`${set.name} logo`} layout="fill" objectFit="contain" data-ai-hint="pokemon set logo"/>
                                                      </div>
                                                  ) : (
                                                      <div className="w-full h-full bg-muted rounded flex items-center justify-center" data-ai-hint="logo placeholder">
                                                          <span className="text-xs text-muted-foreground">No Logo</span>
                                                      </div>
                                                  )}
                                                </div>
                                                <p className="font-semibold text-sm mt-auto truncate w-full">{set.name}</p>
                                            </Card>
                                       </Link>
                                   );
                                 })}
                               </div>
                           </div>
                       ))
                    ) : ( <div className="text-center py-10 text-muted-foreground"><Search className="h-12 w-12 mx-auto mb-4 opacity-50" /><p className="text-lg">No sets found matching your search criteria.</p></div> )}
                </ScrollArea>
                )}
            </TabsContent>
            <TabsContent value="artists">
              {artistsError ? (
                <div className="flex flex-col items-center justify-center py-10 text-destructive text-center bg-card rounded-lg shadow-xl">
                    <ServerCrash className="h-16 w-16 mx-auto mb-4" />
                    <p className="text-xl font-semibold">Oops! Something went wrong.</p>
                    <p className="mt-2 max-w-md">{artistsError}</p>
                     <Button onClick={fetchArtists} className="mt-4"><RefreshCcw className="mr-2 h-4 w-4"/>Retry</Button>
                </div>
                ) : (
                <ScrollArea className="h-[calc(100vh-22rem)] md:h-[calc(100vh-27rem)]">
                    {filteredArtists.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-6 pt-4 pb-24 px-4">
                        {filteredArtists.map((artist) => {
                          const completion = artistCompletions.get(artist.name) || { collected: 0, total: artist.cardCount, percentage: 0 };
                          return (
                            <Link key={artist.name} href={`/browse-artists/${encodeURIComponent(artist.name)}`} className="block group">
                              <Card className="bg-card hover:shadow-primary/20 hover:border-primary transition-all duration-300 ease-in-out transform hover:scale-105 flex flex-col items-center p-4 text-center h-full">
                                <div className="flex items-center justify-center w-16 h-16 mb-4 bg-muted rounded-full" data-ai-hint="artist avatar"><User className="w-8 h-8 text-muted-foreground" /></div>
                                <p className="font-semibold text-card-foreground group-hover:text-primary capitalize">{artist.name}</p>
                                {user && artist.cardCount !== undefined && (<div className="w-full mt-2 mb-3 px-2">
                                    <Progress value={completion.percentage} className="h-2 [&>div]:bg-primary" />
                                    <p className="text-xs text-muted-foreground mt-1">{completion.collected} / {completion.total} unique cards
                                      {completion.percentage >= 100 && completion.total > 0 && <CheckCircle className="inline-block ml-1 h-3 w-3 text-green-500" />}</p>
                                  </div>)}
                                <Button variant="outline" size="sm" className="mt-auto w-full group-hover:bg-primary group-hover:text-primary-foreground">View Cards</Button>
                              </Card>
                            </Link>
                          );
                        })}
                        </div>
                    ) : ( <div className="text-center py-10 text-muted-foreground"><Search className="h-12 w-12 mx-auto mb-4 opacity-50" /><p className="text-lg">No artists found matching your search.</p></div> )}
                </ScrollArea>
              )}
            </TabsContent>
        </Tabs>
      </main>
       <footer className="text-center py-4 text-sm text-muted-foreground border-t border-border mt-auto">
        PokéTRKR &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
};

const BrowsePage: NextPage = () => (
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

export default BrowsePage;
