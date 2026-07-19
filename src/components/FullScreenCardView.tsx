// src/components/FullScreenCardView.tsx
'use client';

import type { PokemonCard } from '@/types';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  ChevronLeft,
  ChevronRight,
  Languages,
  DollarSign,
  Move3d,
  Star,
  Edit3,
  Trash2,
  Replace,
  Gem,
  Hash,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { ApiPokemonCard } from '@/app/sets/[setId]/page';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { MarketPriceHistoryChart } from './MarketPriceHistoryChart';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { PokedexIcon } from '@/components/icons/PokedexIcon';

const getMarketPrice = (
  apiCard: ApiPokemonCard | undefined | null,
  variant?: string | null
): number => {
  if (!apiCard || !apiCard.tcgplayer?.prices) return 0;
  const prices = apiCard.tcgplayer.prices;

  if (variant && prices[variant]?.market) {
    return prices[variant]!.market!;
  }
  const variantPriority = [
    'normal',
    'holofoil',
    'reverseHolofoil',
    '1stEditionNormal',
    '1stEditionHolofoil',
    'unlimitedHolofoil',
    'unlimitedNormal',
  ];
  for (const v of variantPriority) {
    if (prices[v]?.market) {
      return prices[v]!.market!;
    }
  }
  for (const key in prices) {
    if (Object.prototype.hasOwnProperty.call(prices, key) && prices[key]?.market) {
      return prices[key]!.market!;
    }
  }
  return 0;
};

const formatVariantKey = (key: string): string => {
  if (!key) return 'N/A';
  return key
    .replace(/([A-Z0-9])/g, ' $1')
    .replace(/_/g, ' ')
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
};

type FullScreenCardViewProps = {
  isOpen: boolean;
  onClose: () => void;
  cards: PokemonCard[];
  currentIndex: number | null;
  onNavigate: (newIndex: number) => void;
  masterCardData: Map<string, ApiPokemonCard>;
  onEditCard?: (card: PokemonCard) => void;
  onRemoveCard?: (cardId: string) => void;
  onAddToExchange?: (card: PokemonCard) => void;
  onToggleFavorite?: (card: PokemonCard) => void;
};

export function FullScreenCardView({
  isOpen,
  onClose,
  cards,
  currentIndex,
  onNavigate,
  masterCardData,
  onEditCard,
  onRemoveCard,
  onAddToExchange,
  onToggleFavorite,
}: FullScreenCardViewProps): React.JSX.Element | null {
  const cardRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const [motionPermission, setMotionPermission] = useState<'prompt' | 'granted' | 'denied'>(
    'prompt'
  );

  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const currentCard = currentIndex !== null ? cards[currentIndex] : null;
  const masterCard = currentCard ? masterCardData.get(currentCard.apiId) : null;

  const allAvailablePrices = useMemo(() => {
    const tcgPlayerPrices: { name: string; value: number; currency: string }[] = [];

    if (masterCard?.tcgplayer?.prices) {
      for (const [variant, priceData] of Object.entries(masterCard.tcgplayer.prices)) {
        const entry = priceData as { market?: number | string | null } | undefined;
        if (entry?.market) {
          const numericValue = parseFloat(entry.market as any);
          if (!isNaN(numericValue) && numericValue > 0) {
            tcgPlayerPrices.push({
              name: formatVariantKey(variant),
              value: numericValue,
              currency: '$',
            });
          }
        }
      }
    }

    return { tcgPlayerPrices };
  }, [masterCard]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>): void => {
    if (isMobile) return;
    const cardNode = cardRef.current;
    if (!cardNode) return;

    const wWidth = window.innerWidth;
    const wHeight = window.innerHeight;
    const isMobileViewport = wWidth < 768;

    const cardWidth = isMobileViewport ? wWidth * 0.7 : wHeight * 0.5;
    const cardHeight = isMobileViewport ? wWidth * 0.98 : wHeight * 0.7;

    const cardLeft = (wWidth - cardWidth) / 2;
    const cardTop = (wHeight - 48 - 112 - cardHeight) / 2 + 48;

    const mx = Math.max(0, Math.min(1, (e.clientX - cardLeft) / cardWidth));
    const my = Math.max(0, Math.min(1, (e.clientY - cardTop) / cardHeight));

    const rY = (mx - 0.5) * -20;
    const rX = (my - 0.5) * 20;

    cardNode.style.setProperty('--rx', `${rX}deg`);
    cardNode.style.setProperty('--ry', `${rY}deg`);
  };

  const handleMouseLeave = () => {
    if (isMobile) return;
    const cardNode = cardRef.current;
    if (!cardNode) return;
    cardNode.style.setProperty('--rx', '0deg');
    cardNode.style.setProperty('--ry', '0deg');
  };

  const handleDeviceMotion = useCallback((event: DeviceOrientationEvent) => {
    const cardNode = cardRef.current;
    if (!cardNode || !event.beta || !event.gamma) return;

    let gamma = event.gamma;
    let beta = event.beta;

    const maxTilt = 25;
    gamma = Math.max(-maxTilt, Math.min(maxTilt, gamma));
    beta = Math.max(-maxTilt, Math.min(maxTilt, beta));

    const rY = (gamma / maxTilt) * 15;
    const rX = (beta / maxTilt) * -15;

    cardNode.style.setProperty('--rx', `${rX}deg`);
    cardNode.style.setProperty('--ry', `${rY}deg`);
  }, []);

  const requestMotionPermission = async () => {
    // @ts-ignore
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
      try {
        // @ts-ignore
        const permissionState = await DeviceOrientationEvent.requestPermission();
        if (permissionState === 'granted') {
          setMotionPermission('granted');
          window.addEventListener('deviceorientation', handleDeviceMotion);
        } else {
          setMotionPermission('denied');
        }
      } catch (error) {
        console.error('Device motion permission request failed:', error);
        setMotionPermission('denied');
      }
    } else {
      setMotionPermission('granted');
      window.addEventListener('deviceorientation', handleDeviceMotion);
    }
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen || currentIndex === null) return;
      if (event.key === 'ArrowRight') {
        if (currentIndex < cards.length - 1) {
          onNavigate(currentIndex + 1);
        }
      } else if (event.key === 'ArrowLeft') {
        if (currentIndex > 0) {
          onNavigate(currentIndex - 1);
        }
      } else if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('deviceorientation', handleDeviceMotion);
    };
  }, [isOpen, currentIndex, cards.length, onNavigate, onClose, handleDeviceMotion]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragStart({ x: e.clientX, y: e.clientY });
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragStart) {
      const offsetX = e.clientX - dragStart.x;
      const offsetY = e.clientY - dragStart.y;
      setDragOffset({ x: offsetX, y: offsetY });
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.releasePointerCapture(e.pointerId);
    if (dragStart) {
      const dragEnd = { x: e.clientX, y: e.clientY };
      const deltaX = dragEnd.x - dragStart.x;
      const deltaY = dragEnd.y - dragStart.y;
      const swipeThreshold = 50;

      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > swipeThreshold) {
        if (deltaX < 0 && currentIndex !== null && currentIndex < cards.length - 1) {
          onNavigate(currentIndex + 1);
        } else if (deltaX > 0 && currentIndex !== null && currentIndex > 0) {
          onNavigate(currentIndex - 1);
        }
      } else if (Math.abs(deltaY) > swipeThreshold) {
        onClose();
      }

      setDragStart(null);
      setDragOffset({ x: 0, y: 0 });
    }
  };

  const displayVariant = formatVariantKey(currentCard?.variant ?? '');
  const currentMarketValue = getMarketPrice(masterCard, currentCard?.variant);
  const displayValue = currentMarketValue > 0 ? currentMarketValue : currentCard?.value || 0;

  if (!currentCard) {
    return null;
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="w-full h-full max-w-full max-h-screen border-none rounded-none bg-white/70 dark:bg-zinc-950/70 backdrop-blur-3xl backdrop-saturate-200 p-4 sm:p-5 sm:max-w-[420px] sm:h-[85vh] sm:max-h-[680px] sm:border border-white/40 dark:border-white/15 sm:rounded-2xl flex flex-col justify-between overflow-hidden select-none shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25),inset_0_1px_1px_0_rgba(255,255,255,0.45)] transition-all duration-300">
        <DialogHeader className="space-y-1 flex flex-col items-center justify-center text-center flex-shrink-0">
          <DialogTitle className="flex items-center justify-center gap-2 text-2xl font-black w-full text-center">
            <span>{currentCard.name || `Card #${currentCard.cardNumber}`}</span>
            <Link
              href={`/pokedex/${encodeURIComponent((currentCard.name || '').toLowerCase())}`}
              onClick={onClose}
              title={`View ${currentCard.name} in Pokédex`}
              className="inline-flex items-center"
            >
              <PokedexIcon className="h-6 w-6 text-green-500 hover:text-green-600 transition-all duration-300 hover:scale-110 active:scale-95 drop-shadow-[0_0_2px_rgba(34,197,94,0.3)]" />
            </Link>
          </DialogTitle>
          <DialogDescription className="text-muted-foreground font-semibold text-sm text-center">
            {currentCard.set}
          </DialogDescription>
          <div className="flex flex-wrap items-center justify-center gap-2 text-xs pt-1 text-muted-foreground">
            {currentCard.rarity && (
              <span className="flex items-center gap-1 bg-white/40 dark:bg-white/5 px-2 py-0.5 rounded-full border border-white/40 dark:border-white/5 backdrop-blur-sm shadow-sm">
                <Gem className="h-3 w-3 text-amber-500" />
                Rarity:{' '}
                <strong className="ml-0.5 text-zinc-850 dark:text-zinc-200">
                  {currentCard.rarity}
                </strong>
              </span>
            )}
            {currentCard.cardNumber && (
              <span className="flex items-center gap-1 bg-white/40 dark:bg-white/5 px-2 py-0.5 rounded-full border border-white/40 dark:border-white/5 backdrop-blur-sm shadow-sm">
                <Hash className="h-3 w-3 text-slate-500" />
                Number:{' '}
                <strong className="ml-0.5 text-zinc-850 dark:text-zinc-200">
                  {currentCard.cardNumber}
                </strong>
              </span>
            )}
          </div>
        </DialogHeader>

        <div
          className="flex-grow flex items-center justify-center relative overflow-hidden min-h-0 w-full py-2"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          {currentIndex !== null && currentIndex > 0 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onNavigate(currentIndex - 1);
              }}
              className="absolute left-0 top-1/2 -translate-y-1/2 p-1.5 sm:p-2 text-zinc-400 hover:text-zinc-800 dark:text-zinc-500 dark:hover:text-zinc-100 transition-all active:scale-90 z-10"
              aria-label="Previous Card"
            >
              <ChevronLeft className="h-8 w-8 sm:h-10 sm:w-10" strokeWidth={2} />
            </button>
          )}

          <div className="flex-1 min-h-0 w-full flex items-center justify-center px-10 sm:px-12">
            <div
              ref={cardRef}
              key={currentCard.id}
              className="relative aspect-[63/88] h-full w-auto max-w-full rounded-[4%] overflow-hidden drop-shadow-2xl hover:drop-shadow-[0_20px_25px_rgba(0,0,0,0.45)] cursor-pointer group flex-shrink transition-all duration-300 hover:scale-[1.03] hover:-translate-y-1.5 touch-none"
              style={{
                transform: dragStart
                  ? `translate(${dragOffset.x}px, ${dragOffset.y}px)`
                  : 'translate(0, 0)',
                transition: dragStart ? 'none' : 'transform 0.3s ease-out',
              }}
              data-ai-hint="pokemon card front large interactive"
            >
              <Image
                key={`${currentCard.id}-image`}
                src={currentCard.imageUrl || 'https://placehold.co/500x700.png'}
                alt={currentCard.name || 'Pokémon Card'}
                fill
                sizes="(max-width: 640px) 80vw, 340px"
                priority
                className="object-contain pointer-events-none"
              />
              <div className="shine pointer-events-none" />
            </div>
          </div>

          {currentIndex !== null && currentIndex < cards.length - 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onNavigate(currentIndex + 1);
              }}
              className="absolute right-0 top-1/2 -translate-y-1/2 p-1.5 sm:p-2 text-zinc-400 hover:text-zinc-800 dark:text-zinc-500 dark:hover:text-zinc-100 transition-all active:scale-90 z-10"
              aria-label="Next Card"
            >
              <ChevronRight className="h-8 w-8 sm:h-10 sm:w-10" strokeWidth={2} />
            </button>
          )}

          {isMobile && motionPermission === 'prompt' && (
            <Button
              variant="secondary"
              className="absolute top-4 z-30"
              onClick={requestMotionPermission}
            >
              <Move3d className="mr-2 h-4 w-4" /> Enable Tilt Effect
            </Button>
          )}
        </div>

        {/* Space saving info controls and buttons panel */}
        <div className="flex flex-col flex-shrink-0 w-full space-y-3 pt-3 mt-auto border-t border-white/20 dark:border-zinc-800/40">
          {/* Metadata badges row */}
          <div className="flex flex-wrap items-center justify-center gap-1.5">
            {displayVariant && (
              <Badge
                variant="outline"
                className="text-[11px] font-semibold bg-white/40 dark:bg-white/5 border-white/30 dark:border-white/5 shadow-sm"
              >
                {displayVariant}
              </Badge>
            )}
            <Badge
              variant="outline"
              className="text-[11px] font-semibold border-indigo-500/35 text-indigo-600 dark:text-indigo-400 flex items-center gap-1 bg-indigo-500/5 shadow-sm"
            >
              <Languages size={11} /> {currentCard.language}
            </Badge>
            <Badge
              variant="outline"
              className="text-[11px] font-semibold border-purple-500/35 text-purple-600 dark:text-purple-400 bg-purple-500/5 shadow-sm"
            >
              Qty: {currentCard.quantity}
            </Badge>
            {currentCard.artist && (
              <Badge
                variant="outline"
                className="text-[11px] font-semibold border-cyan-500/35 text-cyan-600 dark:text-cyan-400 bg-cyan-500/5 shadow-sm"
              >
                Artist: {currentCard.artist}
              </Badge>
            )}

            {displayValue > 0 && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 px-2 text-[11px] font-semibold border-green-500/40 text-green-600 dark:text-green-400 hover:bg-green-500/10 hover:text-green-700 flex items-center gap-1 shadow-sm"
                  >
                    <DollarSign size={10} /> {displayValue.toFixed(2)}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80" align="center">
                  <div className="space-y-2">
                    <h4 className="font-medium leading-none">Market Prices</h4>
                    <p className="text-xs text-muted-foreground">Live prices from TCGPlayer.</p>
                  </div>
                  <div className="mt-4 max-h-40 overflow-y-auto pr-2">
                    {allAvailablePrices.tcgPlayerPrices.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center">
                        No price data available.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {allAvailablePrices.tcgPlayerPrices.map((price, index) => (
                          <div
                            key={`tcg-${index}`}
                            className="grid grid-cols-[1fr,auto] items-center gap-4 text-xs"
                          >
                            <span className="text-muted-foreground">{price.name}</span>
                            <span className="font-semibold text-right">
                              {price.currency}
                              {price.value.toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <Separator className="my-3" />
                  <MarketPriceHistoryChart cardApiId={currentCard?.apiId ?? null} />
                </PopoverContent>
              </Popover>
            )}
          </div>

          {/* Action buttons matching the layout style in 2x2 grid */}
          <div className="grid grid-cols-2 gap-2 pt-1 w-full">
            {onToggleFavorite && (
              <Button
                variant={currentCard.isFavorite ? 'default' : 'outline'}
                size="sm"
                onClick={() => onToggleFavorite(currentCard)}
                className={cn(
                  'h-10 rounded-lg gap-1.5 active:scale-95 transition-all duration-200 bg-white/40 hover:bg-white/60 dark:bg-zinc-800/10 dark:hover:bg-zinc-800/20 border-white/50 dark:border-white/10 backdrop-blur-sm shadow-sm',
                  currentCard.isFavorite &&
                    'bg-amber-500 hover:bg-amber-600 text-white border-transparent'
                )}
              >
                <Star className={cn('h-4 w-4', currentCard.isFavorite && 'fill-current')} />
                <span>Favorite</span>
              </Button>
            )}
            {onEditCard && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEditCard(currentCard)}
                className="h-10 rounded-lg gap-1.5 active:scale-95 transition-all duration-200 border-white/50 dark:border-white/10 bg-white/40 hover:bg-white/60 dark:bg-zinc-800/10 dark:hover:bg-zinc-800/20 backdrop-blur-sm shadow-sm"
              >
                <Edit3 className="h-4 w-4" />
                <span>Edit Card</span>
              </Button>
            )}
            {onAddToExchange && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onAddToExchange(currentCard)}
                className="h-10 rounded-lg gap-1.5 active:scale-95 transition-all duration-200 border-white/50 dark:border-white/10 bg-white/40 hover:bg-white/60 dark:bg-zinc-800/10 dark:hover:bg-zinc-800/20 backdrop-blur-sm shadow-sm text-zinc-900 dark:text-zinc-100"
              >
                <Replace className="h-4 w-4" />
                <span>Exchange</span>
              </Button>
            )}
            {onRemoveCard && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => onRemoveCard(currentCard.id)}
                className="h-10 rounded-lg gap-1.5 active:scale-95 transition-all duration-200"
              >
                <Trash2 className="h-4 w-4" />
                <span>Remove</span>
              </Button>
            )}
          </div>

          <p className="text-[10px] text-center text-muted-foreground mt-1">
            Card {currentIndex !== null ? currentIndex + 1 : '-'} of {cards.length}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
