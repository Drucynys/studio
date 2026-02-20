// File: src/components/ImprovedCardScanner.tsx
"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Camera, RotateCcw, Zap, Eye, Info } from "lucide-react";
import { findCardByImageEnhanced, validateCardData, type FindCardOutput } from "@/ai/flows/find-card-by-image-flow";
import { useToast } from "@/hooks/use-toast";
import Image from "next/image";

interface ImprovedCardScannerProps {
  onScanResult: (result: FindCardOutput) => void;
}

export function ImprovedCardScanner({ onScanResult }: ImprovedCardScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [processingStep, setProcessingStep] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const fileToDataUrl = useCallback((file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }, []);

  const handleImageUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    setProcessingStep("Reading image...");

    try {
      const imageDataUrl = await fileToDataUrl(file);
      setImagePreview(imageDataUrl);

      setProcessingStep("AI is analyzing card...");
      const result = await findCardByImageEnhanced({ imageDataUri: imageDataUrl });
      
      const cleanedResult = validateCardData(result);
      
      if (cleanedResult.name) {
        onScanResult(cleanedResult);
        toast({
          title: "Scan Successful",
          description: `Identified: ${cleanedResult.name}`,
        });
      } else {
        throw new Error("AI could not clearly identify this card.");
      }

    } catch (error) {
      console.error("Error scanning card:", error);
      const errorMessage = error instanceof Error ? error.message : "Could not analyze the card image.";
      toast({
        variant: "destructive",
        title: "Scan Failed",
        description: `${errorMessage} Please try again with a clearer, well-lit photo.`,
      });
    } finally {
      setIsScanning(false);
      setProcessingStep("");
      // Reset input value so same file can be uploaded again if needed
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [fileToDataUrl, onScanResult, toast]);

  return (
    <div className="space-y-6">
      <Card className="border-dashed border-2">
        <CardHeader className="text-center">
          <div className="mx-auto bg-primary/10 p-3 rounded-full w-fit mb-2">
            <Camera className="h-8 w-8 text-primary" />
          </div>
          <CardTitle>AI Card Scanner</CardTitle>
          <CardDescription>
            Take a photo of a card to automatically identify its name, set, and number.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleImageUpload}
            ref={fileInputRef}
            className="hidden"
            id="card-camera-input"
          />
          
          <div className="flex flex-col gap-4">
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={isScanning}
              className="w-full h-16 text-lg"
              size="lg"
            >
              {isScanning ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  {processingStep}
                </>
              ) : (
                <>
                  <Camera className="mr-2 h-5 w-5" />
                  Snap or Upload Photo
                </>
              )}
            </Button>

            <div className="bg-muted p-4 rounded-lg flex gap-3 items-start">
              <Info className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
              <div className="text-sm text-muted-foreground">
                <p className="font-semibold text-foreground mb-1">For best results:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Use bright, even lighting</li>
                  <li>Keep the card flat and centered</li>
                  <li>Avoid glare on holographic parts</li>
                  <li>Make sure set symbols and numbers are sharp</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {imagePreview && (
        <Card className="overflow-hidden">
          <CardHeader className="bg-muted/50 py-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Eye className="h-4 w-4" /> Last Captured Image
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="relative aspect-[2.5/3.5] w-full max-w-[250px] mx-auto my-4 shadow-xl rounded-lg overflow-hidden border">
              <Image
                src={imagePreview}
                alt="Captured card preview"
                fill
                className="object-cover"
              />
              {isScanning && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <div className="w-full h-1 bg-primary animate-scan-line shadow-[0_0_15px_rgba(var(--primary),0.8)]" />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
