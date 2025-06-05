
"use client";

import type { NextPage } from "next";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AppHeader } from "@/components/AppHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, ServerCrash, Search, ShieldAlert, PackageSearch } from "lucide-react";
import Image from "next/image";
import type { TcgPlayerGroup } from "@/types/tcgplayerApi"; // Using Group as Set
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// IMPORTANT: TCGPlayer API integration requires authentication (API Keys).
// This is a placeholder implementation. You will need to implement the actual API calls
// securely using your TCGPlayer API credentials.

// Placeholder for your TCGPlayer API base URL
const TCGPLAYER_API_BASE_URL = "https://api.tcgplayer.com/v1.39.0"; // Example version

// Placeholder function to fetch TCGPlayer categories (e.g., to find Pokémon categoryId)
async function fetchTcgPlayerCategories(bearerToken: string) {
  // const response = await fetch(`${TCGPLAYER_API_BASE_URL}/catalog/categories`, {
  //   headers: { Authorization: `Bearer ${bearerToken}` },
  // });
  // if (!response.ok) throw new Error("Failed to fetch TCGPlayer categories");
  // const data = await response.json();
  // return data.results; // Assuming 'results' contains the array of categories
  console.warn("Placeholder: fetchTcgPlayerCategories called. Implement actual API call.");
  await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API delay
  // Find and return Pokemon categoryId from results
  // For now, returning a mock Pokemon category ID
  return [{ categoryId: 1, name: "Pok\u00e9mon", displayName: "Pok\u00e9mon" }]; // Example
}

// Placeholder function to fetch TCGPlayer groups (sets) for a given categoryId
async function fetchTcgPlayerGroups(categoryId: number, bearerToken: string): Promise<TcgPlayerGroup[]> {
  // const response = await fetch(`${TCGPLAYER_API_BASE_URL}/catalog/categories/${categoryId}/groups?limit=100&sortOrder=releaseDate&sortOrderDirection=desc`, {
  //   headers: { Authorization: `Bearer ${bearerToken}` },
  // });
  // if (!response.ok) throw new Error("Failed to fetch TCGPlayer groups");
  // const data = await response.json();
  // return data.results as TcgPlayerGroup[];
  console.warn("Placeholder: fetchTcgPlayerGroups called. Implement actual API call.");
  await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API delay
  // Mock data
  return [
    { groupId: 101, name: "Sword & Shield - Base Set", abbreviation: "SSH", isSupplemental: false, publishedOn: "2020-02-07", modifiedOn: "2020-02-07", categoryId: 1, iconUrl: "https://placehold.co/100x40.png" },
    { groupId: 102, name: "Rebel Clash", abbreviation: "RCL", isSupplemental: false, publishedOn: "2020-05-01", modifiedOn: "2020-05-01", categoryId: 1, iconUrl: "https://placehold.co/100x40.png" },
    { groupId: 103, name: "Darkness Ablaze", abbreviation: "DAA", isSupplemental: false, publishedOn: "2020-08-14", modifiedOn: "2020-08-14", categoryId: 1, iconUrl: "https://placehold.co/100x40.png" },
  ];
}


const BrowseTcgPlayerSetsPage: NextPage = () => {
  const [groups, setGroups] = useState<TcgPlayerGroup[]>([]);
  const [filteredGroups, setFilteredGroups] = useState<TcgPlayerGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [bearerToken, setBearerToken] = useState<string | null>(null); // Store your bearer token here

  useEffect(() => {
    // In a real app, you would securely obtain and manage your TCGPlayer bearer token.
    // For this placeholder, you might manually set it or fetch it from a secure backend.
    // Example: setBearerToken("YOUR_SECURELY_OBTAINED_BEARER_TOKEN");
    // If no token is set, we can't proceed.
    if (!bearerToken) {
      setError("TCGPlayer API Bearer Token not configured. Please set it up to fetch data.");
      setIsLoading(false);
      // return; // Uncomment if you want to stop fetching if no token
    }

    const fetchSets = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // 1. Fetch categories to find Pokémon categoryId (if not hardcoded)
        // const categories = await fetchTcgPlayerCategories(bearerToken || "DUMMY_TOKEN_FOR_PLACEHOLDER");
        // const pokemonCategory = categories.find((cat: any) => cat.name === "Pok\u00e9mon"); // API uses "Pok\u00e9mon"
        // if (!pokemonCategory) throw new Error("Pokémon category not found in TCGPlayer API");
        const pokemonCategoryId = 1; // Hardcoding for placeholder, TCGPlayer's Pokémon categoryId is typically 1

        // 2. Fetch groups (sets) for Pokémon category
        const fetchedGroups = await fetchTcgPlayerGroups(pokemonCategoryId, bearerToken || "DUMMY_TOKEN_FOR_PLACEHOLDER");
        
        // Sort by publishedOn date, newest first
        const sortedGroups = fetchedGroups.sort((a, b) => 
          new Date(b.publishedOn).getTime() - new Date(a.publishedOn).getTime()
        );
        setGroups(sortedGroups);
        setFilteredGroups(sortedGroups);
      } catch (err) {
        console.error("Error fetching TCGPlayer data:", err);
        setError(err instanceof Error ? err.message : "An unknown error occurred while fetching TCGPlayer data.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchSets();
  }, [bearerToken]); // Re-fetch if token changes

  useEffect(() => {
    const lowercasedFilter = searchTerm.toLowerCase();
    const filteredData = groups.filter(item =>
      item.name.toLowerCase().includes(lowercasedFilter) ||
      (item.abbreviation && item.abbreviation.toLowerCase().includes(lowercasedFilter))
    );
    setFilteredGroups(filteredData);
  }, [searchTerm, groups]);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <AppHeader />
      <main className="flex-grow container mx-auto p-4 md:p-8">
        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="font-headline text-3xl text-foreground flex items-center">
              <PackageSearch className="mr-2 h-8 w-8 text-primary" />
              Browse Pokémon Sets (TCGPlayer API)
            </CardTitle>
            <CardDescription>
              Select a set to view its cards. Data sourced from TCGPlayer API.
            </CardDescription>
            <Alert variant="destructive" className="mt-4">
              <ShieldAlert className="h-4 w-4" />
              <AlertTitle>Developer Note: Placeholder API</AlertTitle>
              <AlertDescription>
                This page uses placeholder data. Actual TCGPlayer API integration requires API keys and secure token management. Implement `fetchTcgPlayerCategories` and `fetchTcgPlayerGroups` with your credentials.
              </AlertDescription>
            </Alert>
             <div className="relative mt-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search sets by name or abbreviation..."
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
                <p className="ml-4 text-lg text-muted-foreground">Loading TCGPlayer sets...</p>
              </div>
            )}
            {error && (
              <div className="flex flex-col items-center justify-center py-10 text-destructive">
                <ServerCrash className="h-16 w-16 mb-4" />
                <p className="text-xl font-semibold">Oops! Something went wrong.</p>
                <p className="text-center">{error}</p>
              </div>
            )}
            {!isLoading && !error && (
              <ScrollArea className="h-[calc(100vh-24rem)] md:h-[calc(100vh-28rem)]">
                {filteredGroups.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {filteredGroups.map((group) => (
                        // TODO: Update href to a TCGPlayer specific set details page
                        <Link key={group.groupId} href={`/browse-tcgplayer-sets/set/${group.groupId}`} passHref legacyBehavior>
                        <a className="block group">
                            <Card className="bg-card hover:shadow-primary/20 hover:border-primary transition-all duration-300 ease-in-out transform hover:scale-105 flex flex-col items-center p-4 text-center h-full">
                            {group.iconUrl ? ( // TCGPlayer API might have 'iconUrl' or 'logoUrl' on group or category
                                <div className="relative w-32 h-16 mb-3">
                                <Image src={group.iconUrl} alt={`${group.name} logo`} layout="fill" objectFit="contain" data-ai-hint="tcgplayer set logo"/>
                                </div>
                            ) : (
                                <div className="w-32 h-16 mb-3 bg-muted rounded flex items-center justify-center" data-ai-hint="logo placeholder">
                                <span className="text-xs text-muted-foreground">No Logo</span>
                                </div>
                            )}
                            <p className="font-semibold text-card-foreground group-hover:text-primary">{group.name}</p>
                            {group.abbreviation && <p className="text-xs text-muted-foreground">({group.abbreviation})</p>}
                            <p className="text-xs text-muted-foreground">Published: {new Date(group.publishedOn).toLocaleDateString()}</p>
                            <Button variant="outline" size="sm" className="mt-auto w-full group-hover:bg-primary group-hover:text-primary-foreground">View Set</Button>
                            </Card>
                        </a>
                        </Link>
                    ))}
                    </div>
                ) : (
                    <div className="text-center py-10 text-muted-foreground">
                        <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p className="text-lg">No TCGPlayer sets found matching your search criteria or API returned no data.</p>
                    </div>
                )}
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </main>
       <footer className="text-center py-4 text-sm text-muted-foreground border-t border-border mt-auto">
        Pokédex Tracker &copy; {new Date().getFullYear()} (TCGPlayer Data Placeholder)
      </footer>
    </div>
  );
};

export default BrowseTcgPlayerSetsPage;
