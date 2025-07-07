
"use client";

import { useState, useCallback, useEffect } from 'react';
import Image from 'next/image';
import { AppHeader } from '@/components/AppHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Loader2, Search, Users, UserPlus, Info, UserX } from 'lucide-react';
import type { PokemonCard } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface UserSearchResult {
  uid: string;
  displayName: string;
  followSetting: 'everyone' | 'onRequest';
  collectionPreview: PokemonCard[];
}

interface FollowedUser {
    uid: string;
    displayName: string;
}

export default function FriendsPage() {
    const { user, openAuthModal, following, loadingFollowing } = useAuth();
    const { toast } = useToast();
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
    const [isLoadingSearch, setIsLoadingSearch] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hasSearched, setHasSearched] = useState(false);

    const [isSubmittingFollow, setIsSubmittingFollow] = useState<string | null>(null);
    
    const [followedProfiles, setFollowedProfiles] = useState<FollowedUser[]>([]);
    const [loadingFollowedProfiles, setLoadingFollowedProfiles] = useState(false);

    useEffect(() => {
        const fetchFollowedProfiles = async () => {
            if (!user || following.length === 0) {
                setFollowedProfiles([]);
                return;
            }

            setLoadingFollowedProfiles(true);
            try {
                const idToken = await user.getIdToken();
                const response = await fetch('/api/users/get-profiles', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${idToken}`,
                    },
                    body: JSON.stringify({ uids: following }),
                });

                if (!response.ok) {
                    throw new Error('Failed to fetch followed user profiles.');
                }
                
                const profiles: FollowedUser[] = await response.json();
                profiles.sort((a, b) => a.displayName.localeCompare(b.displayName));
                setFollowedProfiles(profiles);

            } catch (err: any) {
                toast({
                    variant: 'destructive',
                    title: 'Error',
                    description: 'Could not load your following list details.',
                });
            } finally {
                setLoadingFollowedProfiles(false);
            }
        };

        if (!loadingFollowing) {
            fetchFollowedProfiles();
        }
    }, [user, following, loadingFollowing, toast]);

    const handleSearch = useCallback(async (query: string) => {
        if (query.trim().length < 3) {
            setSearchResults([]);
            setHasSearched(false);
            return;
        }

        setIsLoadingSearch(true);
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
            setIsLoadingSearch(false);
        }
    }, [user?.uid]);
    
    const handleFollowToggle = async (targetUserId: string, action: 'follow' | 'unfollow') => {
      if (!user) {
        openAuthModal();
        return;
      }
      setIsSubmittingFollow(targetUserId);
      try {
        const idToken = await user.getIdToken();
        const response = await fetch('/api/users/follow', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`,
          },
          body: JSON.stringify({ targetUserId, action }),
        });
        
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.message || `Failed to ${action} user.`);
        }
        
        toast({
          title: 'Success!',
          description: `You are now ${action === 'follow' ? 'following' : 'no longer following'} the user.`,
        });

      } catch (err: any) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: err.message,
        });
      } finally {
        setIsSubmittingFollow(null);
      }
    };
    
    const isLoading = loadingFollowing || isLoadingSearch;

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
                        {searchResults.map((foundUser) => {
                            const isFollowing = following.includes(foundUser.uid);
                            return (
                                <Card key={foundUser.uid} className="shadow-lg">
                                    <CardHeader className="flex flex-row items-center justify-between">
                                        <div>
                                            <CardTitle>{foundUser.displayName}</CardTitle>
                                            <CardDescription>
                                                {foundUser.followSetting === 'everyone' ? `Collection Preview` : `This user's collection is private.`}
                                            </CardDescription>
                                        </div>
                                        <Button 
                                          onClick={() => handleFollowToggle(foundUser.uid, isFollowing ? 'unfollow' : 'follow')} 
                                          disabled={isSubmittingFollow === foundUser.uid || loadingFollowing}
                                          variant={isFollowing ? 'outline' : 'default'}
                                        >
                                            {isSubmittingFollow === foundUser.uid ? (
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            ) : isFollowing ? (
                                              <UserX className="mr-2 h-4 w-4" />
                                            ) : (
                                              <UserPlus className="mr-2 h-4 w-4" />
                                            )}
                                            {isFollowing ? 'Unfollow' : 'Follow'}
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
                            )
                        })}
                    </div>
                )}
                 
                 <div className="mt-8">
                  <Card className="border-dashed">
                      <CardHeader>
                        <CardTitle>Following ({following.length})</CardTitle>
                        <CardDescription>A list of people you follow.</CardDescription>
                      </CardHeader>
                      <CardContent>
                         {loadingFollowing || loadingFollowedProfiles ? (
                           <div className="flex items-center text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Loading following list...</div>
                         ) : followedProfiles.length > 0 ? (
                            <ul className="space-y-4">
                                {followedProfiles.map(profile => (
                                    <li key={profile.uid} className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <Avatar>
                                                <AvatarFallback>{profile.displayName.charAt(0).toUpperCase()}</AvatarFallback>
                                            </Avatar>
                                            <span className="font-medium">{profile.displayName}</span>
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleFollowToggle(profile.uid, 'unfollow')}
                                            disabled={isSubmittingFollow === profile.uid}
                                        >
                                            {isSubmittingFollow === profile.uid ? (
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            ) : (
                                                <UserX className="mr-2 h-4 w-4" />
                                            )}
                                            Unfollow
                                        </Button>
                                    </li>
                                ))}
                            </ul>
                         ) : (
                            <p className="text-muted-foreground text-sm">You are not following anyone yet. Use the search above to find other collectors.</p>
                         )}
                      </CardContent>
                  </Card>
                 </div>
            </main>
        </div>
    );
}
