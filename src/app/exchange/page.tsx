// src/app/exchange/page.tsx
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Image from 'next/image';
import { AppHeader } from '@/components/AppHeader';
import type { ExchangeItem } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { useUIStore } from '@/store/useUIStore';
import { Loader2, Search, Replace, Info, Mail } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card';
import {
  getFirestore,
  collection,
  onSnapshot,
  query,
  orderBy,
  limit,
  startAfter,
  getDocs,
  DocumentData,
} from 'firebase/firestore';
import { app } from '@/lib/firebase';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { getVariantAbbreviation } from '@/utils/cardUtils';
import { cn } from '@/lib/utils';

const db = getFirestore(app);

export default function ExchangePage() {
  const { user } = useAuth();
  const { openAuthModal } = useUIStore();
  const [items, setItems] = useState<ExchangeItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<ExchangeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [lastVisible, setLastVisible] = useState<DocumentData | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchInitialItems = useCallback(() => {
    if (!user) {
      setLoading(false);
      return () => {};
    }

    if (user.uid === 'demo-guest-uid') {
      setItems([
        {
          id: 'mock-card-1',
          userId: 'demo-other-user',
          exchangeId: 'mock-ex-1',
          ownerId: 'demo-other-user',
          ownerDisplayName: 'Gary Oak',
          apiId: 'base1-1',
          name: 'Alakazam',
          set: 'Base',
          cardNumber: '1',
          rarity: 'Rare Holo',
          language: 'English',
          variant: null,
          imageUrl: 'https://images.pokemontcg.io/base1/1.png',
          value: 75,
          quantity: 1,
          artist: 'Ken Sugimori',
        },
        {
          id: 'mock-card-2',
          userId: 'demo-other-user2',
          exchangeId: 'mock-ex-2',
          ownerId: 'demo-other-user2',
          ownerDisplayName: 'Misty Waterflower',
          apiId: 'gym1-2',
          name: "Blaine's Arcanine",
          set: 'Gym Challenge',
          cardNumber: '2',
          rarity: 'Rare Holo',
          language: 'English',
          variant: null,
          imageUrl: 'https://images.pokemontcg.io/gym2/2.png',
          value: 90,
          quantity: 1,
          artist: 'Ken Sugimori',
        },
      ]);
      setLoading(false);
      return () => {};
    }

    setLoading(true);
    const exchangeRef = collection(db, 'exchange');
    const q = query(exchangeRef, orderBy('listedAt', 'desc'), limit(20));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const exchangeItems = snapshot.docs.map((doc) => doc.data() as ExchangeItem);
        setItems(exchangeItems);
        setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
        setHasMore(snapshot.docs.length === 20);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching exchange items: ', error);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [user]);

  useEffect(() => {
    const unsubscribe = fetchInitialItems();
    return () => unsubscribe();
  }, [fetchInitialItems]);

  const fetchMoreItems = async () => {
    if (!user || user.uid === 'demo-guest-uid' || !lastVisible || !hasMore || loadingMore) return;

    setLoadingMore(true);
    const exchangeRef = collection(db, 'exchange');
    const q = query(exchangeRef, orderBy('listedAt', 'desc'), startAfter(lastVisible), limit(20));

    const documentSnapshots = await getDocs(q);
    const newItems = documentSnapshots.docs.map((doc) => doc.data() as ExchangeItem);

    setItems((prevItems) => [...prevItems, ...newItems]);
    setLastVisible(documentSnapshots.docs[documentSnapshots.docs.length - 1]);
    setHasMore(documentSnapshots.docs.length === 20);
    setLoadingMore(false);
  };

  useEffect(() => {
    let filtered = items;
    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      filtered = items.filter(
        (item) =>
          item.name?.toLowerCase().includes(lowerSearchTerm) ||
          item.set.toLowerCase().includes(lowerSearchTerm) ||
          item.cardNumber.toLowerCase().includes(lowerSearchTerm) ||
          item.ownerDisplayName?.toLowerCase().includes(lowerSearchTerm)
      );
    }
    // Filter out user's own items from the main view
    setFilteredItems(filtered.filter((item) => item.ownerId !== user?.uid));
  }, [items, searchTerm, user?.uid]);

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <AppHeader />
        <main className="flex-grow container mx-auto p-4 md:p-8 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="ml-3 text-xl text-muted-foreground">Loading Exchange...</p>
        </main>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <AppHeader />
        <main className="flex-grow container mx-auto p-4 md:p-8 flex flex-col items-center justify-center min-h-[70vh]">
          <Card className="max-w-md w-full text-center p-8 bg-card border shadow-2xl rounded-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl -z-10" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-accent/5 rounded-full blur-2xl -z-10" />

            <CardHeader className="items-center pb-2">
              <div className="p-4 bg-primary/10 rounded-full text-primary mb-2">
                <Replace className="h-10 w-10 animate-pulse" />
              </div>
              <CardTitle className="text-2xl font-bold tracking-tight">
                Collector Exchange
              </CardTitle>
              <CardDescription className="text-sm">
                Connect with other trainers to swap cards and complete your collections.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <p className="text-sm text-muted-foreground leading-relaxed">
                You must sign in or create an account to view and participate in the public exchange
                vault.
              </p>
              <Button
                size="lg"
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-8 shadow-lg shadow-primary/20"
                onClick={openAuthModal}
              >
                Sign In to Explore
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <AppHeader />
      <main className="flex-grow container mx-auto p-4 md:p-8 space-y-8">
        <Card>
          <CardHeader>
            <CardTitle className="font-headline text-3xl flex items-center gap-2">
              <Replace className="h-8 w-8 text-primary" /> Public Card Exchange
            </CardTitle>
            <CardDescription>
              Browse cards other collectors have listed for trade. Contact them to arrange an
              exchange.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search by card name, set, or owner..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full md:w-1/2"
              />
            </div>
          </CardContent>
        </Card>

        {filteredItems.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center text-muted-foreground">
              <Info className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p>No exchange items found.</p>
              <p className="text-sm">
                Either no one has listed cards for exchange yet, or nothing matches your search.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredItems.map((item) => (
              <Card key={item.exchangeId} className="flex flex-col">
                <CardHeader>
                  <CardTitle className="text-lg leading-tight">{item.name}</CardTitle>
                  <CardDescription>
                    {item.set} #{item.cardNumber}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-grow flex flex-col items-center">
                  <div className="relative w-full aspect-[2.5/3.5] rounded-md overflow-hidden mb-4">
                    <Image
                      src={item.imageUrl || 'https://placehold.co/250x350.png'}
                      alt={item.name}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 250px"
                      className="object-contain"
                      data-ai-hint="pokemon card front"
                    />

                    {/* Variant badge */}
                    {(() => {
                      const abbrev = getVariantAbbreviation(item.variant);
                      if (!abbrev) return null;

                      let colorClasses = '';
                      if (abbrev === 'RR') {
                        colorClasses =
                          'bg-rose-500/85 border-rose-400/40 text-white shadow-rose-500/25';
                      } else if (abbrev === '1st') {
                        colorClasses =
                          'bg-amber-500/85 border-amber-400/40 text-white shadow-amber-500/25';
                      } else if (abbrev === 'H') {
                        colorClasses =
                          'bg-indigo-500/85 border-indigo-400/40 text-white shadow-indigo-500/25';
                      } else if (abbrev === 'UNL') {
                        colorClasses =
                          'bg-slate-500/85 border-slate-400/40 text-white shadow-slate-500/25';
                      } else {
                        colorClasses =
                          'bg-teal-500/85 border-teal-400/40 text-white shadow-teal-500/25';
                      }

                      return (
                        <span
                          className={cn(
                            'absolute bottom-2 left-2 z-10 px-1.5 py-0.5 rounded text-[9px] font-black uppercase border backdrop-blur-md shadow-sm',
                            colorClasses
                          )}
                        >
                          {abbrev}
                        </span>
                      );
                    })()}
                  </div>
                </CardContent>
                <CardFooter className="flex-col items-start gap-3">
                  <div className="flex items-center gap-2 text-sm w-full">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>
                        {item.ownerDisplayName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-grow truncate">
                      <p className="font-semibold truncate">{item.ownerDisplayName}</p>
                    </div>
                  </div>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}

        {hasMore && !searchTerm && (
          <div className="text-center mt-8">
            <Button onClick={fetchMoreItems} disabled={loadingMore}>
              {loadingMore && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Load More
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
