
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
import { Label } from "@/components/ui/label";

// Helper to format variant keys for display
const formatVariantKey = (key: string): string => {
  if (!key) return "N/A";
  return key
    .replace(/([A-Z0-9])/g, ' $1') // Add spaces before capital letters/numbers
    .replace(/^./, str => str.toUpperCase()) // Capitalize first letter
    .trim();
};

type AddCardToCollectionDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  cardName: string;
  cardImageUrl: string;
  availableConditions: string[];
  availableVariants?: string[]; // Optional: list of variant keys
  defaultVariant?: string;
  onAddCard: (condition: string, variant: string) => void;
};

export function AddCardToCollectionDialog({
  isOpen,
  onClose,
  cardName,
  cardImageUrl,
  availableConditions,
  availableVariants,
  defaultVariant,
  onAddCard,
}: AddCardToCollectionDialogProps) {
  const [selectedCondition, setSelectedCondition] = useState<string>("");
  const [selectedVariant, setSelectedVariant] = useState<string>("");

  useEffect(() => {
    if (isOpen) {
      setSelectedCondition(""); // Reset condition on open
      // Set default variant if available, otherwise the first variant or empty
      const initialVariant = defaultVariant || (availableVariants && availableVariants.length > 0 ? availableVariants[0] : "");
      setSelectedVariant(initialVariant);
    }
  }, [isOpen, defaultVariant, availableVariants]);

  const handleSubmit = () => {
    if (selectedCondition && (selectedVariant || !availableVariants || availableVariants.length === 0) ) {
      onAddCard(selectedCondition, selectedVariant);
      setSelectedCondition(""); 
      setSelectedVariant("");
      onClose();
    }
  };

  const showVariantSelector = availableVariants && availableVariants.length > 0;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add "{cardName}" to Collection</DialogTitle>
          <DialogDescription>
            Select the condition {showVariantSelector && "and variant "}of your card.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="flex justify-center mb-4">
            <div className="relative w-40 h-56 rounded-md overflow-hidden shadow-md" data-ai-hint="pokemon card front">
              <Image src={cardImageUrl} alt={cardName} layout="fill" objectFit="contain" />
            </div>
          </div>
          
          {showVariantSelector && (
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="variant" className="text-right col-span-1">
                Variant
              </Label>
              <Select value={selectedVariant} onValueChange={setSelectedVariant}>
                <SelectTrigger id="variant" className="col-span-3">
                  <SelectValue placeholder="Select variant" />
                </SelectTrigger>
                <SelectContent>
                  {availableVariants.map((variant) => (
                    <SelectItem key={variant} value={variant}>
                      {formatVariantKey(variant)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="condition" className="text-right col-span-1">
              Condition
            </Label>
            <Select value={selectedCondition} onValueChange={setSelectedCondition}>
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
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button 
            type="submit" 
            onClick={handleSubmit} 
            disabled={!selectedCondition || (showVariantSelector && !selectedVariant)} 
            className="bg-accent hover:bg-accent/90 text-accent-foreground"
          >
            Add to Collection
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
