
"use client";

import type { NextPage } from "next";
import { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Search, ListChecks, MapPin, Hash, Trophy } from "lucide-react";
import { pokedexRegions, allPokemonData, type PokemonPokedexEntry, type PokedexRegion } from "./pokedexData";
import type { PokemonCard as CollectionPokemonCard } from "@/types";
import { Progress } from "@/components/ui/progress";

const PokedexPage: NextPage = () => {
  console.log("Attempting to re-render PokedexPage to refresh build artifacts. Adding a log to test.");
  const [pokemonList, setPokemonList] = useState<PokemonPokedexEntry[]>([]);
  const [filteredPokemon, setFilteredPokemon] = useState<PokemonPokedexEntry[]>([]);
  const [regions, setRegions] = useState<PokedexRegion[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRegion, setSelectedRegion] = useState<string>("all");
  const [isClient, setIsClient] = useState(false);

  const [collectionCards, setCollectionCards] = useState<CollectionPokemonCard[]>([]);

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
    // Simulate loading data
    setTimeout(() => {
      setPokemonList(allPokemonData);
      setRegions(pokedexRegions);
      setIsLoading(false);
    }, 500);
  }, [loadCollectionCards]);

  // Listener for localStorage changes from other tabs/pages
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
    collectionCards.forEach(card => {
      if (card.name) {
        names.add(card.name.toLowerCase());
      }
    });
    return names;
  }, [collectionCards, isClient]);

  useEffect(() => {
    if (!isClient) return;

    let tempPokemon = [...pokemonList];

    if (selectedRegion !== "all") {
      tempPokemon = tempPokemon.filter(p => p.region === selectedRegion);
    }

    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      tempPokemon = tempPokemon.filter(
        p =>
          p.name.toLowerCase().includes(lowerSearchTerm) ||
          p.id.toString().includes(lowerSearchTerm)
      );
    }
    
    tempPokemon.sort((a,b) => a.id - b.id);

    setFilteredPokemon(tempPokemon);
  }, [pokemonList, searchTerm, selectedRegion, isClient]);

  const pokedexStats = useMemo(() => {
    if (!isClient) return { collected: 0, total: 0, percentage: 0 };
    
    const totalPokemonInCurrentView = filteredPokemon.length;
    const collectedInCurrentView = filteredPokemon.filter(p => collectedPokemonNames.has(p.name.toLowerCase())).length;
    
    const percentage = totalPokemonInCurrentView > 0 ? (collectedInCurrentView / totalPokemonInCurrentView) * 100 : 0;
    
    return {
      collected: collectedInCurrentView,
      total: totalPokemonInCurrentView,
      percentage: parseFloat(percentage.toFixed(1)),
    };
  }, [filteredPokemon, collectedPokemonNames, isClient]);


  if (!isClient || isLoading) {
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
      <main className="flex-grow container mx-auto p-4 md:p-8">
        <Card className="shadow-xl">
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
              <div>
                <CardTitle className="font-headline text-3xl text-foreground flex items-center gap-2">
                  <ListChecks className="h-8 w-8 text-primary" /> Pokédex
                </CardTitle>
                <CardDescription>
                  Browse Pokémon. Colored sprites indicate a card of that Pokémon is in your collection.
                </CardDescription>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                <div className="relative flex-grow md:flex-grow-0 md:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search Pokémon..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-full"
                  />
                </div>
                <Select value={selectedRegion} onValueChange={setSelectedRegion}>
                  <SelectTrigger className="w-full sm:w-auto md:w-48">
                    <SelectValue placeholder="Filter by Region" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Regions</SelectItem>
                    {regions.map((region) => (
                      <SelectItem key={region.name} value={region.name}>
                        {region.name} (Gen {region.generation})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
             {isClient && (
              <div className="mt-2 pt-3 border-t border-border/70">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                    <Trophy className="h-4 w-4 text-accent" />
                    Pokédex Completion (Current View):
                  </div>
                  <div className="text-sm font-semibold text-foreground">
                    {pokedexStats.collected} / {pokedexStats.total} Pokémon ({pokedexStats.percentage}%)
                  </div>
                </div>
                <Progress value={pokedexStats.percentage} className="h-2 [&>div]:bg-accent" />
              </div>
            )}
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[calc(100vh-20.1rem-3.5rem)] md:h-[calc(100vh-24.1rem-3.5rem)]"> {/* Adjusted height for stats bar */}
              {filteredPokemon.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {filteredPokemon.map((pokemon) => {
                    const isCollected = collectedPokemonNames.has(pokemon.name.toLowerCase());
                    return (
                      <Link key={pokemon.id} href={`/pokedex/${encodeURIComponent(pokemon.name.toLowerCase())}`} passHref legacyBehavior>
                        <a className="block group">
                          <Card className="bg-card hover:shadow-primary/20 hover:border-primary transition-all duration-300 ease-in-out transform hover:scale-105 flex flex-col items-center p-3 text-center h-full">
                            <div className={`relative w-24 h-24 mb-2 bg-muted/30 rounded-full overflow-hidden flex items-center justify-center ${!isCollected ? 'grayscale' : ''}`} data-ai-hint="pokemon sprite icon">
                              <Image src={pokemon.spriteUrl} alt={pokemon.name} width={96} height={96} objectFit="contain" />
                            </div>
                            <p className="font-semibold text-card-foreground group-hover:text-primary text-sm md:text-base">{pokemon.name}</p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1"><Hash size={12}/> #{pokemon.id.toString().padStart(3, '0')}</p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin size={12}/> {pokemon.region}</p>
                            <Button variant="outline" size="sm" className="mt-3 w-full text-xs group-hover:bg-primary group-hover:text-primary-foreground">
                              View Details
                            </Button>
                          </Card>
                        </a>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-10 text-muted-foreground">
                  <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg">No Pokémon found matching your criteria.</p>
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </main>
      <footer className="text-center py-4 text-sm text-muted-foreground border-t border-border mt-auto">
        Pokédex Tracker &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
};

export default PokedexPage;
