
"use client";

import type { NextPage } from "next";
import { useEffect, useState, use } from "react";
import Link from "next/link";
import Image from "next/image";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, ArrowLeft, ShieldAlert, FileSearch } from "lucide-react";
import { allPokemonData, type PokemonPokedexEntry } from "../pokedexData"; // Adjust path as needed

const PokemonDetailPage: NextPage<{ params: { pokemonName: string } }> = ({ params }) => {
  // The `use` hook is for resolving client-side dynamic segments if needed,
  // but for this simple case, we can directly use `params`.
  // const resolvedParams = use(params); 
  // const { pokemonName: rawPokemonName } = resolvedParams;

  const { pokemonName: rawPokemonName } = params;


  const [pokemonDetails, setPokemonDetails] = useState<PokemonPokedexEntry | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);

  const pokemonName = decodeURIComponent(rawPokemonName).toLowerCase();

  useEffect(() => {
    setIsClient(true);
    if (pokemonName) {
      // Simulate fetching details or find from our hardcoded list
      const foundPokemon = allPokemonData.find(p => p.name.toLowerCase() === pokemonName);
      if (foundPokemon) {
        setPokemonDetails(foundPokemon);
      } else {
        setError(`Pokémon "${pokemonName}" not found in our current data.`);
      }
      setIsLoading(false);
    }
  }, [pokemonName]);

  if (!isClient || isLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <AppHeader />
        <main className="flex-grow container mx-auto p-4 md:p-8 flex items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="ml-4 text-lg text-muted-foreground">Loading Pokémon details...</p>
        </main>
      </div>
    );
  }
  
  const displayName = pokemonDetails ? pokemonDetails.name : pokemonName.charAt(0).toUpperCase() + pokemonName.slice(1);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <AppHeader />
      <main className="flex-grow container mx-auto p-4 md:p-8">
        <Link href="/pokedex" passHref legacyBehavior>
          <Button variant="outline" className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Pokédex
          </Button>
        </Link>

        {error && !pokemonDetails && (
          <Card className="shadow-xl border-destructive">
            <CardHeader>
              <CardTitle className="font-headline text-3xl text-destructive flex items-center gap-2">
                <ShieldAlert className="h-8 w-8" /> Error
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center py-8">
              <p className="text-lg text-destructive mb-2">{error}</p>
              <p className="text-muted-foreground">
                This might be a temporary issue or the Pokémon data is not yet available.
              </p>
            </CardContent>
          </Card>
        )}

        {!error && pokemonDetails && (
           <Card className="shadow-xl">
            <CardHeader>
                 <div className="flex flex-col md:flex-row md:items-center gap-4">
                    {pokemonDetails.spriteUrl && (
                        <div className="relative w-32 h-32 md:w-40 md:h-40 bg-muted/30 rounded-lg p-2 flex items-center justify-center shadow-inner" data-ai-hint="pokemon sprite large">
                            <Image src={pokemonDetails.spriteUrl} alt={displayName} layout="fill" objectFit="contain" />
                        </div>
                    )}
                    <div>
                        <CardTitle className="font-headline text-4xl text-foreground">
                            {displayName}
                        </CardTitle>
                        <CardDescription className="text-lg text-muted-foreground">
                            National Pokédex #{pokemonDetails.id.toString().padStart(3, '0')} - {pokemonDetails.region} Region
                        </CardDescription>
                    </div>
                 </div>
            </CardHeader>
            <CardContent className="mt-4">
              <h2 className="text-2xl font-semibold text-primary mb-4 flex items-center gap-2">
                <FileSearch className="h-6 w-6"/> Pokémon TCG Cards
              </h2>
              <div className="bg-muted/50 p-6 rounded-lg text-center">
                <p className="text-muted-foreground">
                  Displaying Pokémon TCG cards for <strong>{displayName}</strong> is a feature coming soon!
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  This section will show all available cards from various sets featuring this Pokémon.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
      <footer className="text-center py-4 text-sm text-muted-foreground border-t border-border mt-auto">
        Pokédex Tracker &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
};

export default PokemonDetailPage;
