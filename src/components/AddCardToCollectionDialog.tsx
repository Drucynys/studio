
"use client";

import { useState } from "react";
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

type AddCardToCollectionDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  cardName: string;
  cardImageUrl: string;
  availableConditions: string[];
  onAddCard: (condition: string) => void;
};

export function AddCardToCollectionDialog({
  isOpen,
  onClose,
  cardName,
  cardImageUrl,
  availableConditions,
  onAddCard,
}: AddCardToCollectionDialogProps) {
  const [selectedCondition, setSelectedCondition] = useState<string>("");

  const handleSubmit = () => {
    if (selectedCondition) {
      onAddCard(selectedCondition);
      setSelectedCondition(""); // Reset for next time
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add "{cardName}" to Collection</DialogTitle>
          <DialogDescription>
            Select the condition of your card. The value will be auto-calculated.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="flex justify-center mb-4">
            <div className="relative w-40 h-56 rounded-md overflow-hidden shadow-md" data-ai-hint="pokemon card front">
              <Image src={cardImageUrl} alt={cardName} layout="fill" objectFit="contain" />
            </div>
          </div>
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
          <Button type="submit" onClick={handleSubmit} disabled={!selectedCondition} className="bg-accent hover:bg-accent/90 text-accent-foreground">
            Add to Collection
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
