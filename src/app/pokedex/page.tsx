// src/app/pokedex/page.tsx
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { AppHeader } from '@/components/AppHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Loader2,
  Search,
  ServerCrash,
  Hash,
  ChevronDown,
  ChevronUp,
  Award,
  Trophy,
  Lock,
  Crown,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ToastAction } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/useAuth';
import { useUserCollection } from '@/hooks/useUserCollection';
import { cn } from '@/lib/utils';
import { PokedexIcon } from '@/components/icons/PokedexIcon';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { LazySection } from '@/components/LazySection';

export interface Pokemon {
  id: number;
  name: string;
  sprite: string;
  generation: number;
}

const GENERATION_REGIONS: { [key: number]: string } = {
  1: 'Kanto',
  2: 'Johto',
  3: 'Hoenn',
  4: 'Sinnoh',
  5: 'Unova',
  6: 'Kalos',
  7: 'Alola',
  8: 'Galar',
  9: 'Paldea',
};

const EMPTY_SET = new Set<string>();

export default function PokedexPage() {
  const { user, loading: authLoading } = useAuth();
  const { collection } = useUserCollection(user?.uid);
  const [allPokemon, setAllPokemon] = useState<Pokemon[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const [ownershipFilter, setOwnershipFilter] = useState<'all' | 'owned' | 'missing'>('all');
  const [isBreakdownOpen, setIsBreakdownOpen] = useState(false);

  const [selectedGenerations, setSelectedGenerations] = useState<number[]>([]);
  const totalGenerations = 9;
  const generations = useMemo(
    () => Array.from({ length: totalGenerations }, (_, i) => i + 1),
    [totalGenerations]
  );

  const [lastScrollY, setLastScrollY] = useState(0);
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);

  useEffect(() => {
    const scrollHandler = () => {
      const currentScrollY = window.scrollY;

      setLastScrollY((prevLastScrollY) => {
        if (Math.abs(currentScrollY - prevLastScrollY) < 10) return prevLastScrollY;

        if (currentScrollY > prevLastScrollY && currentScrollY > 100) {
          setIsHeaderVisible(false); // scrolling down
        } else {
          setIsHeaderVisible(true); // scrolling up
        }

        return currentScrollY;
      });
    };

    window.addEventListener('scroll', scrollHandler, { passive: true });

    return () => {
      window.removeEventListener('scroll', scrollHandler);
    };
  }, []);

  const ownedPokemonNames = useMemo(() => {
    if (!user || !collection.length) return EMPTY_SET;
    return new Set(collection.map((card) => card.name.toLowerCase()));
  }, [collection, user]);

  const regionalStats = useMemo(() => {
    if (!allPokemon.length) return [];

    const statsMap: { [key: number]: { total: number; collected: number } } = {};
    for (let g = 1; g <= 9; g++) {
      statsMap[g] = { total: 0, collected: 0 };
    }

    allPokemon.forEach((pokemon) => {
      const gen = pokemon.generation;
      if (statsMap[gen]) {
        statsMap[gen].total++;
        if (ownedPokemonNames.has(pokemon.name.toLowerCase())) {
          statsMap[gen].collected++;
        }
      }
    });

    return Object.keys(statsMap).map((genStr) => {
      const gen = Number(genStr);
      const { total, collected } = statsMap[gen];
      const percentage = total > 0 ? (collected / total) * 100 : 0;
      return {
        generation: gen,
        regionName: GENERATION_REGIONS[gen] || 'Unknown',
        total,
        collected,
        percentage,
      };
    });
  }, [allPokemon, ownedPokemonNames]);

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
          variant: 'destructive',
          title: 'Pokédex is Empty',
          description: 'Please sync the Pokédex data from the Admin page first.',
          duration: 10000,
          action: (
            <ToastAction
              altText="Go to Admin"
              onClick={() => (window.location.href = '/admin/sync')}
            >
              Go to Admin
            </ToastAction>
          ),
        });
      }

      setAllPokemon(data);
    } catch (err: any) {
      setError(err.message);
      toast({
        variant: 'destructive',
        title: 'Could Not Load Pokédex',
        description: `${err.message}`,
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchPokemon();
  }, [fetchPokemon]);

  const filteredPokemon = useMemo(() => {
    let filtered = [...allPokemon];

    if (selectedGenerations.length > 0) {
      filtered = filtered.filter((p) => selectedGenerations.includes(p.generation));
    }

    if (searchTerm) {
      const lowercasedFilter = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(lowercasedFilter) || String(p.id).includes(lowercasedFilter)
      );
    }

    if (user) {
      if (ownershipFilter === 'owned') {
        filtered = filtered.filter((p) => ownedPokemonNames.has(p.name.toLowerCase()));
      } else if (ownershipFilter === 'missing') {
        filtered = filtered.filter((p) => !ownedPokemonNames.has(p.name.toLowerCase()));
      }
    }

    return filtered;
  }, [searchTerm, allPokemon, selectedGenerations, ownershipFilter, user, ownedPokemonNames]);

  const completionStats = useMemo(() => {
    const total = filteredPokemon.length;
    if (total === 0 || !user) {
      return { collected: 0, total: 0, percentage: 0 };
    }
    const collected = filteredPokemon.filter((p) =>
      ownedPokemonNames.has(p.name.toLowerCase())
    ).length;
    const percentage = (collected / total) * 100;
    return { collected, total, percentage };
  }, [filteredPokemon, ownedPokemonNames, user]);

  const groupedPokemon = useMemo(() => {
    return filteredPokemon.reduce(
      (acc, pokemon) => {
        const gen = pokemon.generation;
        if (!acc[gen]) {
          acc[gen] = [];
        }
        acc[gen].push(pokemon);
        return acc;
      },
      {} as Record<number, Pokemon[]>
    );
  }, [filteredPokemon]);

  const sortedGenerationKeys = useMemo(() => {
    return Object.keys(groupedPokemon)
      .map(Number)
      .sort((a, b) => a - b);
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
          <Button onClick={fetchPokemon} className="mt-4">
            Try Again
          </Button>
        </main>
      </div>
    );
  }

  const handleGenerationToggle = (gen: number) => {
    setSelectedGenerations((prev) => {
      const isSelected = prev.includes(gen);
      if (isSelected) {
        return prev.filter((g) => g !== gen);
      } else {
        return [...prev, gen].sort((a, b) => a - b);
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
        <div
          className={cn(
            'p-4 md:p-6 bg-card rounded-lg shadow-xl mb-6 sticky z-40 transition-all duration-300 ease-in-out',
            isHeaderVisible
              ? 'top-[65px] md:top-[77px] opacity-100'
              : 'top-[-300px] opacity-0 pointer-events-none shadow-none'
          )}
        >
          <div className="hidden md:block space-y-1 mb-4">
            <h1 className="font-headline text-3xl text-foreground flex items-center gap-2">
              <PokedexIcon className="h-8 w-8 text-primary" /> Pokédex
            </h1>
            <p className="text-muted-foreground">
              Browse all Pokémon to see their TCG card appearances.
            </p>
          </div>

          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="relative flex-grow w-full md:w-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search Pokémon..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full"
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto flex-shrink-0 justify-between md:justify-start items-center">
              {user && (
                <div className="flex bg-muted p-1 rounded-lg border w-full sm:w-auto">
                  <Button
                    variant={ownershipFilter === 'all' ? 'secondary' : 'ghost'}
                    size="sm"
                    className={cn(
                      'h-8 text-xs font-semibold flex-1 sm:flex-initial transition-all rounded-md',
                      ownershipFilter === 'all' &&
                        'bg-background shadow-sm text-foreground hover:bg-background'
                    )}
                    onClick={() => setOwnershipFilter('all')}
                  >
                    All
                  </Button>
                  <Button
                    variant={ownershipFilter === 'owned' ? 'secondary' : 'ghost'}
                    size="sm"
                    className={cn(
                      'h-8 text-xs font-semibold flex-1 sm:flex-initial transition-all rounded-md',
                      ownershipFilter === 'owned' &&
                        'bg-green-500/10 text-green-600 hover:bg-green-500/15'
                    )}
                    onClick={() => setOwnershipFilter('owned')}
                  >
                    Owned
                  </Button>
                  <Button
                    variant={ownershipFilter === 'missing' ? 'secondary' : 'ghost'}
                    size="sm"
                    className={cn(
                      'h-8 text-xs font-semibold flex-1 sm:flex-initial transition-all rounded-md',
                      ownershipFilter === 'missing' &&
                        'bg-destructive/10 text-destructive hover:bg-destructive/15'
                    )}
                    onClick={() => setOwnershipFilter('missing')}
                  >
                    Missing
                  </Button>
                </div>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="h-10 justify-between w-full sm:w-auto">
                    <span>Generations</span>
                    {selectedGenerations.length > 0 && (
                      <Badge variant="secondary" className="ml-2">
                        {selectedGenerations.length} selected
                      </Badge>
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
                  {generations.map((gen) => (
                    <DropdownMenuCheckboxItem
                      key={gen}
                      checked={selectedGenerations.includes(gen)}
                      onCheckedChange={() => handleGenerationToggle(gen)}
                    >
                      Generation {gen} ({GENERATION_REGIONS[gen]})
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          {user && (
            <div className="space-y-2 pt-4">
              <div
                className="flex justify-between items-center cursor-pointer group select-none"
                onClick={() => setIsBreakdownOpen(!isBreakdownOpen)}
              >
                <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-1 group-hover:text-primary transition-colors">
                  {selectedGenerations.length > 0 || searchTerm
                    ? 'Filtered Progress'
                    : 'Overall Collection Progress'}
                  <span className="inline-flex transition-transform duration-200">
                    {isBreakdownOpen ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                    )}
                  </span>
                </h3>
                <p className="text-sm font-semibold text-primary">
                  {completionStats.collected} / {completionStats.total}
                  <span className="text-muted-foreground font-normal"> owned</span>
                </p>
              </div>
              <Progress value={completionStats.percentage} className="h-2" />

              {/* Subtle, Compact Regional Master Achievement Coins */}
              <div className="border-t border-border/40 pt-3 mt-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                    <Award className="h-3.5 w-3.5 text-amber-500" />
                    Region Medals
                  </span>
                  <span className="text-[10px] text-muted-foreground font-medium">
                    Completed: {regionalStats.filter((r) => r.percentage === 100).length} / 9
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 justify-start sm:justify-between items-center bg-muted/20 p-2 rounded-lg border border-border/30">
                  {regionalStats.map((stat) => {
                    const isCompleted = stat.percentage === 100;

                    const themes: {
                      [key: number]: { bg: string; text: string; border: string; glow: string };
                    } = {
                      1: {
                        bg: 'bg-red-500/10 hover:bg-red-500/20',
                        text: 'text-red-400',
                        border: 'border-red-500/30',
                        glow: 'shadow-red-500/20',
                      },
                      2: {
                        bg: 'bg-yellow-500/10 hover:bg-yellow-500/20',
                        text: 'text-yellow-500',
                        border: 'border-yellow-500/30',
                        glow: 'shadow-yellow-500/20',
                      },
                      3: {
                        bg: 'bg-purple-500/10 hover:bg-purple-500/20',
                        text: 'text-purple-400',
                        border: 'border-purple-500/30',
                        glow: 'shadow-purple-500/20',
                      },
                      4: {
                        bg: 'bg-cyan-500/10 hover:bg-cyan-500/20',
                        text: 'text-cyan-400',
                        border: 'border-cyan-500/30',
                        glow: 'shadow-cyan-500/20',
                      },
                      5: {
                        bg: 'bg-slate-400/10 hover:bg-slate-400/20',
                        text: 'text-slate-300',
                        border: 'border-slate-500/30',
                        glow: 'shadow-slate-300/20',
                      },
                      6: {
                        bg: 'bg-indigo-500/10 hover:bg-indigo-500/20',
                        text: 'text-indigo-400',
                        border: 'border-indigo-500/30',
                        glow: 'shadow-indigo-500/20',
                      },
                      7: {
                        bg: 'bg-amber-500/10 hover:bg-amber-500/20',
                        text: 'text-amber-400',
                        border: 'border-amber-500/30',
                        glow: 'shadow-amber-500/20',
                      },
                      8: {
                        bg: 'bg-rose-500/10 hover:bg-rose-500/20',
                        text: 'text-rose-400',
                        border: 'border-rose-500/30',
                        glow: 'shadow-rose-500/20',
                      },
                      9: {
                        bg: 'bg-violet-500/10 hover:bg-violet-500/20',
                        text: 'text-violet-400',
                        border: 'border-violet-500/30',
                        glow: 'shadow-violet-500/20',
                      },
                    };
                    const theme = themes[stat.generation] || {
                      bg: 'bg-slate-500/5',
                      text: 'text-muted-foreground',
                      border: 'border-border',
                      glow: 'shadow-transparent',
                    };

                    return (
                      <div
                        key={stat.generation}
                        className={cn(
                          'relative group flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full border transition-all duration-300 cursor-pointer select-none',
                          isCompleted
                            ? cn('shadow-sm', theme.bg, theme.border, theme.glow)
                            : 'bg-muted/10 border-border/20 opacity-30 grayscale hover:opacity-50'
                        )}
                        title={`${stat.regionName} (Gen ${stat.generation}): ${isCompleted ? 'MASTER UNLOCKED! 🎉' : `${stat.collected}/${stat.total} collected`}`}
                      >
                        {isCompleted && (
                          <div className="absolute inset-0 bg-gradient-to-tr from-white/15 to-transparent rounded-full animate-pulse" />
                        )}

                        {isCompleted ? (
                          <Trophy className={cn('h-3.5 w-3.5 sm:h-4 sm:w-4', theme.text)} />
                        ) : (
                          <span className="text-[9px] sm:text-[10px] font-bold text-muted-foreground font-mono">
                            {stat.generation}
                          </span>
                        )}

                        {/* Mini popover on hover/tap */}
                        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-popover text-popover-foreground border border-border px-2 py-1 rounded text-[10px] font-semibold opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-md z-50">
                          <span className={cn('font-bold', isCompleted && theme.text)}>
                            {stat.regionName}
                          </span>
                          {isCompleted ? ' (Master)' : ` (${stat.collected}/${stat.total})`}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Collapsible Regional Breakdown Panel */}
              <div
                className={cn(
                  'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 overflow-hidden transition-all duration-300 ease-in-out mt-3',
                  isBreakdownOpen
                    ? 'max-h-[500px] opacity-100 py-2'
                    : 'max-h-0 opacity-0 pointer-events-none'
                )}
              >
                {regionalStats.map((stat) => (
                  <div
                    key={stat.generation}
                    className="bg-muted/40 p-3 rounded-lg border border-border/50 flex flex-col justify-between hover:bg-muted/60 transition-colors"
                  >
                    <div className="flex justify-between items-baseline mb-1">
                      <span className="text-xs font-semibold text-foreground">
                        {stat.regionName}{' '}
                        <span className="text-[10px] text-muted-foreground font-normal">
                          (Gen {stat.generation})
                        </span>
                      </span>
                      <span className="text-xs font-bold text-primary">
                        {stat.collected} / {stat.total}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress value={stat.percentage} className="h-1.5 flex-grow" />
                      <span className="text-[10px] font-mono text-muted-foreground font-semibold min-w-[28px] text-right">
                        {Math.round(stat.percentage)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="flex-1">
          {filteredPokemon.length > 0 ? (
            sortedGenerationKeys.map((genKey) => (
              <LazySection key={genKey} defaultHeight={500}>
                <div>
                  <h2 className="text-2xl font-bold tracking-tight mt-6 mb-2 flex items-center gap-2 px-4">
                    Generation {genKey} - {GENERATION_REGIONS[genKey]}
                  </h2>
                  <Separator className="mb-4 mx-4" />
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-4 pt-4 pb-12 px-4">
                    {groupedPokemon[genKey]?.map((pokemon) => {
                      const isOwned = ownedPokemonNames.has(pokemon.name.toLowerCase());
                      return (
                        <Link
                          key={pokemon.id}
                          href={`/pokedex/${pokemon.name.toLowerCase()}`}
                          className="block group"
                        >
                          <div
                            className={cn(
                              'relative aspect-square w-full cursor-pointer transition-transform duration-200 hover:scale-105',
                              isOwned && 'ring-2 ring-green-500 rounded-lg'
                            )}
                          >
                            <Card
                              className={cn(
                                'bg-card h-full w-full transition-all duration-300 ease-in-out flex flex-col items-center justify-center p-2 text-center',
                                !isOwned
                                  ? 'saturate-[.1] group-hover:saturate-100 hover:shadow-primary/20 hover:border-primary'
                                  : ''
                              )}
                            >
                              <div className="relative w-20 h-20">
                                <Image
                                  src={pokemon.sprite}
                                  alt={pokemon.name}
                                  fill
                                  sizes="80px"
                                  className="object-contain"
                                  unoptimized
                                  data-ai-hint="pokemon sprite"
                                />
                              </div>
                            </Card>
                            <Badge
                              variant="secondary"
                              className="absolute top-1 right-1 z-10 px-1.5 py-0 text-[10px] h-auto font-normal"
                            >
                              #{String(pokemon.id).padStart(3, '0')}
                            </Badge>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </LazySection>
            ))
          ) : (
            <div className="text-center py-10 text-muted-foreground">
              <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg">No Pokémon found matching your search or filter.</p>
            </div>
          )}
        </div>
      </main>
      <footer className="text-center py-4 text-sm text-muted-foreground border-t border-border mt-auto">
        PokéTRKR &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
}
