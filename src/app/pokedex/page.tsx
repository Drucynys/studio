
"use client";

import type { NextPage } from "next";
import { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Loader2, Search, Hash, Trophy, ListChecks, CheckCircle } from "lucide-react";
import { pokedexRegions, allPokemonData, type PokemonPokedexEntry, type PokedexRegion } from "./pokedexData";
import type { PokemonCard as CollectionPokemonCard } from "@/types";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const INITIAL_ITEMS_TO_SHOW = 48; 
const ITEMS_PER_LOAD = 24;      

const PokedexPage: NextPage = () => {
  const [pokemonList, setPokemonList] = useState<PokemonPokedexEntry[]>([]);
  const [regions, setRegions] = useState<PokedexRegion[]>([]);
  const [filteredPokemon, setFilteredPokemon] = useState<PokemonPokedexEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRegions, setSelectedRegions] = useState<Set<string>>(new Set());
  const [showOnlyCollected, setShowOnlyCollected] = useState(false);
  const [isClient, setIsClient] = useState(false);

  const [collectionCards, setCollectionCards] = useState<CollectionPokemonCard[]>([]);

  const [displayCount, setDisplayCount] = useState(INITIAL_ITEMS_TO_SHOW);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

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
        setCollectionCards([]);
      }
    } else {
      setCollectionCards([]);
    }
  }, []);

  useEffect(() => {
    setIsClient(true);
    loadCollectionCards();
    setTimeout(() => {
      setPokemonList(allPokemonData);
      setRegions(pokedexRegions);
      setIsLoading(false);
    }, 500);
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

  const collectedPokemonNames = useMemo(() => {
    if (!isClient) return new Set<string>();
    const names = new Set<string>();
    const canonicalPokedexNamesLower = allPokemonData.map(p => p.name.toLowerCase());
    collectionCards.forEach(cardInCollection => {
      if (cardInCollection.name) {
        const collectionCardNameLower = cardInCollection.name.toLowerCase();
        const matchedCanonicalName = canonicalPokedexNamesLower.find(
          canonicalName => collectionCardNameLower.startsWith(canonicalName)
        );
        if (matchedCanonicalName) {
          names.add(matchedCanonicalName);
        }
      }
    });
    return names;
  }, [collectionCards, isClient]);

  useEffect(() => {
    if (!isClient) return;

    let tempPokemon = [...pokemonList];

    if (selectedRegions.size > 0) {
      tempPokemon = tempPokemon.filter(p => selectedRegions.has(p.region));
    }

    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      tempPokemon = tempPokemon.filter(
        p =>
          p.name.toLowerCase().includes(lowerSearchTerm) ||
          p.id.toString().includes(lowerSearchTerm)
      );
    }

    if (showOnlyCollected) {
      tempPokemon = tempPokemon.filter(p => collectedPokemonNames.has(p.name.toLowerCase()));
    }

    tempPokemon.sort((a,b) => a.id - b.id);
    setFilteredPokemon(tempPokemon);
    setDisplayCount(INITIAL_ITEMS_TO_SHOW);
  }, [pokemonList, searchTerm, selectedRegions, isClient, showOnlyCollected, collectedPokemonNames]);

  const handleScroll = useCallback(() => {
    if (window.innerHeight + document.documentElement.scrollTop < document.documentElement.offsetHeight - 200 || isLoadingMore || displayCount >= filteredPokemon.length) {
      return;
    }
    setIsLoadingMore(true);
    setDisplayCount(prevCount => Math.min(prevCount + ITEMS_PER_LOAD, filteredPokemon.length));
  }, [isLoadingMore, displayCount, filteredPokemon.length]);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  useEffect(() => {
    if (isLoadingMore) {
      const timer = setTimeout(() => {
        setIsLoadingMore(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [displayCount, isLoadingMore]);

  const pokedexStats = useMemo(() => {
    if (!isClient) return { collected: 0, total: 0, percentage: 0, regionDisplayText: "All Regions" };
    
    const totalPokemonInCurrentFilteredView = filteredPokemon.length;
    const collectedInCurrentFilteredView = filteredPokemon.filter(p => collectedPokemonNames.has(p.name.toLowerCase())).length;
    
    const percentage = totalPokemonInCurrentFilteredView > 0 ? (collectedInCurrentFilteredView / totalPokemonInCurrentFilteredView) * 100 : 0;

    let regionText = "All Regions";
    if (selectedRegions.size === 1) {
      regionText = Array.from(selectedRegions)[0];
    } else if (selectedRegions.size > 1) {
      regionText = `${selectedRegions.size} Regions Selected`;
    }

    return {
      collected: collectedInCurrentFilteredView,
      total: totalPokemonInCurrentFilteredView,
      percentage: parseFloat(percentage.toFixed(1)),
      regionDisplayText: regionText,
    };
  }, [filteredPokemon, collectedPokemonNames, isClient, selectedRegions]);

  const handleRegionButtonClick = (regionName: string | null) => {
    const newSelectedRegions = new Set(selectedRegions);
    if (regionName === null) {
      newSelectedRegions.clear();
    } else {
      if (newSelectedRegions.has(regionName)) {
        newSelectedRegions.delete(regionName);
      } else {
        newSelectedRegions.add(regionName);
      }
    }
    setSelectedRegions(newSelectedRegions);
  };

  if (!isClient && isLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <AppHeader />
        <main className="flex-grow container mx-auto p-4 md:p-8 flex items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="ml-4 text-lg text-muted-foreground">Loading Pokédex...</p>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <AppHeader />
      <main className="flex-grow container mx-auto px-4 md:px-8 pt-4 pb-8">
        <div className="sticky top-[calc(var(--header-height,4rem)+0.5rem)] md:top-[calc(var(--header-height,4rem)+1rem)] z-30 bg-background/95 backdrop-blur-sm p-4 mb-6 shadow-lg rounded-lg border border-border flex flex-col gap-4">
          {/* Row 1: Title, Search, and "Show Collected" Switch */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <h2 className="text-3xl font-headline font-semibold text-primary flex items-center gap-2 whitespace-nowrap">
              <ListChecks className="h-8 w-8" /> Pokédex
            </h2>
            {/* Combined Search and Switch */}
            <div className="flex flex-col md:flex-row gap-4 items-center w-full flex-1 min-w-0">
              <div className="relative flex-grow w-full md:max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search Pokémon by name or ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full"
                />
              </div>
              {isClient && (
                <div className="flex items-center space-x-2 flex-shrink-0 self-start md:self-center">
                  <Switch
                    id="show-only-collected"
                    checked={showOnlyCollected}
                    onCheckedChange={setShowOnlyCollected}
                    aria-label="Show only collected Pokémon"
                  />
                  <Label htmlFor="show-only-collected" className="text-sm font-medium text-muted-foreground whitespace-nowrap">
                    Show Only Collected
                  </Label>
                </div>
              )}
            </div>
          </div>

          {/* Row 2: Region Filters */}
          <div>
            <p className="mb-2 text-sm font-medium text-muted-foreground">Filter by Region:</p>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant={selectedRegions.size === 0 ? "default" : "outline"}
                onClick={() => handleRegionButtonClick(null)}
                className={cn(selectedRegions.size === 0 && "ring-2 ring-primary-foreground dark:ring-primary ring-offset-1 ring-offset-background")}
              >
                All Regions
              </Button>
              {regions.map((region) => (
                <Button
                  key={region.name}
                  size="sm"
                  variant={selectedRegions.has(region.name) ? "default" : "outline"}
                  onClick={() => handleRegionButtonClick(region.name)}
                  className={cn(selectedRegions.has(region.name) && "ring-2 ring-primary-foreground dark:ring-primary ring-offset-1 ring-offset-background")}
                >
                  {region.name}
                </Button>
              ))}
            </div>
          </div>

          {/* Row 3 (Bottom): Pokédex Completion Stats */}
          {isClient && (
            <div className="w-full border-t border-border/50 pt-3 mt-1"> {/* Added mt-1 for slight separation from gap-4 of parent */}
              <div className="flex flex-col items-start sm:items-end text-left sm:text-right space-y-1">
                <div className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground w-full justify-start sm:justify-end">
                  <Trophy className="h-4 w-4 text-accent flex-shrink-0" />
                  <span className="truncate">
                      Pokédex Completion ({pokedexStats.regionDisplayText}
                      {showOnlyCollected && collectedPokemonNames.size > 0 && filteredPokemon.length > 0 ? ", Collected Only" : ""}):
                  </span>
                  <span className="font-semibold text-foreground ml-1 whitespace-nowrap">
                      {pokedexStats.collected}/{pokedexStats.total} ({pokedexStats.percentage}%)
                  </span>
                </div>
                <Progress value={pokedexStats.percentage} className="h-2 [&>div]:bg-accent w-full" />
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 pt-2 pb-4 px-1">
          {filteredPokemon.slice(0, displayCount).map((pokemon) => {
            const isCollected = collectedPokemonNames.has(pokemon.name.toLowerCase());
            return (
              <TooltipProvider key={pokemon.id} delayDuration={150}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link href={`/pokedex/${encodeURIComponent(pokemon.name.toLowerCase())}`} passHref legacyBehavior>
                      <a className="block group">
                        <div
                          className={cn(
                            "bg-card hover:shadow-primary/20 hover:border-primary border border-border transition-all duration-300 ease-in-out transform hover:scale-105",
                            "group-hover:z-10 relative overflow-hidden aspect-square rounded-md"
                          )}>
                          {isCollected && (
                            <CheckCircle className="absolute top-1.5 right-1.5 h-5 w-5 text-green-500 bg-background/80 backdrop-blur-sm rounded-full p-0.5 z-10 shadow-sm" />
                          )}
                          <div className={cn(
                              `w-full h-full transition-all duration-300 p-2`,
                              !isCollected ? 'grayscale group-hover:grayscale-0' : ''
                            )}
                            data-ai-hint="pokemon sprite icon"
                          >
                            <Image
                              src={pokemon.spriteUrl}
                              alt={pokemon.name}
                              layout="fill"
                              objectFit="contain"
                            />
                          </div>
                          <div className="absolute bottom-1.5 right-1.5 bg-background/70 backdrop-blur-sm px-1.5 py-0.5 rounded text-xs text-foreground font-medium flex items-center">
                            <Hash size={10} className="mr-0.5 opacity-70"/>
                            {pokemon.id.toString().padStart(3, '0')}
                          </div>
                        </div>
                      </a>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" align="center">
                    <p>{pokemon.name}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            );
          })}
        </div>
        
        {isLoadingMore && displayCount < filteredPokemon.length && (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-2 text-muted-foreground">Loading more Pokémon...</p>
          </div>
        )}

        {!isLoadingMore && displayCount >= filteredPokemon.length && filteredPokemon.length > 0 && (
            <p className="text-center py-8 text-muted-foreground">You've reached the end of the list!</p>
        )}

        {filteredPokemon.length === 0 && !isLoading && (
            <div className="text-center py-10 text-muted-foreground">
                <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg">
                {showOnlyCollected && collectedPokemonNames.size === 0 && selectedRegions.size === 0 && !searchTerm ? "You haven't collected any Pokémon yet." :
                (showOnlyCollected ? "No collected Pokémon match your current filters." : "No Pokémon found matching your criteria.")}
                </p>
                {(showOnlyCollected && collectedPokemonNames.size === 0 && (selectedRegions.size > 0 || searchTerm)) && (
                    <p className="text-sm">Try adjusting your filters or adding Pokémon to your collection.</p>
                )}
            </div>
        )}
      </main>
      <footer className="text-center py-4 text-sm text-muted-foreground border-t border-border mt-auto">
        Pokédex Tracker &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
};

export default PokedexPage;
    
