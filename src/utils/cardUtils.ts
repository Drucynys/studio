/**
 * src/utils/cardUtils.ts
 * Pure utility functions for Pokémon card operations, formatting, and display logic.
 */

/**
 * Returns a short, user-friendly abbreviation for a card variant key.
 * Used for variant badges on card display grids.
 *
 * @param variant - The raw variant key from the card data (e.g., 'reverseHolofoil', '1stEditionHolofoil')
 * @returns A string abbreviation (e.g., 'RR', 'H', '1st', 'UNL') or null if no badge is needed (e.g., normal/standard)
 */
export function getVariantAbbreviation(variant: string | null | undefined): string | null {
  if (!variant) return null;

  const clean = variant.trim().toLowerCase();

  // Normal/Standard cards do not require variant badges
  if (clean === 'normal' || clean === 'standard') {
    return null;
  }

  // Mapping specific standard variant keys to their shorthand abbreviations
  if (clean.includes('reverse')) {
    return 'RR'; // Reverse Rare / Reverse Holofoil
  }
  if (clean.includes('1st')) {
    return '1st'; // 1st Edition
  }
  if (clean.includes('unlimited')) {
    return 'UNL'; // Unlimited
  }
  if (clean.includes('holo')) {
    return 'H'; // Holofoil
  }

  // Fallback for custom or unrecognized variants
  // Return the first 3 characters in uppercase
  return clean.substring(0, 3).toUpperCase();
}

import type { ApiPokemonCard } from '@/app/sets/[setId]/page';

/**
 * Formats a raw variant key (e.g., 'reverseHolofoil') into a user-friendly name (e.g., 'Reverse Holofoil').
 *
 * @param key - The raw variant key from the card data
 * @returns A formatted string
 */
export function formatVariantKey(key: string): string {
  if (!key) return 'Standard';
  const clean = key.trim().toLowerCase();
  if (clean === 'normal' || clean === 'standard') return 'Normal';
  
  return key
    .replace(/([A-Z0-9])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

/**
 * Determines the available variants for a card, sorting them in standard order.
 * If the card lacks TCGplayer price metadata, generates sensible fallback variants based on rarity.
 *
 * @param card - The API Pokémon card object
 * @returns Array of variant keys
 */
export function getCardVariants(card: ApiPokemonCard): string[] {
  // If we have the explicit TCGdex variants boolean map, use it!
  if (card.variants) {
    const keys: string[] = [];
    if (card.variants.normal) keys.push('normal');
    if (card.variants.holo) keys.push('holofoil');
    if (card.variants.reverse) keys.push('reverseHolofoil');
    if (card.variants.firstEdition) keys.push('1stEdition');
    if (card.variants.wPromo) keys.push('wPromo');

    if (keys.length > 0) return keys;
  }

  // Fallback 1: If card has tcgplayer prices, use those keys
  if (card.tcgplayer?.prices) {
    const keys = Object.keys(card.tcgplayer.prices);
    if (keys.length > 0) {
      const order = [
        'unlimited',
        'unlimitedNormal',
        'unlimitedHolofoil',
        'normal',
        'holofoil',
        'reverseHolofoil',
        '1stEdition',
        '1stEditionNormal',
        '1stEditionHolofoil',
      ];

      return keys.sort((a, b) => {
        const indexA = order.indexOf(a);
        const indexB = order.indexOf(b);
        if (indexA !== -1 && indexB !== -1) return indexA - indexB;
        if (indexA !== -1) return -1;
        if (indexB !== -1) return 1;
        return a.localeCompare(b);
      });
    }
  }

  // Fallback 2: derive variants based on rarity if tcgplayer metadata is missing
  const rarity = (card.rarity || '').toLowerCase();
  
  // Ultra rare categories (usually only have a Holofoil print style)
  if (
    rarity.includes('ultra') || 
    rarity.includes('secret') || 
    rarity.includes('illustration') || 
    rarity.includes('hyper') || 
    rarity.includes('double') ||
    rarity.includes('shiny ultra')
  ) {
    return ['holofoil'];
  }

  // Promo/Holo Rare cards (usually have Holofoil and Reverse Holofoil prints)
  if (rarity.includes('promo') || rarity.includes('holo') || rarity.includes('rare')) {
    return ['holofoil', 'reverseHolofoil'];
  }

  // Default cards (Normal print and Reverse Holofoil print)
  return ['normal', 'reverseHolofoil'];
}

/**
 * Finds the most appropriate default variant from a list of available variants.
 *
 * @param variants - Array of variant keys
 * @returns The default variant key, or empty string
 */
export function getDefaultVariant(variants: string[]): string {
  if (variants.length === 0 || (variants.length === 1 && variants[0] === '')) return '';
  return (
    variants.find((v) => v === 'unlimited') ||
    variants.find((v) => v === 'unlimitedNormal') ||
    variants.find((v) => v === 'normal') ||
    variants.find((v) => v === 'holofoil') ||
    variants.find((v) => v === 'reverseHolofoil') ||
    variants.find((v) => v === 'unlimitedHolofoil') ||
    variants.find((v) => v === '1stEdition') ||
    variants.find((v) => v === '1stEditionNormal') ||
    variants[0] ||
    ''
  );
}
