
"use client";

import { Button } from "@/components/ui/button";
import { ScanLine } from "lucide-react";

type CardScannerButtonProps = {
  onScanClick: () => void;
  disabled?: boolean;
};

export function CardScannerButton({ onScanClick, disabled }: CardScannerButtonProps) {
  return (
    <Button 
      variant="outline" 
      className="w-full border-accent text-accent hover:bg-accent/10 hover:text-accent" 
      onClick={onScanClick}
      disabled={disabled}
    >
      <ScanLine className="mr-2 h-4 w-4" />
      Scan Card with Camera
    </Button>
  );
}
