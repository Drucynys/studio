
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
  initialScanData?: Partial<ScanCardOutput> | null; // Optional prop for scanned data
};

const conditionOptions = ["Mint", "Near Mint", "Excellent", "Good", "Lightly Played", "Played", "Poor", "Damaged"];
const languageOptions: Array<'English' | 'Japanese'> = ["English", "Japanese"];


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

// Helper to normalize strings for matching
const normalizeString = (str: string = ""): string => {
  return str.toLowerCase().replace(/[^a-z0-9]/gi, '');
};


export function ManualCardInputForm({ onAddCard, initialScanData }: ManualCardInputFormProps) {
  const { toast } = useToast();
  
  const [availableSets, setAvailableSets] = useState<ApiSet[]>([]);
  const [isLoadingSets, setIsLoadingSets] = useState(true);
  const [errorSets, setErrorSets] = useState<string | null>(null);

  const [cardsInSelectedSet, setCardsInSelectedSet] = useState<ApiPokemonCard[]>([]);
  const [isLoadingCards, setIsLoadingCards] = useState(false);
  const [errorCards, setErrorCards] = useState<string | null>(null);

  const [selectedCardData, setSelectedCardData] = useState<ApiPokemonCard | null>(null);
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


  const fetchSets = useCallback(async () => {
    setIsLoadingSets(true);
    setErrorSets(null);
    try {
      const headers: HeadersInit = {};
      if (process.env.NEXT_PUBLIC_POKEMONTCG_API_KEY) {
        headers['X-Api-Key'] = process.env.NEXT_PUBLIC_POKEMONTCG_API_KEY;
      }
      const response = await fetch("https://api.pokemontcg.io/v2/sets?orderBy=-releaseDate", { headers });
      if (!response.ok) throw new Error(`Failed to fetch sets: ${response.statusText}`);
      const data = await response.json();
      const sortedSets = (data.data as ApiSet[]).sort((a, b) => new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime());
      setAvailableSets(sortedSets);
      return sortedSets; // Return sets for chained useEffect
    } catch (err) {
      setErrorSets(err instanceof Error ? err.message : "An unknown error occurred");
      toast({ variant: "destructive", title: "Error fetching Sets", description: "Could not load sets." });
      return [];
    } finally {
      setIsLoadingSets(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchSets();
  }, [fetchSets]);

  const fetchCardsForSet = useCallback(async (setId: string) => {
    if (!setId) return [];
    setIsLoadingCards(true);
    setErrorCards(null);
    // setSelectedCardData(null); // Don't reset this if we are trying to pre-fill
    // form.resetField("selectedCardId", { defaultValue: "" }); // Don't reset this

    try {
      const headers: HeadersInit = {};
      if (process.env.NEXT_PUBLIC_POKEMONTCG_API_KEY) {
        headers['X-Api-Key'] = process.env.NEXT_PUBLIC_POKEMONTCG_API_KEY;
      }
      let allCards: ApiPokemonCard[] = [];
      let page = 1;
      let hasMore = true;
      
      while(hasMore) {
        const response = await fetch(`https://api.pokemontcg.io/v2/cards?q=set.id:${setId}&page=${page}&pageSize=250&orderBy=number`, { headers });
        if (!response.ok) throw new Error(`Failed to fetch cards for set ${setId}: ${response.statusText}`);
        const data = await response.json();
        allCards = allCards.concat(data.data as ApiPokemonCard[]);
        page++;
        hasMore = data.page * data.pageSize < data.totalCount;
      }
      
      allCards.sort((a, b) => {
          const numA = parseInt(a.number.replace(/\D/g, ''), 10) || 0;
          const numB = parseInt(b.number.replace(/\D/g, ''), 10) || 0;
          const suffixA = a.number.replace(/\d/g, '');
          const suffixB = b.number.replace(/\d/g, '');
          if (numA === numB) return suffixA.localeCompare(suffixB);
          return numA - numB;
      });
      setCardsInSelectedSet(allCards);
      return allCards; // Return cards for chained useEffect
    } catch (err) {
      setErrorCards(err instanceof Error ? err.message : "An unknown error occurred");
      toast({ variant: "destructive", title: "Error fetching cards", description: `Could not load cards for the selected set.` });
      setCardsInSelectedSet([]);
      return [];
    } finally {
      setIsLoadingCards(false);
    }
  }, [toast]);


  // Effect for pre-filling from initialScanData
  useEffect(() => {
    const preFillForm = async () => {
      if (initialScanData && availableSets.length > 0 && !isLoadingSets) {
        setIsPreFilling(true);
        let matchedSetId: string | undefined = undefined;

        if (initialScanData.language && (initialScanData.language === 'English' || initialScanData.language === 'Japanese')) {
          form.setValue("language", initialScanData.language, { shouldValidate: true });
        } else {
          form.setValue("language", "English", { shouldValidate: true }); // Default if scanner unsure
        }

        if (initialScanData.set) {
          const normalizedScanSet = normalizeString(initialScanData.set);
          const foundSet = availableSets.find(s => normalizeString(s.name).includes(normalizedScanSet) || normalizeString(s.id).includes(normalizedScanSet));
          if (foundSet) {
            form.setValue("selectedSetId", foundSet.id, { shouldValidate: true });
            matchedSetId = foundSet.id;
          } else {
            toast({ title: "Scan Info", description: `Could not auto-match set "${initialScanData.set}". Please select manually.`});
          }
        }
        
        if (matchedSetId && (initialScanData.name || initialScanData.cardNumber)) {
            // Wait for cards of the matched set to be loaded if necessary
            let currentCardsInSet = cardsInSelectedSet;
            if (watchedSetId !== matchedSetId || cardsInSelectedSet.length === 0) {
                 // Fetch cards if not already loaded for the pre-filled set
                currentCardsInSet = await fetchCardsForSet(matchedSetId);
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
                    toast({ title: "Scan Info", description: `Could not auto-match card "${initialScanData.name || initialScanData.cardNumber}". Please select manually.`});
                }
            }
        }
        setIsPreFilling(false);
      }
    };
    preFillForm();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialScanData, availableSets, isLoadingSets, form.setValue, toast, fetchCardsForSet]);


  useEffect(() => {
    if (!watchedSetId || isPreFilling) { // Prevent fetching if pre-filling or no set selected
      if(!isPreFilling) { // only clear if not prefilling
        setCardsInSelectedSet([]);
        setSelectedCardData(null);
        form.resetField("selectedCardId");
      }
      return;
    }
    // This effect now primarily handles manual set changes
    if (watchedSetId !== selectedCardData?.set.id) { // Only fetch if set actually changed from current card
        fetchCardsForSet(watchedSetId);
    }
  }, [watchedSetId, form, fetchCardsForSet, isPreFilling, selectedCardData]);


  useEffect(() => {
    if (!watchedCardId || isPreFilling) { // Prevent update if pre-filling
      if(!isPreFilling && !watchedSetId) setSelectedCardData(null); // only clear if not prefilling and no set selected
      return;
    }
    const card = cardsInSelectedSet.find(c => c.id === watchedCardId);
    setSelectedCardData(card || null);
  }, [watchedCardId, cardsInSelectedSet, isPreFilling, watchedSetId]);


  function onSubmit(values: z.infer<typeof formSchema>) {
    const selectedSet = availableSets.find(s => s.id === values.selectedSetId);
    
    if (!selectedSet || !selectedCardData) {
      toast({ variant: "destructive", title: "Error", description: "Selected set or card data is missing." });
      return;
    }
    
    const { value: cardValue, variant: cardVariant } = getDefaultMarketPrice(selectedCardData);

    const newCard: PokemonCard = {
      id: crypto.randomUUID(),
      set: selectedSet.name, // English set name from API
      cardNumber: selectedCardData.number,
      name: selectedCardData.name, // English card name from API
      rarity: selectedCardData.rarity || initialScanData?.rarity || "N/A",
      language: values.language, // User selected language
      variant: cardVariant, 
      condition: values.condition,
      imageUrl: selectedCardData.images.large,
      value: cardValue, // Based on English card API data
      quantity: values.quantity,
    };
    
    onAddCard(newCard); 

    form.reset({
        selectedSetId: values.selectedSetId, // Keep set selected
        selectedCardId: "",
        language: values.language, // Keep language selected
        condition: "",
        quantity: 1,
    });
    setSelectedCardData(null); 
  }

  const isUIDisabled = form.formState.isSubmitting || isLoadingSets || isLoadingCards || isPreFilling;

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-2xl flex items-center gap-2">
          <FilePlus className="h-6 w-6 text-primary" />
          Manual Card Entry
        </CardTitle>
        <CardDescription>Select Set, Card, Language, Condition, and Quantity. Scanner may pre-fill some fields.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                      setSelectedCardData(null);
                      setCardsInSelectedSet([]); 
                    }}
                    value={field.value}
                    disabled={isLoadingSets || !!errorSets || availableSets.length === 0 || isPreFilling}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={
                          isLoadingSets ? "Loading sets..." : 
                          errorSets ? "Error loading sets" : 
                          availableSets.length === 0 ? "No sets available" : "Select set (English name)"
                        } />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {!isLoadingSets && !errorSets && availableSets.map(set => (
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
                    disabled={!watchedSetId || isLoadingCards || !!errorCards || cardsInSelectedSet.length === 0 || isPreFilling}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={
                          isPreFilling ? "Pre-filling..." :
                          isLoadingCards ? "Loading cards..." :
                          !watchedSetId ? "Select a set first" :
                          errorCards ? "Error loading cards" :
                          cardsInSelectedSet.length === 0 && watchedSetId && !isLoadingCards ? "No cards in set" : "Select card (English name)"
                        } />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="max-h-72">
                      {!isLoadingCards && !errorCards && cardsInSelectedSet.map(card => (
                        <SelectItem key={card.id} value={card.id}>{card.name} - #{card.number}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {selectedCardData && (
              <Card className="p-4 bg-muted/50">
                <CardTitle className="text-lg mb-2">{selectedCardData.name} #{selectedCardData.number}</CardTitle>
                <div className="flex gap-4 items-start">
                  {selectedCardData.images.small && (
                    <div className="relative w-24 h-32 flex-shrink-0" data-ai-hint="pokemon card front">
                      <Image src={selectedCardData.images.small} alt={selectedCardData.name} layout="fill" objectFit="contain" className="rounded-sm"/>
                    </div>
                  )}
                  <div className="text-sm space-y-1">
                    <p><strong>Set:</strong> {selectedCardData.set.name}</p>
                    <p><strong>Rarity:</strong> {selectedCardData.rarity || "N/A"}</p>
                    {selectedCardData.tcgplayer?.prices && (
                        <p><strong>Est. Value (English):</strong> ${getDefaultMarketPrice(selectedCardData).value.toFixed(2)}</p>
                    )}
                  </div>
                </div>
              </Card>
            )}

            <FormField
              control={form.control}
              name="language"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-1"><Languages className="h-4 w-4 text-blue-500"/> Language</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    value={field.value} 
                    disabled={isPreFilling || !selectedCardData}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={!selectedCardData ? "Select card first" : "Select language"} />
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
              name="condition"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Condition</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={!selectedCardData || isPreFilling}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={!selectedCardData ? "Select language first" : "Select condition"} />
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
                      disabled={!selectedCardData || isPreFilling}
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
