"use client";

import { Button } from "@/components/ui/button";
import { ScanLine } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function CardScannerButton() {
  const { toast } = useToast();

  const handleScan = () => {
    // Placeholder for actual scanning logic
    console.log("Card scanning initiated...");
    toast({
      title: "Scanner Activated",
      description: "Card scanning feature is not yet implemented.",
      variant: "default",
    });
  };

  return (
    <Button variant="outline" className="w-full border-accent text-accent hover:bg-accent/10 hover:text-accent" onClick={handleScan}>
      <ScanLine className="mr-2 h-4 w-4" />
      Scan Card with Camera
    </Button>
  );
}
