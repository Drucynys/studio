
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { AppHeader } from "@/components/AppHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Search, ServerCrash, Hash } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { PokedexIcon } from "@/components/icons/PokedexIcon";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";


export interface Pokemon {
  id: number;
  name: string;
  sprite: string;
  generation: number;
}

export default function PokedexPage() {
  const { user, collection, loading: authLoading } = useAuth();
  const [allPokemon, setAllPokemon] = useState<Pokemon[]>([]);
  const [filteredPokemon, setFilteredPokemon] = useState<Pokemon[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  
  const [selectedGenerations, setSelectedGenerations] = useState<number[]>([]);
  const totalGenerations = 9;
  const generations = useMemo(() => Array.from({ length: totalGenerations }, (_, i) => i + 1), [totalGenerations]);

  const generationRegions: { [key: number]: string } = {
    1: "Kanto",
    2: "Johto",
    3: "Hoenn",
    4: "Sinnoh",
    5: "Unova",
    6: "Kalos",
    7: "Alola",
    8: "Galar",
    9: "Paldea",
  };

  const ownedPokemonNames = useMemo(() => {
    if (!user) return new Set();
    return new Set(collection.map(card => card.name.toLowerCase()));
  }, [collection, user]);

  const fetchPokemon = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/pokedex');
      if (!response.ok) {
        throw new Error('Failed to fetch Pokédex from the database.');
      }
      const data: Pokemon[] = await response.json();

      if (data.length === 0) {
        toast({
            variant: "destructive",
            title: "Pokédex is Empty",
            description: "Please sync the Pokédex data from the Admin page first.",
            duration: 10000,
            action: <ToastAction altText="Go to Admin" onClick={() => window.location.href = '/admin/sync'}>Go to Admin</ToastAction>,
        });
      }

      setAllPokemon(data);
    } catch (err: any) {
      setError(err.message);
      toast({
        variant: "destructive",
        title: "Could Not Load Pokédex",
        description: `${err.message}`,
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchPokemon();
  }, [fetchPokemon]);


  useEffect(() => {
    let filtered = [...allPokemon];

    if (selectedGenerations.length > 0) {
      filtered = filtered.filter(p => selectedGenerations.includes(p.generation));
    }
    
    if (searchTerm) {
        const lowercasedFilter = searchTerm.toLowerCase();
        filtered = filtered.filter(p =>
          p.name.toLowerCase().includes(lowercasedFilter) ||
          String(p.id).includes(lowercasedFilter)
        );
    }
    
    setFilteredPokemon(filtered);
  }, [searchTerm, allPokemon, selectedGenerations]);

  const completionStats = useMemo(() => {
    const total = filteredPokemon.length;
    if (total === 0 || !user) {
      return { collected: 0, total: 0, percentage: 0 };
    }
    const collected = filteredPokemon.filter(p => ownedPokemonNames.has(p.name.toLowerCase())).length;
    const percentage = (collected / total) * 100;
    return { collected, total, percentage };
  }, [filteredPokemon, ownedPokemonNames, user]);

  const groupedPokemon = useMemo(() => {
    return filteredPokemon.reduce((acc, pokemon) => {
        const gen = pokemon.generation;
        if (!acc[gen]) {
            acc[gen] = [];
        }
        acc[gen].push(pokemon);
        return acc;
    }, {} as Record<number, Pokemon[]>);
  }, [filteredPokemon]);

  const sortedGenerationKeys = useMemo(() => {
      return Object.keys(groupedPokemon).map(Number).sort((a, b) => a - b);
  }, [groupedPokemon]);


  if (isLoading || authLoading) {
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
  
  if (error) {
     return (
      <div className="flex flex-col min-h-screen bg-background">
        <AppHeader />
        <main className="flex-grow container mx-auto p-4 md:p-8 flex flex-col items-center justify-center text-center">
            <ServerCrash className="h-16 w-16 text-destructive mb-4" />
            <h2 className="text-2xl font-bold text-destructive">Failed to Load Pokédex</h2>
            <p className="text-muted-foreground mt-2">{error}</p>
            <Button onClick={fetchPokemon} className="mt-4">Try Again</Button>
        </main>
      </div>
    );
  }

  const handleGenerationToggle = (gen: number) => {
    setSelectedGenerations(prev => {
        const isSelected = prev.includes(gen);
        if (isSelected) {
            return prev.filter(g => g !== gen);
        } else {
            return [...prev, gen].sort((a,b) => a-b);
        }
    });
  };

  const handleSelectAllGens = () => {
      setSelectedGenerations([]);
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <AppHeader />
      <main className="flex-grow container mx-auto p-4 md:p-8 flex flex-col gap-6">
        <Card className="shadow-xl">
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              <div>
                <CardTitle className="font-headline text-3xl text-foreground flex items-center gap-2">
                  <PokedexIcon className="h-8 w-8 text-primary"/>
                  Pokédex
                </CardTitle>
                <CardDescription className="pt-2">
                  Browse all Pokémon to see their TCG card appearances. Data is sourced from your local database.
                </CardDescription>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                <div className="relative flex-grow">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Search Pokémon..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 w-full"
                    />
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-full sm:w-auto justify-start">
                      <span>Gen</span>
                      {selectedGenerations.length > 0 && (
                        <Badge variant="secondary" className="ml-2">{selectedGenerations.length} selected</Badge>
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56">
                    <DropdownMenuLabel>Filter by Generation</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuCheckboxItem
                        checked={selectedGenerations.length === 0}
                        onCheckedChange={() => handleSelectAllGens()}
                    >
                        All Generations
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuSeparator />
                    {generations.map(gen => (
                      <DropdownMenuCheckboxItem
                        key={gen}
                        checked={selectedGenerations.includes(gen)}
                        onCheckedChange={() => handleGenerationToggle(gen)}
                      >
                        Generation {gen} ({generationRegions[gen]})
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            {user && (
              <div className="space-y-2 pt-4">
                  <div className="flex justify-between items-baseline">
                      <h3 className="text-sm font-medium text-muted-foreground">
                          {selectedGenerations.length > 0 || searchTerm ? 'Filtered Progress' : 'Overall Collection Progress'}
                      </h3>
                      <p className="text-sm font-semibold text-primary">
                          {completionStats.collected} / {completionStats.total}
                          <span className="text-muted-foreground font-normal"> owned</span>
                      </p>
                  </div>
                  <Progress value={completionStats.percentage} className="h-2" />
              </div>
            )}
          </CardHeader>
        </Card>
        
        <Card className="shadow-xl flex-1 overflow-hidden">
          <CardContent className="pt-6 h-full">
            <ScrollArea className="h-full">
              {filteredPokemon.length > 0 ? (
                sortedGenerationKeys.map(genKey => (
                    <div key={genKey}>
                        <>
                            <h2 className="text-2xl font-bold tracking-tight mt-6 mb-2 flex items-center gap-2 px-4">
                                <Hash className="h-6 w-6 text-primary/80" /> Generation {genKey} - {generationRegions[genKey]}
                            </h2>
                            <Separator className="mb-4 mx-4" />
                        </>
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-4 pt-4 pb-12 px-4">
                            {groupedPokemon[genKey]?.map((pokemon) => {
                                const isOwned = ownedPokemonNames.has(pokemon.name.toLowerCase());
                                return (
                                <Link key={pokemon.id} href={`/pokedex/${pokemon.name.toLowerCase()}`} className="block group">
                                <Card className={cn(
                                    "bg-card hover:shadow-primary/20 hover:border-primary transition-all duration-300 ease-in-out transform hover:scale-105 flex flex-col items-center justify-center p-4 text-center relative aspect-square",
                                    isOwned ? "ring-2 ring-green-500" : "saturate-[.80]"
                                )}>
                                    <div className={cn("relative w-24 h-24 transition-all")}>
                                    <Image
                                        src={pokemon.sprite}
                                        alt={pokemon.name}
                                        layout="fill"
                                        objectFit="contain"
                                        unoptimized // Sprites are small and don't need optimization
                                        data-ai-hint="pokemon sprite"
                                        className={cn("rounded-lg")}
                                    />
                                    </div>
                                    <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded-full bg-black/10 text-xs font-mono text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground">
                                          #{String(pokemon.id).padStart(3, '0')}
                                      </div>
                                </Card>
                                </Link>
                            )})}
                        </div>
                    </div>
                ))
              ) : (
                <div className="text-center py-10 text-muted-foreground">
                  <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg">No Pokémon found matching your search or filter.</p>
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </main>
      <footer className="text-center py-4 text-sm text-muted-foreground border-t border-border mt-auto">
        PokéTRKR &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
}
