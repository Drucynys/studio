
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PokemonCard } from "@/types";
import { PlusCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";

const formSchema = z.object({
  set: z.string().min(1, "Set is required"),
  cardNumber: z.string().min(1, "Card number is required"),
  name: z.string().optional(),
  rarity: z.string().min(1, "Rarity is required"),
  condition: z.string().min(1, "Condition is required"),
  value: z.coerce.number().min(0, "Value must be non-negative").optional().default(0),
});

type ManualCardInputFormProps = {
  onAddCard: (card: PokemonCard) => void;
};

// Condition options remain static as they are subjective user inputs
const conditionOptions = ["Mint", "Near Mint", "Excellent", "Good", "Lightly Played", "Played", "Poor", "Damaged"];

interface ApiSet {
  id: string;
  name: string;
  series: string;
  printedTotal: number;
  total: number;
  releaseDate: string;
  updatedAt: string;
  images: {
    symbol: string;
    logo: string;
  };
}

export function ManualCardInputForm({ onAddCard }: ManualCardInputFormProps) {
  const { toast } = useToast();
  const [availableSets, setAvailableSets] = useState<ApiSet[]>([]);
  const [availableRarities, setAvailableRarities] = useState<string[]>([]);
  const [isLoadingSets, setIsLoadingSets] = useState(true);
  const [isLoadingRarities, setIsLoadingRarities] = useState(true);
  const [errorSets, setErrorSets] = useState<string | null>(null);
  const [errorRarities, setErrorRarities] = useState<string | null>(null);

  useEffect(() => {
    const fetchSets = async () => {
      setIsLoadingSets(true);
      setErrorSets(null);
      try {
        const response = await fetch("https://api.pokemontcg.io/v2/sets");
        if (!response.ok) {
          throw new Error(`Failed to fetch sets: ${response.statusText}`);
        }
        const data = await response.json();
        // Sort sets by release date, newest first
        const sortedSets = (data.data as ApiSet[]).sort((a, b) => new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime());
        setAvailableSets(sortedSets);
      } catch (error) {
        console.error("Error fetching sets:", error);
        setErrorSets(error instanceof Error ? error.message : "An unknown error occurred");
        toast({
          variant: "destructive",
          title: "Error fetching Sets",
          description: "Could not load Pokémon TCG sets. Please try again later.",
        });
      } finally {
        setIsLoadingSets(false);
      }
    };

    const fetchRarities = async () => {
      setIsLoadingRarities(true);
      setErrorRarities(null);
      try {
        const response = await fetch("https://api.pokemontcg.io/v2/rarities");
        if (!response.ok) {
          throw new Error(`Failed to fetch rarities: ${response.statusText}`);
        }
        const data = await response.json();
        setAvailableRarities(data.data || []);
      } catch (error) {
        console.error("Error fetching rarities:", error);
        setErrorRarities(error instanceof Error ? error.message : "An unknown error occurred");
        toast({
          variant: "destructive",
          title: "Error fetching Rarities",
          description: "Could not load Pokémon TCG rarities. Please try again later.",
        });
      } finally {
        setIsLoadingRarities(false);
      }
    };

    fetchSets();
    fetchRarities();
  }, [toast]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      set: "",
      cardNumber: "",
      name: "",
      rarity: "",
      condition: "",
      value: 0,
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    const newCard: PokemonCard = {
      id: crypto.randomUUID(),
      ...values,
      value: values.value || 0, 
    };
    onAddCard(newCard);
    toast({
      title: "Card Added!",
      description: `${values.name || `${values.set} ${values.cardNumber}`} has been added to your collection.`,
      className: "bg-secondary text-secondary-foreground"
    });
    form.reset();
  }

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-2xl flex items-center gap-2">
          <PlusCircle className="h-6 w-6 text-accent" />
          Add New Card
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="set"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Set</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value} 
                    value={field.value}
                    disabled={isLoadingSets || !!errorSets || availableSets.length === 0}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={
                          isLoadingSets ? "Loading sets..." : 
                          errorSets ? "Error loading sets" : 
                          availableSets.length === 0 ? "No sets available" :
                          "Select set"
                        } />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {!isLoadingSets && !errorSets && availableSets.map(set => (
                        <SelectItem key={set.id} value={set.name}>{set.name} ({set.id.toUpperCase()})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="cardNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Card Number</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., 4/102, 052/165" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Card Name (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Charizard, Pikachu" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="rarity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rarity</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value} 
                    value={field.value}
                    disabled={isLoadingRarities || !!errorRarities || availableRarities.length === 0}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={
                          isLoadingRarities ? "Loading rarities..." : 
                          errorRarities ? "Error loading rarities" : 
                          availableRarities.length === 0 ? "No rarities available" :
                          "Select rarity"
                        } />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {!isLoadingRarities && !errorRarities && availableRarities.map(option => (
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
                  <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select condition" />
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
              name="value"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Value ($)</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="e.g., 10.50" {...field} step="0.01" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
              <PlusCircle className="mr-2 h-4 w-4" /> Add Card to Collection
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

    