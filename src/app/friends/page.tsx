
"use client";

import { useState, useCallback } from 'react';
import Image from 'next/image';
import { AppHeader } from '@/components/AppHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Loader2, Search, Users, UserPlus, Info, UserCheck } from 'lucide-react';
import type { PokemonCard } from '@/types';
import { useAuth } from '@/hooks/useAuth';

interface UserSearchResult {
  uid: string;
  displayName: string;
  followSetting: 'everyone' | 'onRequest';
  collectionPreview: PokemonCard[];
}

export default function FriendsPage() {
    const { user, openAuthModal } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hasSearched, setHasSearched] = useState(false);

    // Placeholder for following logic
    const [following, setFollowing] = useState<string[]>([]);
    const [isSubmittingFollow, setIsSubmittingFollow] = useState<string | null>(null);


    const handleSearch = useCallback(async (query: string) => {
        if (query.trim().length < 3) {
            setSearchResults([]);
            setHasSearched(false);
            return;
        }

        setIsLoading(true);
        setError(null);
        setHasSearched(true);
        try {
            const response = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to search for users.');
            }
            const data: UserSearchResult[] = await response.json();
            setSearchResults(data.filter(u => u.uid !== user?.uid)); // Filter out self
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, [user?.uid]);
    
    // In a real app, this would be a server action or API call.
    const handleFollow = async (targetUserId: string) => {
      if (!user) {
        openAuthModal();
        return;
      }
      setIsSubmittingFollow(targetUserId);
      // Fake delay to simulate a network request
      await new Promise(resolve => setTimeout(resolve, 1000));
      setFollowing(prev => [...prev, targetUserId]);
      setIsSubmittingFollow(null);
    }
    
    return (
        <div className="flex flex-col min-h-screen bg-background">
            <AppHeader />
            <main className="flex-grow container mx-auto p-4 md:p-8 space-y-8">
                <Card>
                    <CardHeader>
                        <CardTitle className="font-headline text-3xl flex items-center gap-2">
                           <Users className="h-8 w-8 text-primary" /> Friends & Collections
                        </CardTitle>
                        <CardDescription>
                            Find other collectors and see what cards they have.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                            <Input
                                type="text"
                                placeholder="Search for a user by username..."
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value);
                                    handleSearch(e.target.value);
                                }}
                                className="pl-10 w-full md:w-1/2"
                            />
                        </div>
                    </CardContent>
                </Card>

                {isLoading && (
                    <div className="text-center py-10">
                        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                        <p className="mt-2 text-muted-foreground">Searching for users...</p>
                    </div>
                )}
                
                {!isLoading && hasSearched && searchResults.length === 0 && (
                    <Card>
                        <CardContent className="pt-6 text-center text-muted-foreground">
                            <Info className="h-10 w-10 mx-auto mb-2 opacity-50"/>
                            <p>No users found for "{searchTerm}".</p>
                            <p className="text-sm">Try a different username.</p>
                        </CardContent>
                    </Card>
                )}
                
                {!isLoading && searchResults.length > 0 && (
                    <div className="space-y-6">
                        {searchResults.map((foundUser) => (
                            <Card key={foundUser.uid} className="shadow-lg">
                                <CardHeader className="flex flex-row items-center justify-between">
                                    <div>
                                        <CardTitle>{foundUser.displayName}</CardTitle>
                                        <CardDescription>
                                            {foundUser.followSetting === 'everyone' ? `Collection Preview` : `This user's collection is private.`}
                                        </CardDescription>
                                    </div>
                                    <Button 
                                      onClick={() => handleFollow(foundUser.uid)} 
                                      disabled={isSubmittingFollow === foundUser.uid || following.includes(foundUser.uid)}
                                    >
                                        {isSubmittingFollow === foundUser.uid ? (
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        ) : following.includes(foundUser.uid) ? (
                                          <UserCheck className="mr-2 h-4 w-4" />
                                        ) : (
                                          <UserPlus className="mr-2 h-4 w-4" />
                                        )}
                                        {following.includes(foundUser.uid) ? 'Following' : 'Follow'}
                                    </Button>
                                </CardHeader>
                                {foundUser.followSetting === 'everyone' && (
                                    <CardContent>
                                        {foundUser.collectionPreview.length > 0 ? (
                                            <div className="flex gap-2 overflow-x-auto pb-2">
                                                {foundUser.collectionPreview.map(card => (
                                                    <div key={card.id} className="relative flex-shrink-0 w-24 h-32 rounded-md overflow-hidden bg-muted" data-ai-hint="pokemon card front">
                                                        <Image src={card.imageUrl || "https://placehold.co/200x280.png"} alt={card.name} layout="fill" objectFit="contain" />
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-sm text-muted-foreground italic">This user's collection is empty.</p>
                                        )}
                                    </CardContent>
                                )}
                            </Card>
                        ))}
                    </div>
                )}
                 
                 <div className="mt-8">
                  <Card className="border-dashed">
                      <CardHeader>
                        <CardTitle>Following</CardTitle>
                        <CardDescription>A list of people you follow will appear here.</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p className="text-muted-foreground text-sm">Feature coming soon.</p>
                      </CardContent>
                  </Card>
                 </div>
            </main>
        </div>
    );
}
