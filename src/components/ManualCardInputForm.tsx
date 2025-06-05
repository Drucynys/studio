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

const rarityOptions = ["Common", "Uncommon", "Rare", "Holo Rare", "Reverse Holo", "Amazing Rare", "Ultra Rare", "Secret Rare", "Promo", "Shiny Holo Rare", "Illustration Rare", "Special Illustration Rare"];
const conditionOptions = ["Mint", "Near Mint", "Excellent", "Good", "Lightly Played", "Played", "Poor", "Damaged"];

export function ManualCardInputForm({ onAddCard }: ManualCardInputFormProps) {
  const { toast } = useToast();
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
      value: values.value || 0, // Ensure value is a number
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
                  <FormControl>
                    <Input placeholder="e.g., Base Set, 151" {...field} />
                  </FormControl>
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
                  <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select rarity" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {rarityOptions.map(option => (
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
