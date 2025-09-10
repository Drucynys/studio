// File: src/components/ImprovedCardScanner.tsx
"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Camera, RotateCcw, Zap, Eye } from "lucide-react";
import { findCardByImageEnhanced, validateCardData } from "@/ai/flows/find-card-by-image-flow";
import { detectImageRotation, cropToCardArea } from "@/lib/image-preprocessing";
import { useImageProcessor } from "@/hooks/useImageProcessor";
import { useToast } from "@/hooks/use-toast";
import Image from "next/image";

interface ScanResult {
  name?: string;
  set?: string;
  cardNumber?: string;
  rarity?: string;
  confidence?: number;
  extractedText?: string;
}

interface ImprovedCardScannerProps {
  onScanResult: (result: ScanResult) => void;
}

export function ImprovedCardScanner({ onScanResult }: ImprovedCardScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [processingStep, setProcessingStep] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { processImageWithProgress, isAvailable: workerAvailable } = useImageProcessor();

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
    setScanResult(null);
    setProcessingStep("Uploading image...");

    try {
      // Convert file to data URL
      setProcessingStep("Loading image...");
      const imageDataUrl = await fileToDataUrl(file);

      // Step 1: Process image using Web Worker (non-blocking)
      if (workerAvailable) {
        const processedImage = await processImageWithProgress(
          imageDataUrl,
          {
            targetWidth: 1200,
            enhanceContrast: true,
            sharpen: true,
          },
          setProcessingStep
        );
        setImagePreview(processedImage);

        // Step 2: Check for rotation (quick check)
        setProcessingStep("Checking image orientation...");
        const suggestedRotation = await detectImageRotation(processedImage);
        if (suggestedRotation > 0) {
          setProcessingStep("Image rotation detected...");
          // Rotation could be implemented in the worker for better performance
        }

        // Step 3: Crop to card area (also could be moved to worker)
        setProcessingStep("Focusing on card area...");
        const croppedImage = await cropToCardArea(processedImage);

        // Step 4: AI Analysis
        setProcessingStep("Analyzing card with AI...");
        const result = await findCardByImageEnhanced({ imageDataUri: croppedImage });
        
        // Step 5: Validate and clean result
        setProcessingStep("Validating results...");
        const cleanedResult = validateCardData(result);
        
        setScanResult(cleanedResult);
        onScanResult(cleanedResult);

        // Show success message with confidence
        const confidence = Math.round((cleanedResult.confidence || 0) * 100);
        toast({
          title: "Scan Complete!",
          description: `Card analyzed with ${confidence}% confidence. ${cleanedResult.name ? `Found: ${cleanedResult.name}` : 'Please verify the results.'}`,
          className: confidence > 70 ? "bg-green-100 text-green-900" : "bg-yellow-100 text-yellow-900",
        });
      } else {
        // Fallback to synchronous processing if worker is not available
        throw new Error("Image processing not available. Please try refreshing the page.");
      }

    } catch (error) {
      console.error("Error scanning card:", error);
      const errorMessage = error instanceof Error ? error.message : "Could not analyze the card image.";
      toast({
        variant: "destructive",
        title: "Scan Failed",
        description: `${errorMessage} Please try again with a clearer photo.`,
      });
    } finally {
      setIsScanning(false);
      setProcessingStep("");
    }
  }, [fileToDataUrl, processImageWithProgress, workerAvailable, onScanResult, toast]);

  const getConfidenceColor = (confidence: number = 0) => {
    if (confidence > 0.8) return "bg-green-100 text-green-800";
    if (confidence > 0.6) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  return (
    <div className="space-y-6">
      {/* Upload Button */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            AI Card Scanner
          </CardTitle>
        </CardHeader>
        <CardContent>
          <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            ref={fileInputRef}
            className="hidden"
            id="improved-card-upload"
          />
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={isScanning}
            className="w-full"
            size="lg"
          >
            {isScanning ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {processingStep || "Scanning..."}
              </>
            ) : (
              <>
                <Camera className="mr-2 h-4 w-4" />
                Scan Pokemon Card
              </>
            )}
          </Button>
          
          <div className="mt-4 text-sm text-muted-foreground">
            <p className="font-medium mb-2">Tips for better scanning:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Take photo in good lighting</li>
              <li>Keep card flat and straight</li>
              <li>Fill most of the frame with the card</li>
              <li>Avoid glare and shadows</li>
              <li>Make sure text is clearly visible</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Image Preview */}
      {imagePreview && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Processed Image
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative aspect-[2.5/3.5] w-full max-w-sm mx-auto">
              <Image
                src={imagePreview}
                alt="Processed card image"
                fill
                className="object-contain rounded-lg border"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Scan Results */}
      {scanResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Scan Results
              {scanResult.confidence && (
                <Badge className={getConfidenceColor(scanResult.confidence)}>
                  {Math.round(scanResult.confidence * 100)}% confidence
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Card Name</label>
                <p className="font-semibold">{scanResult.name || "Not detected"}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-muted-foreground">Set</label>
                <p className="font-semibold">{scanResult.set || "Not detected"}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-muted-foreground">Card Number</label>
                <p className="font-semibold">{scanResult.cardNumber || "Not detected"}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-muted-foreground">Rarity</label>
                <p className="font-semibold">{scanResult.rarity || "Not detected"}</p>
              </div>
            </div>

            {/* Debug: Show extracted text */}
            {scanResult.extractedText && (
              <details className="mt-4">
                <summary className="text-sm font-medium text-muted-foreground cursor-pointer">
                  Extracted Text (for debugging)
                </summary>
                <div className="mt-2 p-3 bg-muted rounded text-xs font-mono whitespace-pre-wrap">
                  {scanResult.extractedText}
                </div>
              </details>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="flex-1"
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Scan Again
              </Button>
              
              {scanResult.name && (
                <Button
                  onClick={() => onScanResult(scanResult)}
                  className="flex-1"
                >
                  Use This Result
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}