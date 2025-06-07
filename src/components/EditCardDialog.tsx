
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
import { Gem, DollarSign, ShieldCheck, Layers, Languages } from "lucide-react"; // Added Layers, Languages

type EditCardDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  card: PokemonCard | null;
  onSave: (updatedCard: PokemonCard) => void;
  availableConditions: string[];
};

const languageOptions: Array<'English' | 'Japanese'> = ["English", "Japanese"];

// Helper to format variant keys for display
const formatDisplayVariant = (variantKey?: string): string | null => {
  if (!variantKey) return null;
  return variantKey
    .replace(/([A-Z0-9])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
};

export function EditCardDialog({
  isOpen,
  onClose,
  card,
  onSave,
  availableConditions,
}: EditCardDialogProps) {
  const [editableCard, setEditableCard] = useState<PokemonCard | null>(null);
  const [quantityInput, setQuantityInput] = useState<number>(1);
  const [valueInput, setValueInput] = useState<string>("0.00");
  const [selectedLanguage, setSelectedLanguage] = useState<'English' | 'Japanese'>('English');


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

  const handleInputChange = (field: keyof PokemonCard, value: any) => {
    if (editableCard) {
      setEditableCard({ ...editableCard, [field]: value });
    }
  };
  
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

  if (!editableCard && !isOpen) return null; // Don't render if no card and not open
  if (!isOpen) return null; // Ensure dialog content isn't rendered when closed, prevents issues with initial editableCard state

  const currentCardToDisplay = editableCard || card; // Use card prop if editableCard is null (e.g. initial open)
  const displayVariant = formatDisplayVariant(currentCardToDisplay?.variant);


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

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="condition" className="text-right col-span-1">
              <ShieldCheck className="inline-block mr-1 h-4 w-4 text-green-500"/>Condition
            </Label>
            <Select
              value={currentCardToDisplay?.condition || ""}
              onValueChange={(value) => handleInputChange("condition", value)}
            >
              <SelectTrigger id="condition" className="col-span-3">
                <SelectValue placeholder="Select condition" />
              </SelectTrigger>
              <SelectContent>
                {availableConditions.map((condition) => (
                  <SelectItem key={condition} value={condition}>
                    {condition}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
            <Input
              id="value"
              type="text" 
              value={valueInput}
              onChange={handleValueChange}
              className="col-span-3"
              placeholder="0.00"
            />
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
    
