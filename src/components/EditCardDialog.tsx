"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PokemonCard } from "@/types";
import { Gem, DollarSign, Layers, Languages, RefreshCw, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type EditCardDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  card: PokemonCard | null;
  onSave: (updatedCard: PokemonCard) => void;
};

const languageOptions: Array<'English' | 'Japanese'> = ["English", "Japanese"];

const formatDisplayVariant = (variantKey?: string): string | null => {
  if (!variantKey) return null;
  return variantKey
    .replace(/([A-Z0-9])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
};

const getMarketPrice = (apiCard: any, variant?: string | null): number => {
  if (!apiCard || !apiCard.tcgplayer?.prices) return 0;
  const prices = apiCard.tcgplayer.prices;
  
  if (variant && prices[variant]?.market) {
    return prices[variant].market;
  }
  const variantPriority = ['normal', 'holofoil', 'reverseHolofoil', '1stEditionNormal', '1stEditionHolofoil', 'unlimitedHolofoil', 'unlimitedNormal'];
  for (const v of variantPriority) {
    if (prices[v]?.market) {
      return prices[v].market;
    }
  }
  for (const key in prices) {
    if (Object.prototype.hasOwnProperty.call(prices, key) && prices[key]?.market) {
      return prices[key].market;
    }
  }
  return 0;
};

export function EditCardDialog({
  isOpen,
  onClose,
  card,
  onSave,
}: EditCardDialogProps) {
  const [editableCard, setEditableCard] = useState<PokemonCard | null>(null);
  const [quantityInput, setQuantityInput] = useState<number>(1);
  const [valueInput, setValueInput] = useState<string>("0.00");
  const [selectedLanguage, setSelectedLanguage] = useState<'English' | 'Japanese'>('English');
  const [isFetchingValue, setIsFetchingValue] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (card && isOpen) {
      setEditableCard({ ...card });
      setQuantityInput(typeof card.quantity === 'number' && !isNaN(card.quantity) ? card.quantity : 1);
      setValueInput(typeof card.value === 'number' && !isNaN(card.value) ? card.value.toFixed(2) : "0.00");
      setSelectedLanguage(card.language || 'English');
    } else {
      setEditableCard(null);
      setQuantityInput(1);
      setValueInput("0.00");
      setSelectedLanguage('English');
    }
  }, [card, isOpen]);
  
  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const num = parseInt(e.target.value, 10);
    setQuantityInput(isNaN(num) || num < 1 ? 1 : num);
  };

  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValueInput(e.target.value);
  };

  const handleLanguageChange = (value: 'English' | 'Japanese') => {
    setSelectedLanguage(value);
    if (editableCard) {
        setEditableCard({...editableCard, language: value });
    }
  }

  const handleSave = () => {
    if (editableCard) {
      const parsedValue = parseFloat(valueInput);
      const finalValue = isNaN(parsedValue) ? 0 : parsedValue;
      onSave({ ...editableCard, language: selectedLanguage, quantity: quantityInput, value: finalValue });
      onClose();
    }
  };
  
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    if (editableCard?.imageUrl) {
        // No fallback needed here as image is already loaded or placeholder is inherent
    }
  };
  
  const handleFetchLatestValue = async () => {
    if (!editableCard?.apiId) {
      toast({
        variant: "destructive",
        title: "Cannot Fetch Value",
        description: "This card is missing a master ID and cannot be updated automatically.",
      });
      return;
    }
    
    setIsFetchingValue(true);
    try {
      const response = await fetch(`/api/master-card/${editableCard.apiId}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to fetch latest price data.");
      }
      const masterCardData = await response.json();
      const latestValue = getMarketPrice(masterCardData, editableCard.variant);
      
      setValueInput(latestValue.toFixed(2));
      toast({
        title: "Value Updated",
        description: `Latest market value is $${latestValue.toFixed(2)}. Click Save to apply.`,
      });

    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Fetch Error",
        description: err.message,
      });
    } finally {
      setIsFetchingValue(false);
    }
  };

  if (!editableCard && !isOpen) return null;
  if (!isOpen) return null;

  const currentCardToDisplay = editableCard || card;
  const displayVariant = formatDisplayVariant(currentCardToDisplay?.variant as string | undefined);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Card: {currentCardToDisplay?.name || currentCardToDisplay?.cardNumber}</DialogTitle>
          <DialogDescription>
            {currentCardToDisplay?.set} - #{currentCardToDisplay?.cardNumber} {displayVariant ? `(${displayVariant})` : ""}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="flex justify-center mb-4">
            <div className="relative w-40 h-56 rounded-md overflow-hidden shadow-md" data-ai-hint="pokemon card front">
              <Image
                src={currentCardToDisplay?.imageUrl || "https://placehold.co/200x280.png"}
                alt={currentCardToDisplay?.name || "Card image"}
                layout="fill"
                objectFit="contain"
                onError={handleImageError}
                key={currentCardToDisplay?.imageUrl || 'placeholder'}
              />
            </div>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="language" className="text-right col-span-1">
              <Languages className="inline-block mr-1 h-4 w-4 text-blue-500"/>Language
            </Label>
            <Select
              value={selectedLanguage}
              onValueChange={handleLanguageChange}
            >
              <SelectTrigger id="language" className="col-span-3">
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent>
                {languageOptions.map((lang) => (
                  <SelectItem key={lang} value={lang}>
                    {lang}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="quantity" className="text-right col-span-1">
              <Layers className="inline-block mr-1 h-4 w-4 text-purple-500"/>Quantity
            </Label>
            <Input
              id="quantity"
              type="number"
              value={quantityInput}
              onChange={handleQuantityChange}
              className="col-span-3"
              min="1"
            />
          </div>
          
          {displayVariant && (
             <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="variant" className="text-right col-span-1">
                 <Gem className="inline-block mr-1 h-4 w-4 text-blue-500"/>Variant
                </Label>
                <Input id="variant" value={displayVariant} readOnly className="col-span-3 bg-muted/50"/>
            </div>
          )}

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="value" className="text-right col-span-1">
              <DollarSign className="inline-block mr-1 h-4 w-4 text-primary"/>Value ($)
            </Label>
            <div className="col-span-3 flex items-center gap-2">
              <Input
                id="value"
                type="text" 
                value={valueInput}
                onChange={handleValueChange}
                className="flex-grow"
                placeholder="0.00"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleFetchLatestValue}
                disabled={isFetchingValue || !editableCard?.apiId}
                aria-label="Fetch latest value"
                title="Fetch latest value"
              >
                {isFetchingValue ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={!editableCard} className="bg-accent hover:bg-accent/90 text-accent-foreground">Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
