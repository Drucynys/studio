
"use client";

// This component is no longer used in the main card adding flow as of image upload feature.
// Keeping the file for now in case direct camera scanning is revisited.

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
      Scan Card with Camera (Legacy)
    </Button>
  );
}
