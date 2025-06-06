
"use client";

import type { NextPage } from "next";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AppHeader } from "@/components/AppHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, ServerCrash, Search } from "lucide-react";
import Image from "next/image";

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

const BrowseSetsPage: NextPage = () => {
  const [sets, setSets] = useState<ApiSet[]>([]);
  const [filteredSets, setFilteredSets] = useState<ApiSet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchSets = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const headers: HeadersInit = {};
        if (process.env.NEXT_PUBLIC_POKEMONTCG_API_KEY) {
          headers['X-Api-Key'] = process.env.NEXT_PUBLIC_POKEMONTCG_API_KEY;
        }

        const response = await fetch("https://api.pokemontcg.io/v2/sets?orderBy=-releaseDate", { headers });
        if (!response.ok) {
          throw new Error(`Failed to fetch sets: ${response.statusText}`);
        }
        const data = await response.json();
        const sortedSets = (data.data as ApiSet[]).sort((a, b) => new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime());
        setSets(sortedSets);
        setFilteredSets(sortedSets);
      } catch (err) {
        console.error("Error fetching sets:", err);
        setError(err instanceof Error ? err.message : "An unknown error occurred");
      } finally {
        setIsLoading(false);
      }
    };
    fetchSets();
  }, []);

  useEffect(() => {
    const lowercasedFilter = searchTerm.toLowerCase();
    const filteredData = sets.filter(item =>
      item.name.toLowerCase().includes(lowercasedFilter) ||
      item.series.toLowerCase().includes(lowercasedFilter) ||
      item.id.toLowerCase().includes(lowercasedFilter)
    );
    setFilteredSets(filteredData);
  }, [searchTerm, sets]);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <AppHeader />
      <main className="flex-grow container mx-auto p-4 md:p-8">
        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="font-headline text-3xl text-foreground">Browse Pokémon TCG Sets</CardTitle>
            <CardDescription>Select a set to view its cards and add them to your collection.</CardDescription>
             <div className="relative mt-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search sets by name, series, or ID..."
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
                <p className="ml-4 text-lg text-muted-foreground">Loading sets...</p>
              </div>
            )}
            {error && (
              <div className="flex flex-col items-center justify-center py-10 text-destructive">
                <ServerCrash className="h-16 w-16 mb-4" />
                <p className="text-xl font-semibold">Oops! Something went wrong.</p>
                <p className="text-center">Could not load Pokémon TCG sets: {error}.<br />Please try again later.</p>
              </div>
            )}
            {!isLoading && !error && (
              <ScrollArea className="h-[calc(100vh-20rem)] md:h-[calc(100vh-25rem)]">
                {filteredSets.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {filteredSets.map((set) => (
                        <Link key={set.id} href={`/sets/${set.id}`} passHref legacyBehavior>
                        <a className="block group">
                            <Card className="bg-card hover:shadow-primary/20 hover:border-primary transition-all duration-300 ease-in-out transform hover:scale-105 flex flex-col items-center p-4 text-center h-full">
                            {set.images.logo ? (
                                <div className="relative w-32 h-16 mb-3">
                                <Image src={set.images.logo} alt={`${set.name} logo`} layout="fill" objectFit="contain" data-ai-hint="pokemon set logo"/>
                                </div>
                            ) : (
                                <div className="w-32 h-16 mb-3 bg-muted rounded flex items-center justify-center" data-ai-hint="logo placeholder">
                                <span className="text-xs text-muted-foreground">No Logo</span>
                                </div>
                            )}
                            <p className="font-semibold text-card-foreground group-hover:text-primary">{set.name}</p>
                            <p className="text-xs text-muted-foreground">{set.series} Series</p>
                            <p className="text-xs text-muted-foreground">{new Date(set.releaseDate).toLocaleDateString()}</p>
                            <p className="text-xs text-muted-foreground">{set.total} cards</p>
                            <Button variant="outline" size="sm" className="mt-auto w-full group-hover:bg-primary group-hover:text-primary-foreground">View Set</Button>
                            </Card>
                        </a>
                        </Link>
                    ))}
                    </div>
                ) : (
                    <div className="text-center py-10 text-muted-foreground">
                        <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p className="text-lg">No sets found matching your search criteria.</p>
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
