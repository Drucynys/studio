
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
import { Input } from "@/components/ui/input"; // Added Input
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { PokemonCard } from "@/types";
import { FilePlus, Loader2, Layers } from "lucide-react"; // Changed icon, added Layers
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import Image from "next/image";

// Zod schema for form validation
const formSchema = z.object({
  selectedSetId: z.string().min(1, "Set is required"),
  selectedCardId: z.string().min(1, "Card is required"),
  condition: z.string().min(1, "Condition is required"),
  quantity: z.coerce.number().min(1, "Quantity must be at least 1"), // Added quantity
});

type ManualCardInputFormProps = {
  onAddCard: (card: PokemonCard) => void;
};

// Static condition options
const conditionOptions = ["Mint", "Near Mint", "Excellent", "Good", "Lightly Played", "Played", "Poor", "Damaged"];

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

// Helper to get a default market price (e.g., for 'normal' or 'holofoil')
const getDefaultMarketPrice = (apiCard: ApiPokemonCard | null): { value: number, variant?: string } => {
  if (!apiCard || !apiCard.tcgplayer?.prices) return { value: 0 };
  const prices = apiCard.tcgplayer.prices;
  
  const variantPriority = ['normal', 'holofoil', 'reverseHolofoil', '1stEditionNormal', '1stEditionHolofoil', 'unlimitedHolofoil', 'unlimitedNormal'];

  for (const variant of variantPriority) {
    if (prices[variant]?.market && typeof prices[variant]!.market === 'number') {
      return { value: prices[variant]!.market!, variant: variant };
    }
  }
  
  // Fallback to the first available market price
  for (const key in prices) {
    if (Object.prototype.hasOwnProperty.call(prices, key) && prices[key]?.market && typeof prices[key]!.market === 'number') {
      return { value: prices[key]!.market!, variant: key };
    }
  }
  return { value: 0 };
};


export function ManualCardInputForm({ onAddCard }: ManualCardInputFormProps) {
  const { toast } = useToast();
  
  const [availableSets, setAvailableSets] = useState<ApiSet[]>([]);
  const [isLoadingSets, setIsLoadingSets] = useState(true);
  const [errorSets, setErrorSets] = useState<string | null>(null);

  const [cardsInSelectedSet, setCardsInSelectedSet] = useState<ApiPokemonCard[]>([]);
  const [isLoadingCards, setIsLoadingCards] = useState(false);
  const [errorCards, setErrorCards] = useState<string | null>(null);

  const [selectedCardData, setSelectedCardData] = useState<ApiPokemonCard | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      selectedSetId: "",
      selectedCardId: "",
      condition: "",
      quantity: 1, // Default quantity
    },
  });

  const watchedSetId = form.watch("selectedSetId");
  const watchedCardId = form.watch("selectedCardId");

  useEffect(() => {
    const fetchSets = async () => {
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
        setAvailableSets((data.data as ApiSet[]).sort((a, b) => new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime()));
      } catch (err) {
        setErrorSets(err instanceof Error ? err.message : "An unknown error occurred");
        toast({ variant: "destructive", title: "Error fetching Sets", description: "Could not load sets." });
      } finally {
        setIsLoadingSets(false);
      }
    };
    fetchSets();
  }, [toast]);

  useEffect(() => {
    if (!watchedSetId) {
      setCardsInSelectedSet([]);
      setSelectedCardData(null);
      form.resetField("selectedCardId");
      return;
    }
    const fetchCardsForSet = async () => {
      setIsLoadingCards(true);
      setErrorCards(null);
      setSelectedCardData(null);
      form.resetField("selectedCardId", { defaultValue: "" });

      try {
        const headers: HeadersInit = {};
        if (process.env.NEXT_PUBLIC_POKEMONTCG_API_KEY) {
          headers['X-Api-Key'] = process.env.NEXT_PUBLIC_POKEMONTCG_API_KEY;
        }
        let allCards: ApiPokemonCard[] = [];
        let page = 1;
        let hasMore = true;
        
        while(hasMore) {
          const response = await fetch(`https://api.pokemontcg.io/v2/cards?q=set.id:${watchedSetId}&page=${page}&pageSize=250&orderBy=number`, { headers });
          if (!response.ok) throw new Error(`Failed to fetch cards for set ${watchedSetId}: ${response.statusText}`);
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

      } catch (err) {
        setErrorCards(err instanceof Error ? err.message : "An unknown error occurred");
        toast({ variant: "destructive", title: "Error fetching cards", description: `Could not load cards for the selected set.` });
      } finally {
        setIsLoadingCards(false);
      }
    };
    fetchCardsForSet();
  }, [watchedSetId, form, toast]);

  useEffect(() => {
    if (!watchedCardId) {
      setSelectedCardData(null);
      return;
    }
    const card = cardsInSelectedSet.find(c => c.id === watchedCardId);
    setSelectedCardData(card || null);
  }, [watchedCardId, cardsInSelectedSet, form]);


  function onSubmit(values: z.infer<typeof formSchema>) {
    const selectedSet = availableSets.find(s => s.id === values.selectedSetId);
    
    if (!selectedSet || !selectedCardData) {
      toast({ variant: "destructive", title: "Error", description: "Selected set or card data is missing." });
      return;
    }
    
    const { value: cardValue, variant: cardVariant } = getDefaultMarketPrice(selectedCardData);

    const newCard: PokemonCard = {
      id: crypto.randomUUID(), // This ID is temporary for local additions, will be different in MyCollectionPage
      set: selectedSet.name,
      cardNumber: selectedCardData.number,
      name: selectedCardData.name,
      rarity: selectedCardData.rarity || "N/A",
      variant: cardVariant, 
      condition: values.condition,
      imageUrl: selectedCardData.images.large,
      value: cardValue,
      quantity: values.quantity, // Use quantity from form
    };
    
    onAddCard(newCard); 

    // Reset specific fields, keep set selected for convenience
    form.reset({
        selectedSetId: values.selectedSetId, // Keep set selected
        selectedCardId: "",
        condition: "",
        quantity: 1, // Reset quantity to 1
    });
    setSelectedCardData(null); 
  }

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-2xl flex items-center gap-2">
          <FilePlus className="h-6 w-6 text-primary" />
          Manual Card Entry
        </CardTitle>
        <CardDescription>Select Set, Card, Condition, and Quantity.</CardDescription>
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
                    disabled={isLoadingSets || !!errorSets || availableSets.length === 0}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={
                          isLoadingSets ? "Loading sets..." : 
                          errorSets ? "Error loading sets" : 
                          availableSets.length === 0 ? "No sets available" : "Select set"
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
                    disabled={!watchedSetId || isLoadingCards || !!errorCards || cardsInSelectedSet.length === 0}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={
                          isLoadingCards ? "Loading cards..." :
                          !watchedSetId ? "Select a set first" :
                          errorCards ? "Error loading cards" :
                          cardsInSelectedSet.length === 0 && watchedSetId && !isLoadingCards ? "No cards in set" : "Select card"
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
                        <p><strong>Est. Value:</strong> ${getDefaultMarketPrice(selectedCardData).value.toFixed(2)}</p>
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
                  <Select onValueChange={field.onChange} value={field.value} disabled={!selectedCardData}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={!selectedCardData ? "Select card first" : "Select condition"} />
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
                      disabled={!selectedCardData}
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
              disabled={form.formState.isSubmitting || isLoadingSets || isLoadingCards || !form.formState.isValid}
            >
              {(form.formState.isSubmitting || isLoadingSets || isLoadingCards) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Card
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

