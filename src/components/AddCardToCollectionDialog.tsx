// src/components/AddCardToCollectionDialog.tsx
"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { useUserCollection } from "@/hooks/useUserCollection";
import { useWishlist } from "@/hooks/useWishlist";
import { collectionService } from "@/services/collectionService";
import { wishlistService } from "@/services/wishlistService";
import { useUIStore } from "@/store/useUIStore";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import type { ApiPokemonCard as PokemonTcgApiCard } from "@/app/sets/[setId]/page";
import { Tag, Gem, DollarSign, Layers, Eye, Paintbrush, Hash, LogIn, Heart, Minus, Plus, ChevronUp, ChevronDown, Check, Trash2, ChevronLeft, ChevronRight, TrendingUp } from "lucide-react";
import { Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { SingleCardTiltView } from "@/components/SingleCardTiltView";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { PokedexIcon } from "@/components/icons/PokedexIcon";

const formatVariantKey = (key: string): string => {
  if (!key) return "N/A";
  return key.replace(/([A-Z0-9])/g, " $1").replace(/^./, (str) => str.toUpperCase()).trim();
};

type DisplayPriceInfo = {
  variantKey: string; 
  variantName: string; 
  price: number | string;
  currencySymbol?: string;
};

type AddCardToCollectionDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  cardName: string;
  initialCardImageUrl?: string | null;
  pokemonTcgApiCard: PokemonTcgApiCard | null;
  onPrevCard?: () => void;
  onNextCard?: () => void;
  hasPrevCard?: boolean;
  hasNextCard?: boolean;
  prevCardImageUrl?: string | null;
  nextCardImageUrl?: string | null;
};

export function AddCardToCollectionDialog({
  isOpen,
  onClose,
  cardName,
  initialCardImageUrl,
  pokemonTcgApiCard,
  onPrevCard,
  onNextCard,
  hasPrevCard,
  hasNextCard,
  prevCardImageUrl,
  nextCardImageUrl,
}: AddCardToCollectionDialogProps) {
  const { user } = useAuth();
  const { collection } = useUserCollection(user?.uid);
  const { wishlist } = useWishlist(user?.uid);
  const { openAuthModal } = useUIStore();
  const { toast } = useToast();

  const [quantityInput, setQuantityInput] = useState<number>(1);
  const [finalDisplayImageUrl, setFinalDisplayImageUrl] = useState<string>("https://placehold.co/200x280.png");
  const [displayPrices, setDisplayPrices] = useState<DisplayPriceInfo[]>([]);
  const [currentAvailableVariants, setCurrentAvailableVariants] = useState<string[]>([]);
  const [selectedVariant, setSelectedVariant] = useState<string>("");
  const [isImageZoomed, setIsImageZoomed] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [isAddHovered, setIsAddHovered] = useState(false);
  const [animationClass, setAnimationClass] = useState("animate-none");

  // Upgrade 1: Build the exact URL Next.js optimizer will request
  const preloadWithOptimizer = useCallback((url?: string | null) => {
    if (!url || url.startsWith("data:") || url.includes("placehold.co")) return;
    const nextImageUrl = `/_next/image?url=${encodeURIComponent(url)}&w=1080&q=75`;
    const img = new window.Image();
    img.src = nextImageUrl;
  }, []);

  useEffect(() => {
    if (isOpen) {
      preloadWithOptimizer(prevCardImageUrl);
      preloadWithOptimizer(nextCardImageUrl);
    }
  }, [isOpen, prevCardImageUrl, nextCardImageUrl, preloadWithOptimizer]);


  // Minimum swipe distance in pixels
  const minSwipeDistance = 50;

  const triggerNext = () => {
    if (onNextCard && animationClass === "animate-none") {
      setAnimationClass("animate-slide-out-left");
      setTimeout(() => {
        onNextCard();
        setAnimationClass("animate-slide-in-right");
        setTimeout(() => setAnimationClass("animate-none"), 300);
      }, 150);
    }
  };

  const triggerPrev = () => {
    if (onPrevCard && animationClass === "animate-none") {
      setAnimationClass("animate-slide-out-right");
      setTimeout(() => {
        onPrevCard();
        setAnimationClass("animate-slide-in-left");
        setTimeout(() => setAnimationClass("animate-none"), 300);
      }, 150);
    }
  };

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
    // Upgrade 4: Preload on touch start / pointerdown
    preloadWithOptimizer(prevCardImageUrl);
    preloadWithOptimizer(nextCardImageUrl);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    
    if (isLeftSwipe && onNextCard) {
      triggerNext();
    } else if (isRightSwipe && onPrevCard) {
      triggerPrev();
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isImageZoomed) return;
      if (e.key === "ArrowLeft" && onPrevCard) {
        triggerPrev();
      } else if (e.key === "ArrowRight" && onNextCard) {
        triggerNext();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onPrevCard, onNextCard, isImageZoomed, animationClass]);

  const isAlreadyInCollection = useMemo(() => 
    pokemonTcgApiCard ? collection.some(c => c.apiId === pokemonTcgApiCard.id) : false, 
    [collection, pokemonTcgApiCard]
  );

  const collectionItem = useMemo(() => 
    pokemonTcgApiCard ? collection.find(c => c.apiId === pokemonTcgApiCard.id) : null,
    [collection, pokemonTcgApiCard]
  );
  
  const isAlreadyInWishlist = useMemo(() => 
    pokemonTcgApiCard ? wishlist.some(w => w.apiId === pokemonTcgApiCard.id) : false,
    [wishlist, pokemonTcgApiCard]
  );

  const wishlistItem = useMemo(() => 
    pokemonTcgApiCard ? wishlist.find(w => w.apiId === pokemonTcgApiCard.id) : null,
    [wishlist, pokemonTcgApiCard]
  );

  const isPokemonSpeciesOwned = useMemo(() => {
    if (!cardName) return false;
    return collection.some(c => c.name.toLowerCase() === cardName.toLowerCase());
  }, [collection, cardName]);

  useEffect(() => {
    if (!isOpen) {
      setQuantityInput(1);
      setDisplayPrices([]);
      setFinalDisplayImageUrl("https://placehold.co/200x280.png");
      setCurrentAvailableVariants([]);
      setSelectedVariant("");
      setIsImageZoomed(false);
      setIsAdding(false);
      setAnimationClass("animate-none");
      return;
    }

    let imageUrlToSet = "https://placehold.co/200x280.png/CCCCCC/333333?text=Loading...";
    const newPrices: DisplayPriceInfo[] = [];
    const pricedVariants: string[] = [];

    if (pokemonTcgApiCard) {
      imageUrlToSet = pokemonTcgApiCard.images.large || pokemonTcgApiCard.images.small || initialCardImageUrl || "https://placehold.co/200x280.png";
      
      if (pokemonTcgApiCard.tcgplayer?.prices) {
        const prices = pokemonTcgApiCard.tcgplayer.prices;
        const sortedPriceKeys = Object.keys(prices).sort((a,b) => {
          const order = ['unlimited', 'unlimitedNormal', 'unlimitedHolofoil', 'normal', 'holofoil', 'reverseHolofoil', '1stEdition', '1stEditionNormal', '1stEditionHolofoil'];
          const indexA = order.indexOf(a);
          const indexB = order.indexOf(b);
          if (indexA !== -1 && indexB !== -1) return indexA - indexB;
          if (indexA !== -1) return -1;
          if (indexB !== -1) return 1;
          return a.localeCompare(b); 
        });

        for (const key of sortedPriceKeys) {
          const priceEntry = prices[key as keyof typeof prices];
          if (priceEntry && typeof priceEntry.market === 'number' && !isNaN(priceEntry.market)) {
            newPrices.push({ 
              variantKey: `tcgplayer-${key}`, 
              variantName: `TCGplayer - ${formatVariantKey(key)}`, 
              price: priceEntry.market, 
              currencySymbol: '$' 
            });
            pricedVariants.push(key);
          }
        }
        setCurrentAvailableVariants(pricedVariants);
        if (pricedVariants.length > 0) {
          let defaultVariant = 
              pricedVariants.find(v => v === 'unlimited') || 
              pricedVariants.find(v => v === 'unlimitedNormal') ||
              pricedVariants.find(v => v === 'normal') || 
              pricedVariants.find(v => v === 'holofoil') || 
              pricedVariants.find(v => v === 'reverseHolofoil') ||
              pricedVariants.find(v => v === 'unlimitedHolofoil') ||
              pricedVariants.find(v => v === '1stEdition') ||
              pricedVariants.find(v => v === '1stEditionNormal') ||
              pricedVariants[0];
          setSelectedVariant(defaultVariant || "");
        } else {
          setSelectedVariant("");
        }
      }
    } else if (initialCardImageUrl) {
      imageUrlToSet = initialCardImageUrl;
      setCurrentAvailableVariants([]);
      setSelectedVariant("");
    }
    
    setFinalDisplayImageUrl(imageUrlToSet);
    setDisplayPrices(newPrices);
    setQuantityInput(1);
  }, [isOpen, pokemonTcgApiCard, initialCardImageUrl]);

  const marketPriceForSelectedVariant = useMemo(() => {
    if (!selectedVariant || !pokemonTcgApiCard?.tcgplayer?.prices) return 0;
    const priceEntry = pokemonTcgApiCard.tcgplayer.prices[selectedVariant as keyof typeof pokemonTcgApiCard.tcgplayer.prices];
    return priceEntry?.market || 0;
  }, [selectedVariant, pokemonTcgApiCard]);

  const handleDecrement = () => setQuantityInput(prev => Math.max(1, prev - 1));
  const handleIncrement = () => setQuantityInput(prev => prev + 1);

  const handleAddToCollection = async () => {
    if (!user) { openAuthModal(); return; }
    if (!pokemonTcgApiCard) return;

    setIsAdding(true);
    try {
      if (isAlreadyInCollection && collectionItem) {
        await collectionService.removeCard(user.uid, collectionItem.id);
        toast({
          title: "Removed from Collection",
          description: `${pokemonTcgApiCard.name} has been removed from your collection.`,
        });
      } else {
        await collectionService.addCard(user.uid, {
          apiId: pokemonTcgApiCard.id,
          name: pokemonTcgApiCard.name,
          set: pokemonTcgApiCard.set.name,
          cardNumber: pokemonTcgApiCard.number,
          rarity: pokemonTcgApiCard.rarity || 'N/A',
          value: marketPriceForSelectedVariant,
          variant: selectedVariant || null,
          quantity: quantityInput,
          imageUrl: pokemonTcgApiCard.images.large || null,
          language: 'English',
          artist: pokemonTcgApiCard.artist || null,
        });
        toast({
          title: "Card Added!",
          description: `${pokemonTcgApiCard.name} has been added to your collection.`,
          className: "bg-secondary text-secondary-foreground"
        });
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    } finally {
      setIsAdding(false);
    }
  };
  
  const handleAddToWishlist = async () => {
    if (!user) { openAuthModal(); return; }
    if (!pokemonTcgApiCard) return;
    
    setIsAdding(true);
    try {
      if (isAlreadyInWishlist && wishlistItem) {
        await wishlistService.removeItem(user.uid, wishlistItem.id);
        toast({
          title: "Removed from Wishlist",
          description: `${pokemonTcgApiCard.name} has been removed from your want list.`,
        });
      } else {
        await wishlistService.addItem(user.uid, {
          apiId: pokemonTcgApiCard.id,
          name: pokemonTcgApiCard.name,
          set: pokemonTcgApiCard.set.name,
          cardNumber: pokemonTcgApiCard.number,
          rarity: pokemonTcgApiCard.rarity || 'N/A',
          imageUrl: pokemonTcgApiCard.images.large || null,
          artist: pokemonTcgApiCard.artist || null,
        });
        toast({
          title: "Added to Wishlist!",
          description: `${pokemonTcgApiCard.name} is now on your want list.`,
        });
      }
    } catch(err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    } finally {
      setIsAdding(false);
    }
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    setFinalDisplayImageUrl("https://placehold.co/200x280.png/CCCCCC/333333?text=Image+Error");
  };
  
  const isAddButtonDisabled = isAlreadyInCollection ? isAdding : ((currentAvailableVariants.length > 0 && !selectedVariant) || quantityInput < 1 || isAdding);
  const formattedSelectedVariantName = useMemo(() => selectedVariant ? formatVariantKey(selectedVariant) : undefined, [selectedVariant]);

  return (
    <>
      <Dialog open={isOpen && !isImageZoomed} onOpenChange={(open) => { if (!open) onClose(); }}>
        <DialogContent 
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          className="w-full h-full max-w-full max-h-screen border-none rounded-none p-4 sm:p-5 sm:max-w-[420px] sm:h-[85vh] sm:max-h-[680px] sm:border sm:rounded-2xl flex flex-col justify-between overflow-hidden select-none shadow-2xl transition-all duration-300"
        >
          <DialogHeader className="space-y-1 flex flex-col items-center justify-center text-center flex-shrink-0">
            <DialogTitle className="flex items-center justify-center gap-2 text-2xl font-black w-full text-center">
              <span>{cardName}</span>
              <Link 
                href={`/pokedex/${encodeURIComponent(cardName.toLowerCase())}`} 
                onClick={onClose}
                title={`View ${cardName} in Pokédex`}
                className="inline-flex items-center"
              >
                <PokedexIcon 
                  className={cn(
                    "h-6 w-6 transition-all duration-300 hover:scale-110 active:scale-95",
                    isPokemonSpeciesOwned 
                      ? "text-green-500 hover:text-green-600 drop-shadow-[0_0_2px_rgba(34,197,94,0.3)]" 
                      : "text-zinc-950 dark:text-zinc-100 hover:text-zinc-650 dark:hover:text-zinc-350"
                  )} 
                />
              </Link>
            </DialogTitle>
            {pokemonTcgApiCard?.set.name && (
              <DialogDescription className="hover:underline cursor-pointer text-muted-foreground hover:text-primary transition-colors font-semibold text-sm text-center">
                <Link href={`/sets/${pokemonTcgApiCard.set.id}`} onClick={onClose}>
                  {pokemonTcgApiCard.set.name}
                </Link>
              </DialogDescription>
            )}
            <div className="flex flex-wrap items-center justify-center gap-2 text-xs pt-1 text-muted-foreground">
              {pokemonTcgApiCard?.rarity && (
                <span className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full border border-zinc-200/40 dark:border-zinc-700/40">
                  <Gem className="h-3 w-3 text-amber-500" />
                  Rarity: <strong className="ml-0.5 text-zinc-800 dark:text-zinc-200">{pokemonTcgApiCard.rarity}</strong>
                </span>
              )}
              {pokemonTcgApiCard?.number && pokemonTcgApiCard.set.printedTotal > 0 && (
                <span className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full border border-zinc-200/40 dark:border-zinc-700/40">
                  <Hash className="h-3 w-3 text-slate-500" />
                  Number: <strong className="ml-0.5 text-zinc-800 dark:text-zinc-200">{pokemonTcgApiCard.number} / {pokemonTcgApiCard.set.printedTotal}</strong>
                </span>
              )}
            </div>
          </DialogHeader>
          <div className="flex-grow flex flex-col items-center justify-center min-h-0 w-full relative py-2">
            
            {/* Absolute Side Navigation Arrows (No Background) */}
            {hasPrevCard && (
              <button
                type="button"
                onClick={triggerPrev}
                onPointerDown={() => preloadWithOptimizer(prevCardImageUrl)}
                className="absolute left-0 top-1/2 -translate-y-1/2 p-1.5 sm:p-2 sm:-ml-1 text-zinc-400 hover:text-zinc-800 dark:text-zinc-500 dark:hover:text-zinc-100 transition-all active:scale-90 z-10"
              >
                <ChevronLeft className="h-8 w-8 sm:h-10 sm:w-10" strokeWidth={2} />
              </button>
            )}

            {/* Center and size card nicely to fill the remaining space */}
            <div className="flex-1 min-h-0 w-full flex items-center justify-center px-10 sm:px-12">
              <div 
                className={cn(
                  "relative aspect-[63/88] h-full w-auto max-w-full rounded-[4%] overflow-hidden drop-shadow-2xl hover:drop-shadow-[0_20px_25px_rgba(0,0,0,0.45)] cursor-pointer group flex-shrink transition-all duration-300 hover:scale-[1.03] hover:-translate-y-1.5",
                  animationClass
                )}
                data-ai-hint="pokemon card front"
              >
                {/* Upgrade 5: Preload link hint for initial image */}
                {isOpen && finalDisplayImageUrl && !finalDisplayImageUrl.includes("placehold.co") && (
                  <link
                    rel="preload"
                    as="image"
                    href={`/_next/image?url=${encodeURIComponent(finalDisplayImageUrl)}&w=1080&q=75`}
                    fetchPriority="high"
                  />
                )}

                {/* Upgrade 2: Hidden neighbors with fetchPriority="high" positioned offscreen */}
                <div className="absolute pointer-events-none -left-[9999px] -top-[9999px] w-10 h-14 overflow-hidden opacity-0" aria-hidden="true">
                  {prevCardImageUrl && (
                    <Image src={prevCardImageUrl} layout="fill" sizes="100vw" priority fetchPriority="high" alt="" />
                  )}
                  {nextCardImageUrl && (
                    <Image src={nextCardImageUrl} layout="fill" sizes="100vw" priority fetchPriority="high" alt="" />
                  )}
                </div>

                {/* Upgrade 3: Remove key prop for stable DOM and instant bitmap swap */}
                <Image
                  src={finalDisplayImageUrl}
                  alt={cardName}
                  layout="fill"
                  sizes="100vw"
                  objectFit="contain"
                  priority
                  fetchPriority="high"
                  onError={handleImageError}
                  onClick={() => setIsImageZoomed(true)}
                  className="transition-all duration-200"
                />
                <div 
                  onClick={() => setIsImageZoomed(true)}
                  className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center rounded-2xl"
                >
                  <Eye className="h-7 w-7 text-white" />
                </div>
              </div>
            </div>

            {hasNextCard && (
              <button
                type="button"
                onClick={triggerNext}
                onPointerDown={() => preloadWithOptimizer(nextCardImageUrl)}
                className="absolute right-0 top-1/2 -translate-y-1/2 p-1.5 sm:p-2 sm:-mr-1 text-zinc-400 hover:text-zinc-800 dark:text-zinc-500 dark:hover:text-zinc-100 transition-all active:scale-90 z-10"
              >
                <ChevronRight className="h-8 w-8 sm:h-10 sm:w-10" strokeWidth={2} />
              </button>
            )}


          </div>
        
          {/* Space saving Variant and Quantity row controls */}
          <div className="flex flex-col flex-shrink-0 w-full space-y-3 pt-3 mt-auto">
            {currentAvailableVariants.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center">
                  <Label className="inline-flex items-center gap-1.5 font-bold text-sm text-zinc-800 dark:text-zinc-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 inline-block shadow-sm animate-pulse"></span>
                    Variant
                  </Label>
                  {selectedVariant && marketPriceForSelectedVariant > 0 && (
                    <div className="flex items-center gap-1.5 text-xs font-bold text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/20 px-2 py-0.5 rounded-md border border-green-200/30 dark:border-green-800/30 shadow-sm transition-all hover:scale-105">
                      <DollarSign className="h-3 w-3 text-green-500" />
                      <span>${marketPriceForSelectedVariant.toFixed(2)}</span>
                      <button
                        type="button"
                        onClick={() => toast({
                          title: "Historical Trends",
                          description: "Historical price tracking and interactive charts will be activated as price logs sync in real time!",
                          className: "bg-secondary text-secondary-foreground"
                        })}
                        className="ml-1 text-zinc-450 hover:text-zinc-650 dark:hover:text-zinc-200 transition-colors focus:outline-none"
                        title="View Price Trends"
                      >
                        <TrendingUp className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </div>
                <div className="flex items-center p-1 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-full w-full overflow-x-auto no-scrollbar gap-1">
                  {currentAvailableVariants.map((variantKey) => {
                    const isActive = selectedVariant === variantKey;
                    const priceInfo = displayPrices.find(p => p.variantKey === `tcgplayer-${variantKey}`);
                    const priceDisplay = priceInfo && typeof priceInfo.price === 'number' ? ` ($${priceInfo.price.toFixed(2)})` : '';
                    return (
                      <button
                        key={variantKey}
                        type="button"
                        onClick={() => setSelectedVariant(variantKey)}
                        className={cn(
                          "flex-1 py-1.5 px-3 rounded-full text-[11px] sm:text-xs font-semibold text-center transition-all duration-200 whitespace-nowrap active:scale-95",
                          isActive
                            ? "bg-zinc-700 dark:bg-zinc-200 text-zinc-50 dark:text-zinc-900 shadow-sm"
                            : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-850 dark:hover:text-zinc-200"
                        )}
                      >
                        {formatVariantKey(variantKey)}{priceDisplay}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Premium Custom Quantity Selector (as seen in TCG Pocket and Picture 2) */}
            <div className="flex items-center justify-between py-1 w-full">
              <div className="inline-flex items-center gap-1.5">
                <Label className="inline-flex items-center gap-1.5 font-bold text-sm text-zinc-800 dark:text-zinc-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-500 inline-block shadow-sm"></span>
                  Quantity
                </Label>
              </div>
              
              <div className="flex items-center gap-2 select-none">
                {/* Minus Button (Compact, tactile) */}
                <button
                  type="button"
                  onClick={handleDecrement}
                  disabled={quantityInput <= 1}
                  className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-650 dark:text-zinc-300 flex items-center justify-center hover:bg-zinc-200 dark:hover:bg-zinc-700 active:scale-90 transition-all disabled:opacity-30 disabled:pointer-events-none border border-zinc-200/50 dark:border-zinc-700/50 shadow-sm font-bold text-base"
                >
                  -
                </button>

                {/* Number Display */}
                <span className="text-base font-extrabold text-zinc-900 dark:text-zinc-100 min-w-[24px] text-center">
                  {quantityInput}
                </span>

                {/* Plus Button (Compact, tactile) */}
                <button
                  type="button"
                  onClick={handleIncrement}
                  className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-850 dark:text-zinc-100 flex items-center justify-center hover:bg-zinc-300 dark:hover:bg-zinc-650 active:scale-90 transition-all border border-zinc-300/50 dark:border-zinc-650/50 shadow-sm font-bold text-base"
                >
                  +
                </button>
              </div>
            </div>

            {displayPrices.length === 0 && (
                <p className="text-xs text-center text-muted-foreground py-1 bg-zinc-50 dark:bg-zinc-900/40 rounded-lg p-2 border border-zinc-200/20">
                    No market price data available for this card from the API.
                </p>
            )}

            <div className="flex flex-row items-center gap-2 pt-1 w-full">
              <Button
                variant="outline"
                onClick={handleAddToWishlist}
                disabled={isAdding}
                className="flex-1 rounded-lg h-10 flex items-center justify-center gap-1.5"
              >
                {isAdding ? (
                  <Loader2 className="h-4 w-4 animate-spin"/>
                ) : (
                  <Heart 
                    className={cn(
                      "h-4 w-4 transition-colors duration-200",
                      isAlreadyInWishlist 
                        ? "text-rose-500 fill-rose-500" 
                        : "text-zinc-400 dark:text-zinc-500 hover:text-rose-500"
                    )}
                  />
                )}
                <span className="truncate">{isAlreadyInWishlist ? 'Wishlisted' : 'Wishlist'}</span>
              </Button>
              <Button
                type="submit"
                onClick={handleAddToCollection}
                disabled={isAddButtonDisabled}
                onMouseEnter={() => setIsAddHovered(true)}
                onMouseLeave={() => setIsAddHovered(false)}
                className={cn(
                  "flex-1 rounded-lg h-10 flex items-center justify-center gap-1.5 font-semibold transition-all duration-200",
                  isAlreadyInCollection
                    ? "bg-green-50 dark:bg-green-950/20 text-green-600 dark:text-green-400 border border-green-200/50 dark:border-green-800/40 hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-600 hover:border-red-200/50 dark:hover:border-red-800/40 shadow-sm"
                    : "bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-zinc-50 dark:text-zinc-900 shadow-sm"
                )}
              >
                {isAdding ? (
                  <Loader2 className="h-4 w-4 animate-spin"/>
                ) : isAlreadyInCollection ? (
                  isAddHovered ? (
                    <>
                      <Trash2 className="h-4 w-4 text-red-500 animate-pulse"/>
                      <span className="truncate">Remove Card</span>
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 text-green-500"/>
                      <span className="truncate">In Collection</span>
                    </>
                  )
                ) : (
                  <>
                    {!user && <LogIn className="h-4 w-4 mr-0.5"/>}
                    <span className="truncate">{user ? 'Add Card' : 'Login to Add'}</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {isImageZoomed && (
        <SingleCardTiltView
          isOpen={isImageZoomed}
          onClose={() => setIsImageZoomed(false)}
          imageUrl={finalDisplayImageUrl}
          altText={cardName}
        />
      )}
    </>
  );
}
