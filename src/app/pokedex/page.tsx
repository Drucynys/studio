
"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { AppHeader } from "@/components/AppHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Search, Target, ServerCrash } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";

export interface Pokemon {
  id: number;
  name: string;
  sprite: string;
}

export default function PokedexPage() {
  const [allPokemon, setAllPokemon] = useState<Pokemon[]>([]);
  const [filteredPokemon, setFilteredPokemon] = useState<Pokemon[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

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
      setFilteredPokemon(data);
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
    const lowercasedFilter = searchTerm.toLowerCase();
    const filtered = allPokemon.filter(p =>
      p.name.toLowerCase().includes(lowercasedFilter) ||
      String(p.id).includes(lowercasedFilter)
    );
    setFilteredPokemon(filtered);
  }, [searchTerm, allPokemon]);

  if (isLoading) {
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

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <AppHeader />
      <main className="flex-grow container mx-auto p-4 md:p-8">
        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="font-headline text-3xl text-foreground flex items-center gap-2">
              <Target className="h-8 w-8 text-primary"/>
              Pokédex
            </CardTitle>
            <CardDescription>
              Browse all Pokémon to see their TCG card appearances. Data is sourced from your local database.
            </CardDescription>
            <div className="relative mt-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search Pokémon by name or Pokédex number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full md:w-1/2"
              />
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[calc(100vh-22rem)] md:h-[calc(100vh-25rem)]">
              {filteredPokemon.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 pt-4 pb-24 px-4">
                  {filteredPokemon.map((pokemon) => (
                    <Link key={pokemon.id} href={`/pokedex/${pokemon.name.toLowerCase()}`} className="block group">
                      <Card className="bg-card hover:shadow-primary/20 hover:border-primary transition-all duration-300 ease-in-out transform hover:scale-105 flex flex-col items-center p-4 text-center h-full">
                        <div className="relative w-24 h-24 mb-3">
                          <Image
                            src={pokemon.sprite}
                            alt={pokemon.name}
                            layout="fill"
                            objectFit="contain"
                            unoptimized // Sprites are small and don't need optimization
                            data-ai-hint="pokemon sprite"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">#{String(pokemon.id).padStart(3, '0')}</p>
                        <p className="font-semibold text-card-foreground group-hover:text-primary capitalize">{pokemon.name}</p>
                      </Card>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 text-muted-foreground">
                  <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg">No Pokémon found matching your search.</p>
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
}

    