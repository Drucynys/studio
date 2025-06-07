
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { PokemonCard } from "@/types";
import type { ScanCardOutput } from "@/ai/flows/scan-card-flow";
import { FilePlus, Loader2, Layers, Languages } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState, useCallback } from "react";
import Image from "next/image";

const formSchema = z.object({
  selectedSetId: z.string().min(1, "Set is required"),
  selectedCardId: z.string().min(1, "Card is required"),
  language: z.enum(["English", "Japanese"], { required_error: "Language is required" }),
  condition: z.string().min(1, "Condition is required"),
  quantity: z.coerce.number().min(1, "Quantity must be at least 1"),
});

type ManualCardInputFormProps = {
  onAddCard: (card: PokemonCard) => void;
  initialScanData?: Partial<ScanCardOutput> | null;
};

const conditionOptions = ["Mint", "Near Mint", "Excellent", "Good", "Lightly Played", "Played", "Poor", "Damaged"];
const languageOptions: Array<'English' | 'Japanese'> = ["English", "Japanese"];

// Types for api.pokemontcg.io
interface ApiSet {
  id: string;
  name: string;
  series: string;
  releaseDate: string;
  images: {
    symbol: string;
    logo: string;
  };
}

interface ApiPokemonCard {
  id: string;
  name: string;
  set: {
    id: string;
    name: string;
    series: string;
  };
  number: string;
  rarity?: string;
  images: {
    small: string;
    large: string;
  };
  tcgplayer?: {
    prices?: {
      [key: string]: { 
        market?: number | null;
        low?: number | null;
        mid?: number | null;
        high?: number | null;
      };
    };
  };
}

// Types for TCGdex API (api.tcgdex.net)
interface TcgDexApiSet {
  id: string;
  name: string;
  logo?: string;
  releaseDate?: string;
  cardCount?: { official?: number; total?: number };
}

interface TcgDexApiCard {
  id: string; // e.g., "sv5k-1"
  name: string; // Japanese name
  image?: string; // Base URL for image, append '/low.webp' or '/high.webp'
  number: string;
  rarity: string;
  set: { id: string; name: string; logo?: string; }; // Simplified set info within card
}


const getDefaultMarketPrice = (apiCard: ApiPokemonCard | null): { value: number, variant?: string } => {
  if (!apiCard || !apiCard.tcgplayer?.prices) return { value: 0 };
  const prices = apiCard.tcgplayer.prices;
  const variantPriority = ['normal', 'holofoil', 'reverseHolofoil', '1stEditionNormal', '1stEditionHolofoil', 'unlimitedHolofoil', 'unlimitedNormal'];
  for (const variant of variantPriority) {
    if (prices[variant]?.market && typeof prices[variant]!.market === 'number') {
      return { value: prices[variant]!.market!, variant: variant };
    }
  }
  for (const key in prices) {
    if (Object.prototype.hasOwnProperty.call(prices, key) && prices[key]?.market && typeof prices[key]!.market === 'number') {
      return { value: prices[key]!.market!, variant: key };
    }
  }
  return { value: 0 };
};

const normalizeString = (str: string = ""): string => {
  return str.toLowerCase().replace(/[^a-z0-9\s]/gi, '').trim(); // Keep spaces for multi-word matching
};

export function ManualCardInputForm({ onAddCard, initialScanData }: ManualCardInputFormProps) {
  const { toast } = useToast();
  
  const [englishSets, setEnglishSets] = useState<ApiSet[]>([]);
  const [isLoadingEnglishSets, setIsLoadingEnglishSets] = useState(true);
  const [errorEnglishSets, setErrorEnglishSets] = useState<string | null>(null);

  const [cardsInSelectedEnglishSet, setCardsInSelectedEnglishSet] = useState<ApiPokemonCard[]>([]);
  const [isLoadingEnglishCards, setIsLoadingEnglishCards] = useState(false);
  const [errorEnglishCards, setErrorEnglishCards] = useState<string | null>(null);
  const [selectedEnglishCardData, setSelectedEnglishCardData] = useState<ApiPokemonCard | null>(null);

  const [japaneseSets, setJapaneseSets] = useState<TcgDexApiSet[]>([]);
  const [isLoadingJapaneseSets, setIsLoadingJapaneseSets] = useState(false);
  const [errorJapaneseSets, setErrorJapaneseSets] = useState<string | null>(null);

  const [cardsInSelectedJapaneseSet, setCardsInSelectedJapaneseSet] = useState<TcgDexApiCard[]>([]);
  const [isLoadingJapaneseCards, setIsLoadingJapaneseCards] = useState(false);
  const [errorJapaneseCards, setErrorJapaneseCards] = useState<string | null>(null);
  const [selectedJapaneseCardData, setSelectedJapaneseCardData] = useState<TcgDexApiCard | null>(null);
  
  const [isPreFilling, setIsPreFilling] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      selectedSetId: "",
      selectedCardId: "",
      language: "English",
      condition: "",
      quantity: 1,
    },
  });

  const watchedSetId = form.watch("selectedSetId");
  const watchedCardId = form.watch("selectedCardId");
  const watchedLanguage = form.watch("language");

  const fetchEnglishSets = useCallback(async () => {
    setIsLoadingEnglishSets(true);
    setErrorEnglishSets(null);
    try {
      const headers: HeadersInit = {};
      if (process.env.NEXT_PUBLIC_POKEMONTCG_API_KEY) {
        headers['X-Api-Key'] = process.env.NEXT_PUBLIC_POKEMONTCG_API_KEY;
      }
      const response = await fetch("https://api.pokemontcg.io/v2/sets?orderBy=-releaseDate", { headers });
      if (!response.ok) throw new Error(`Failed to fetch English sets: ${response.statusText}`);
      const data = await response.json();
      const sortedSets = (data.data as ApiSet[]).sort((a, b) => new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime());
      setEnglishSets(sortedSets);
      return sortedSets;
    } catch (err) {
      setErrorEnglishSets(err instanceof Error ? err.message : "An unknown error occurred");
      toast({ variant: "destructive", title: "Error fetching English Sets", description: "Could not load English sets." });
      return [];
    } finally {
      setIsLoadingEnglishSets(false);
    }
  }, [toast]);

  const fetchCardsForEnglishSet = useCallback(async (setId: string) => {
    if (!setId) return [];
    setIsLoadingEnglishCards(true);
    setErrorEnglishCards(null);
    try {
      const headers: HeadersInit = {};
      if (process.env.NEXT_PUBLIC_POKEMONTCG_API_KEY) {
        headers['X-Api-Key'] = process.env.NEXT_PUBLIC_POKEMONTCG_API_KEY;
      }
      let allCards: ApiPokemonCard[] = [];
      let page = 1; let hasMore = true;
      while(hasMore) {
        const response = await fetch(`https://api.pokemontcg.io/v2/cards?q=set.id:${setId}&page=${page}&pageSize=250&orderBy=number`, { headers });
        if (!response.ok) throw new Error(`Failed to fetch cards for set ${setId}: ${response.statusText}`);
        const data = await response.json();
        allCards = allCards.concat(data.data as ApiPokemonCard[]);
        page++; hasMore = data.page * data.pageSize < data.totalCount;
      }
      allCards.sort((a, b) => {
          const numA = parseInt(a.number.replace(/\D/g, ''), 10) || 0;
          const numB = parseInt(b.number.replace(/\D/g, ''), 10) || 0;
          const suffixA = a.number.replace(/\d/g, '');
          const suffixB = b.number.replace(/\d/g, '');
          if (numA === numB) return suffixA.localeCompare(suffixB);
          return numA - numB;
      });
      setCardsInSelectedEnglishSet(allCards);
      return allCards;
    } catch (err) {
      setErrorEnglishCards(err instanceof Error ? err.message : "An unknown error occurred");
      toast({ variant: "destructive", title: "Error fetching English cards", description: `Could not load cards for the selected set.` });
      setCardsInSelectedEnglishSet([]);
      return [];
    } finally {
      setIsLoadingEnglishCards(false);
    }
  }, [toast]);

  const fetchJapaneseSets = useCallback(async () => {
    setIsLoadingJapaneseSets(true);
    setErrorJapaneseSets(null);
    try {
      const response = await fetch("https://api.tcgdex.net/v2/jp/sets");
      if (!response.ok) throw new Error(`Failed to fetch Japanese sets: ${response.statusText}`);
      const data: TcgDexApiSet[] = await response.json();
      // TCGdex sets are often already sorted by release date (newest first) or ID
      const sortedData = data.sort((a,b) => (b.releaseDate && a.releaseDate) ? new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime() : a.name.localeCompare(b.name));
      setJapaneseSets(sortedData);
      return sortedData;
    } catch (err) {
      setErrorJapaneseSets(err instanceof Error ? err.message : "An unknown error occurred");
      toast({ variant: "destructive", title: "Error fetching Japanese Sets", description: "Could not load Japanese sets." });
      return [];
    } finally {
      setIsLoadingJapaneseSets(false);
    }
  }, [toast]);

  const fetchCardsForJapaneseSet = useCallback(async (setId: string) => {
    if (!setId) return [];
    setIsLoadingJapaneseCards(true);
    setErrorJapaneseCards(null);
    try {
      const response = await fetch(`https://api.tcgdex.net/v2/jp/sets/${setId}/cards`);
      if (!response.ok) throw new Error(`Failed to fetch Japanese cards for set ${setId}: ${response.statusText}`);
      const data: TcgDexApiCard[] = await response.json();
      // TCGdex cards are usually sorted by number
      const sortedData = data.sort((a,b) => {
        const numA = parseInt(a.number.replace(/\D/g, ''), 10) || 0;
        const numB = parseInt(b.number.replace(/\D/g, ''), 10) || 0;
        // TCGdex might use simple numbers, or alphanumeric like "001a"
        if (numA !== numB) return numA - numB;
        return a.number.localeCompare(b.number);
      });
      setCardsInSelectedJapaneseSet(sortedData);
      return sortedData;
    } catch (err) {
      setErrorJapaneseCards(err instanceof Error ? err.message : "An unknown error occurred");
      toast({ variant: "destructive", title: "Error fetching Japanese cards", description: `Could not load cards for the selected Japanese set.` });
      setCardsInSelectedJapaneseSet([]);
      return [];
    } finally {
      setIsLoadingJapaneseCards(false);
    }
  }, [toast]);

  // Initial fetch based on default language (English)
  useEffect(() => {
    if (watchedLanguage === "English") {
      fetchEnglishSets();
    } else {
      fetchJapaneseSets();
    }
  }, [watchedLanguage, fetchEnglishSets, fetchJapaneseSets]);

  // Effect for pre-filling from initialScanData
  useEffect(() => {
    const preFillForm = async () => {
      if (!initialScanData || isPreFilling) return;
      
      setIsPreFilling(true);

      const scannedLang = initialScanData.language === "Japanese" ? "Japanese" : "English";
      form.setValue("language", scannedLang, { shouldValidate: true });

      // Wait for the correct set list to load if language changed
      let currentSets: ApiSet[] | TcgDexApiSet[] = [];
      if (scannedLang === "English") {
        if (englishSets.length === 0 && !isLoadingEnglishSets) currentSets = await fetchEnglishSets();
        else currentSets = englishSets;
      } else {
        if (japaneseSets.length === 0 && !isLoadingJapaneseSets) currentSets = await fetchJapaneseSets();
        else currentSets = japaneseSets;
      }
      
      if (currentSets.length === 0) {
        setIsPreFilling(false);
        return;
      }

      let matchedSetId: string | undefined = undefined;
      if (initialScanData.set) {
        const normalizedScanSet = normalizeString(initialScanData.set);
        const foundSet = currentSets.find(s => normalizeString(s.name).includes(normalizedScanSet) || normalizeString(s.id).includes(normalizedScanSet));
        if (foundSet) {
          form.setValue("selectedSetId", foundSet.id, { shouldValidate: true });
          matchedSetId = foundSet.id;
        } else {
          toast({ title: "Scan Info", description: `Could not auto-match set "${initialScanData.set}" for ${scannedLang} cards. Please select manually.`});
        }
      }
        
      if (matchedSetId && (initialScanData.name || initialScanData.cardNumber)) {
        let currentCardsInSet: ApiPokemonCard[] | TcgDexApiCard[] = [];
        if (scannedLang === "English") {
          currentCardsInSet = await fetchCardsForEnglishSet(matchedSetId);
        } else {
          currentCardsInSet = await fetchCardsForJapaneseSet(matchedSetId);
        }

        if (currentCardsInSet.length > 0) {
          const normalizedScanName = normalizeString(initialScanData.name);
          const normalizedScanCardNumber = normalizeString(initialScanData.cardNumber);

          const foundCard = currentCardsInSet.find(c => 
            (normalizedScanName && normalizeString(c.name).includes(normalizedScanName)) ||
            (normalizedScanCardNumber && normalizeString(c.number) === normalizedScanCardNumber)
          );

          if (foundCard) {
            form.setValue("selectedCardId", foundCard.id, { shouldValidate: true });
          } else {
            toast({ title: "Scan Info", description: `Could not auto-match card "${initialScanData.name || initialScanData.cardNumber}" for ${scannedLang} language. Please select manually.`});
          }
        }
      }
      setIsPreFilling(false);
    };

    if (initialScanData && ((watchedLanguage === "English" && englishSets.length > 0) || (watchedLanguage === "Japanese" && japaneseSets.length > 0))) {
      preFillForm();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialScanData, englishSets, japaneseSets, isLoadingEnglishSets, isLoadingJapaneseSets, form.setValue, toast, fetchCardsForEnglishSet, fetchCardsForJapaneseSet, watchedLanguage]);


  // Fetch cards when set ID changes (manual selection)
  useEffect(() => {
    if (!watchedSetId || isPreFilling) {
      if (!isPreFilling) { // Only clear if not pre-filling
        if (watchedLanguage === "English") {
          setCardsInSelectedEnglishSet([]);
          setSelectedEnglishCardData(null);
        } else {
          setCardsInSelectedJapaneseSet([]);
          setSelectedJapaneseCardData(null);
        }
        form.resetField("selectedCardId");
      }
      return;
    }

    if (watchedLanguage === "English") {
      if (watchedSetId !== selectedEnglishCardData?.set.id) {
        fetchCardsForEnglishSet(watchedSetId);
      }
    } else { // Japanese
       if (watchedSetId !== selectedJapaneseCardData?.set.id) {
        fetchCardsForJapaneseSet(watchedSetId);
      }
    }
  }, [watchedSetId, watchedLanguage, form, fetchCardsForEnglishSet, fetchCardsForJapaneseSet, isPreFilling, selectedEnglishCardData, selectedJapaneseCardData]);

  // Update selected card data when card ID changes
  useEffect(() => {
    if (!watchedCardId || isPreFilling) {
      if (!isPreFilling && !watchedSetId) { // only clear if not prefilling and no set selected
         setSelectedEnglishCardData(null);
         setSelectedJapaneseCardData(null);
      }
      return;
    }
    if (watchedLanguage === "English") {
      const card = cardsInSelectedEnglishSet.find(c => c.id === watchedCardId);
      setSelectedEnglishCardData(card || null);
      setSelectedJapaneseCardData(null);
    } else { // Japanese
      const card = cardsInSelectedJapaneseSet.find(c => c.id === watchedCardId);
      setSelectedJapaneseCardData(card || null);
      setSelectedEnglishCardData(null);
    }
  }, [watchedCardId, cardsInSelectedEnglishSet, cardsInSelectedJapaneseSet, watchedLanguage, isPreFilling, watchedSetId]);


  function onSubmit(values: z.infer<typeof formSchema>) {
    let cardToSave: PokemonCard;

    if (values.language === "English") {
      const selectedSet = englishSets.find(s => s.id === values.selectedSetId);
      if (!selectedSet || !selectedEnglishCardData) {
        toast({ variant: "destructive", title: "Error", description: "Selected English set or card data is missing." });
        return;
      }
      const { value: cardValue, variant: cardVariant } = getDefaultMarketPrice(selectedEnglishCardData);
      cardToSave = {
        id: crypto.randomUUID(),
        set: selectedSet.name,
        cardNumber: selectedEnglishCardData.number,
        name: selectedEnglishCardData.name,
        rarity: selectedEnglishCardData.rarity || initialScanData?.rarity || "N/A",
        language: values.language,
        variant: cardVariant, 
        condition: values.condition,
        imageUrl: selectedEnglishCardData.images.large,
        value: cardValue,
        quantity: values.quantity,
      };
    } else { // Japanese
      const selectedSet = japaneseSets.find(s => s.id === values.selectedSetId);
      if (!selectedSet || !selectedJapaneseCardData) {
        toast({ variant: "destructive", title: "Error", description: "Selected Japanese set or card data is missing." });
        return;
      }
      cardToSave = {
        id: crypto.randomUUID(),
        set: selectedSet.name, // Japanese set name
        cardNumber: selectedJapaneseCardData.number,
        name: selectedJapaneseCardData.name, // Japanese card name
        rarity: selectedJapaneseCardData.rarity || initialScanData?.rarity || "N/A",
        language: values.language,
        variant: undefined, // TCGdex doesn't provide variants in the same way, assume standard
        condition: values.condition,
        imageUrl: selectedJapaneseCardData.image ? `${selectedJapaneseCardData.image}/high.webp` : undefined,
        value: 0, // No pricing from TCGdex in this structure, default to 0
        quantity: values.quantity,
      };
    }
    
    onAddCard(cardToSave); 

    form.reset({
      selectedSetId: values.selectedSetId, // Keep set selected if user wants to add more from same set
      selectedCardId: "",
      language: values.language, 
      condition: "",
      quantity: 1,
    });
    setSelectedEnglishCardData(null); 
    setSelectedJapaneseCardData(null);
  }
  
  const currentCardDisplayData = watchedLanguage === 'English' ? selectedEnglishCardData : selectedJapaneseCardData;
  const currentSets = watchedLanguage === 'English' ? englishSets : japaneseSets;
  const isLoadingCurrentSets = watchedLanguage === 'English' ? isLoadingEnglishSets : isLoadingJapaneseSets;
  const errorCurrentSets = watchedLanguage === 'English' ? errorEnglishSets : errorJapaneseSets;
  const currentCardsInSet = watchedLanguage === 'English' ? cardsInSelectedEnglishSet : cardsInSelectedJapaneseSet;
  const isLoadingCurrentCards = watchedLanguage === 'English' ? isLoadingEnglishCards : isLoadingJapaneseCards;
  const errorCurrentCards = watchedLanguage === 'English' ? errorEnglishCards : errorJapaneseCards;
  
  const isUIDisabled = form.formState.isSubmitting || isLoadingCurrentSets || isLoadingCurrentCards || isPreFilling;

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-2xl flex items-center gap-2">
          <FilePlus className="h-6 w-6 text-primary" />
          Manual Card Entry
        </CardTitle>
        <CardDescription>Select Language, Set, Card, Condition, and Quantity. Scanner may pre-fill some fields.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="language"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-1"><Languages className="h-4 w-4 text-blue-500"/> Language</FormLabel>
                  <Select 
                    onValueChange={(value: 'English' | 'Japanese') => {
                      field.onChange(value);
                      // Reset dependent fields when language changes
                      form.resetField("selectedSetId", { defaultValue: "" });
                      form.resetField("selectedCardId", { defaultValue: "" });
                      setSelectedEnglishCardData(null);
                      setSelectedJapaneseCardData(null);
                      setCardsInSelectedEnglishSet([]);
                      setCardsInSelectedJapaneseSet([]);
                      // Trigger fetch for the new language's sets in useEffect
                    }} 
                    value={field.value} 
                    disabled={isPreFilling}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select language" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {languageOptions.map(option => (
                        <SelectItem key={option} value={option}>{option}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="selectedSetId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Set</FormLabel>
                  <Select 
                    onValueChange={(value) => {
                      field.onChange(value);
                      form.resetField("selectedCardId", { defaultValue: "" }); 
                      setSelectedEnglishCardData(null);
                      setSelectedJapaneseCardData(null);
                      if (watchedLanguage === "English") setCardsInSelectedEnglishSet([]); else setCardsInSelectedJapaneseSet([]);
                    }}
                    value={field.value}
                    disabled={isLoadingCurrentSets || !!errorCurrentSets || currentSets.length === 0 || isPreFilling}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={
                          isLoadingCurrentSets ? `Loading ${watchedLanguage} sets...` : 
                          errorCurrentSets ? `Error loading ${watchedLanguage} sets` : 
                          currentSets.length === 0 ? `No ${watchedLanguage} sets available` : `Select ${watchedLanguage} set`
                        } />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {!isLoadingCurrentSets && !errorCurrentSets && currentSets.map(set => (
                        <SelectItem key={set.id} value={set.id}>{set.name} ({set.id.toUpperCase()})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="selectedCardId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Card</FormLabel>
                  <Select 
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={!watchedSetId || isLoadingCurrentCards || !!errorCurrentCards || currentCardsInSet.length === 0 || isPreFilling}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={
                          isPreFilling && watchedLanguage ? `Pre-filling ${watchedLanguage} card...` :
                          isLoadingCurrentCards ? `Loading ${watchedLanguage} cards...` :
                          !watchedSetId ? "Select a set first" :
                          errorCurrentCards ? `Error loading ${watchedLanguage} cards` :
                          currentCardsInSet.length === 0 && watchedSetId && !isLoadingCurrentCards ? `No ${watchedLanguage} cards in set` : `Select ${watchedLanguage} card`
                        } />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="max-h-72">
                      {!isLoadingCurrentCards && !errorCurrentCards && currentCardsInSet.map(card => (
                        <SelectItem key={card.id} value={card.id}>{card.name} - #{card.number}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {currentCardDisplayData && (
              <Card className="p-4 bg-muted/50">
                <CardTitle className="text-lg mb-2">{currentCardDisplayData.name} #{currentCardDisplayData.number}</CardTitle>
                <div className="flex gap-4 items-start">
                  {( (watchedLanguage === 'English' && (currentCardDisplayData as ApiPokemonCard).images?.small) || (watchedLanguage === 'Japanese' && (currentCardDisplayData as TcgDexApiCard).image) ) && (
                    <div className="relative w-24 h-32 flex-shrink-0" data-ai-hint="pokemon card front">
                      <Image 
                        src={watchedLanguage === 'English' ? (currentCardDisplayData as ApiPokemonCard).images.small : `${(currentCardDisplayData as TcgDexApiCard).image}/low.webp`} 
                        alt={currentCardDisplayData.name} 
                        layout="fill" objectFit="contain" className="rounded-sm"/>
                    </div>
                  )}
                  <div className="text-sm space-y-1">
                    <p><strong>Set:</strong> {watchedLanguage === 'English' ? (currentCardDisplayData as ApiPokemonCard).set.name : (currentCardDisplayData as TcgDexApiCard).set.name}</p>
                    <p><strong>Rarity:</strong> {currentCardDisplayData.rarity || "N/A"}</p>
                    {watchedLanguage === 'English' && (currentCardDisplayData as ApiPokemonCard).tcgplayer?.prices && (
                        <p><strong>Est. Value (English):</strong> ${getDefaultMarketPrice(currentCardDisplayData as ApiPokemonCard).value.toFixed(2)}</p>
                    )}
                     {watchedLanguage === 'Japanese' && (
                        <p className="text-xs italic">Market value for Japanese cards from TCGdex not available via API.</p>
                    )}
                  </div>
                </div>
              </Card>
            )}

            <FormField
              control={form.control}
              name="condition"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Condition</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={!currentCardDisplayData || isPreFilling}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={!currentCardDisplayData ? "Select card first" : "Select condition"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {conditionOptions.map(option => (
                        <SelectItem key={option} value={option}>{option}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-1"><Layers className="h-4 w-4 text-purple-500"/>Quantity</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      min="1" 
                      {...field} 
                      disabled={!currentCardDisplayData || isPreFilling}
                      onChange={event => field.onChange(parseInt(event.target.value, 10) || 1)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <Button 
              type="submit" 
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
              disabled={isUIDisabled || !form.formState.isValid}
            >
              {(isUIDisabled && !form.formState.isSubmitting) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Card
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

