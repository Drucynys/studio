
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { PokemonCard } from "@/types";
import { PlusCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import Image from "next/image";

// Zod schema for form validation
const formSchema = z.object({
  selectedSetId: z.string().min(1, "Set is required"),
  selectedCardId: z.string().min(1, "Card is required"),
  condition: z.string().min(1, "Condition is required"),
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
      [key: string]: { // e.g., normal, holofoil, reverseHolofoil
        market?: number | null;
        low?: number | null;
        mid?: number | null;
        high?: number | null;
      };
    };
  };
}

// Helper to get market price, trying common variants
const getMarketPrice = (apiCard: ApiPokemonCard | null): number => {
  if (!apiCard || !apiCard.tcgplayer?.prices) return 0;
  const prices = apiCard.tcgplayer.prices;
  if (prices.normal?.market) return prices.normal.market;
  if (prices.holofoil?.market) return prices.holofoil.market;
  if (prices.reverseHolofoil?.market) return prices.reverseHolofoil.market;
  if (prices.firstEditionNormal?.market) return prices.firstEditionNormal.market;
  if (prices.firstEditionHolofoil?.market) return prices.firstEditionHolofoil.market;
  
  // Fallback to the first available market price
  for (const key in prices) {
    if (prices[key]?.market) {
      return prices[key]!.market!;
    }
  }
  return 0;
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
    },
  });

  const watchedSetId = form.watch("selectedSetId");
  const watchedCardId = form.watch("selectedCardId");

  useEffect(() => {
    const fetchSets = async () => {
      setIsLoadingSets(true);
      setErrorSets(null);
      try {
        const response = await fetch("https://api.pokemontcg.io/v2/sets?orderBy=-releaseDate");
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
        let allCards: ApiPokemonCard[] = [];
        let page = 1;
        let hasMore = true;
        
        while(hasMore) {
          const response = await fetch(`https://api.pokemontcg.io/v2/cards?q=set.id:${watchedSetId}&page=${page}&pageSize=250&orderBy=number`);
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

    const newCard: PokemonCard = {
      id: crypto.randomUUID(),
      set: selectedSet.name,
      cardNumber: selectedCardData.number,
      name: selectedCardData.name,
      rarity: selectedCardData.rarity || "N/A",
      condition: values.condition,
      imageUrl: selectedCardData.images.large,
      value: getMarketPrice(selectedCardData),
    };

    try {
      const storedCardsRaw = localStorage.getItem("pokemonCards");
      const storedCards: PokemonCard[] = storedCardsRaw ? JSON.parse(storedCardsRaw) : [];
      
      const isDuplicate = storedCards.some(
        item => item.name === newCard.name && 
                item.set === newCard.set && 
                item.cardNumber === newCard.cardNumber &&
                item.condition === newCard.condition
      );

      if (isDuplicate) {
        toast({
          variant: "destructive",
          title: "Duplicate Card",
          description: `${newCard.name} (${newCard.condition}) is already in your collection.`,
        });
        return; 
      }
      
      onAddCard(newCard); 
      toast({
        title: "Card Added!",
        description: `${newCard.name} (${newCard.condition}) from ${newCard.set} has been added.`,
        className: "bg-secondary text-secondary-foreground"
      });

      form.reset();
      setSelectedCardData(null); 
      setCardsInSelectedSet([]); 
      form.setValue("selectedSetId", ""); 
      
    } catch (e) {
      console.error("Failed to save card to localStorage", e);
      toast({
        variant: "destructive",
        title: "Storage Error",
        description: "Could not save card to your collection.",
      });
    }
  }

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-2xl flex items-center gap-2">
          <PlusCircle className="h-6 w-6 text-accent" />
          Add New Card
        </CardTitle>
        <CardDescription>Select Set, Card, and Condition to add to your collection.</CardDescription>
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
                        <p><strong>Est. Value:</strong> ${getMarketPrice(selectedCardData).toFixed(2)}</p>
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
            
            <Button 
              type="submit" 
              className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
              disabled={form.formState.isSubmitting || isLoadingSets || isLoadingCards || !form.formState.isValid}
            >
              {(form.formState.isSubmitting || isLoadingSets || isLoadingCards) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Card to Collection
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
