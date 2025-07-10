// src/app/exchange/page.tsx
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Image from "next/image";
import { AppHeader } from "@/components/AppHeader";
import type { ExchangeItem } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, Search, Replace, Info, Mail } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { getFirestore, collection, onSnapshot, query, orderBy, limit, startAfter, getDocs, DocumentData } from "firebase/firestore";
import { app } from "@/lib/firebase";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const db = getFirestore(app);

export default function ExchangePage() {
  const { user, openAuthModal } = useAuth();
  const [items, setItems] = useState<ExchangeItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<ExchangeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [lastVisible, setLastVisible] = useState<DocumentData | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchInitialItems = useCallback(() => {
    setLoading(true);
    const exchangeRef = collection(db, "exchange");
    const q = query(exchangeRef, orderBy("listedAt", "desc"), limit(20));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const exchangeItems = snapshot.docs.map(doc => doc.data() as ExchangeItem);
      setItems(exchangeItems);
      setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
      setHasMore(snapshot.docs.length === 20);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching exchange items: ", error);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    const unsubscribe = fetchInitialItems();
    return () => unsubscribe();
  }, [fetchInitialItems]);

  const fetchMoreItems = async () => {
    if (!lastVisible || !hasMore || loadingMore) return;

    setLoadingMore(true);
    const exchangeRef = collection(db, "exchange");
    const q = query(exchangeRef, orderBy("listedAt", "desc"), startAfter(lastVisible), limit(20));
    
    const documentSnapshots = await getDocs(q);
    const newItems = documentSnapshots.docs.map(doc => doc.data() as ExchangeItem);

    setItems(prevItems => [...prevItems, ...newItems]);
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
    setFilteredItems(filtered.filter(item => item.ownerId !== user?.uid));
  }, [items, searchTerm, user?.uid]);

  const handleContactOwner = (ownerEmail: string | null | undefined, cardName: string) => {
    if (!ownerEmail) {
        alert("Owner's email is not available.");
        return;
    }
    window.location.href = `mailto:${ownerEmail}?subject=PokéTRKR Trade Inquiry: ${cardName}`;
  };

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
              Browse cards other collectors have listed for trade. Contact them to arrange an exchange.
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
                    <Info className="h-10 w-10 mx-auto mb-2 opacity-50"/>
                    <p>No exchange items found.</p>
                    <p className="text-sm">Either no one has listed cards for exchange yet, or nothing matches your search.</p>
                </CardContent>
            </Card>
        ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {filteredItems.map((item) => (
                    <Card key={item.exchangeId} className="flex flex-col">
                        <CardHeader>
                            <CardTitle className="text-lg leading-tight">{item.name}</CardTitle>
                            <CardDescription>{item.set} #{item.cardNumber}</CardDescription>
                        </CardHeader>
                        <CardContent className="flex-grow flex flex-col items-center">
                            <div className="relative w-full aspect-[2.5/3.5] rounded-md overflow-hidden mb-4">
                                <Image
                                    src={item.imageUrl || "https://placehold.co/250x350.png"}
                                    alt={item.name}
                                    layout="fill"
                                    objectFit="contain"
                                    data-ai-hint="pokemon card front"
                                />
                            </div>
                        </CardContent>
                        <CardFooter className="flex-col items-start gap-3">
                            <div className="flex items-center gap-2 text-sm w-full">
                                <Avatar className="h-8 w-8">
                                    <AvatarFallback>{item.ownerDisplayName.charAt(0).toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <div className="flex-grow truncate">
                                    <p className="font-semibold truncate">{item.ownerDisplayName}</p>
                                </div>
                            </div>
                             <Button className="w-full" onClick={() => user ? handleContactOwner(item.email, item.name) : openAuthModal()}>
                                <Mail className="mr-2 h-4 w-4"/>
                                Contact Owner
                            </Button>
                        </CardFooter>
                    </Card>
                ))}
            </div>
        )}

        {hasMore && !searchTerm && (
            <div className="text-center mt-8">
                <Button onClick={fetchMoreItems} disabled={loadingMore}>
                    {loadingMore && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                    Load More
                </Button>
            </div>
        )}
      </main>
    </div>
  );
}
