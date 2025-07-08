
"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Search, Paintbrush, User, ServerCrash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface Artist {
  name: string;
  cardCount: number;
}

export default function BrowseArtistsPage() {
  const [allArtists, setAllArtists] = useState<Artist[]>([]);
  const [filteredArtists, setFilteredArtists] = useState<Artist[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchArtists = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/artists');
      if (!response.ok) {
        throw new Error('Failed to fetch artists from the database.');
      }
      const data: Artist[] = await response.json();
      setAllArtists(data);
      setFilteredArtists(data);
    } catch (err: any) {
      setError(err.message);
      toast({
        variant: "destructive",
        title: "Could Not Load Artists",
        description: `${err.message} Please try syncing the artists in the admin page.`,
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchArtists();
  }, [fetchArtists]);


  useEffect(() => {
    const lowercasedFilter = searchTerm.toLowerCase();
    const filtered = allArtists.filter(artist =>
      artist.name.toLowerCase().includes(lowercasedFilter)
    );
    setFilteredArtists(filtered);
  }, [searchTerm, allArtists]);

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <AppHeader />
        <main className="flex-grow container mx-auto p-4 md:p-8 flex items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="ml-4 text-lg text-muted-foreground">Loading Artists...</p>
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
            <h2 className="text-2xl font-bold text-destructive">Failed to Load Artists</h2>
            <p className="text-muted-foreground mt-2">{error}</p>
            <Button onClick={fetchArtists} className="mt-4">Try Again</Button>
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
              <Paintbrush className="h-8 w-8 text-primary"/>
              Browse by Artist
            </CardTitle>
            <CardDescription>
              Explore the entire Pokémon TCG catalog through the lens of its talented illustrators.
            </CardDescription>
            <div className="relative mt-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search for an artist..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full md:w-1/2"
              />
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[calc(100vh-22rem)] md:h-[calc(100vh-25rem)]">
              {filteredArtists.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 pt-4 pb-24 px-4">
                  {filteredArtists.map((artist) => (
                    <Link key={artist.name} href={`/browse-artists/${encodeURIComponent(artist.name)}`} className="block group">
                      <Card className="bg-card hover:shadow-primary/20 hover:border-primary transition-all duration-300 ease-in-out transform hover:scale-105 flex flex-col items-center justify-center p-4 text-center h-full">
                         <div className="flex items-center justify-center w-16 h-16 mb-4 bg-muted rounded-full" data-ai-hint="artist avatar">
                              <User className="w-8 h-8 text-muted-foreground" />
                         </div>
                        <p className="font-semibold text-card-foreground group-hover:text-primary capitalize">{artist.name}</p>
                      </Card>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 text-muted-foreground">
                  <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg">No artists found matching your search.</p>
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
