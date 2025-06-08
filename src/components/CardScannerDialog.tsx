
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Loader2, Camera, ImageUp, AlertCircle, ScanText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Tesseract from 'tesseract.js';

export interface OcrScanOutput {
  name?: string;
  set?: string;
  cardNumber?: string;
  rarity?: string; 
  imageDataUri: string;
}


type CardScannerDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onScanComplete: (output: OcrScanOutput) => void;
};

export function CardScannerDialog({ isOpen, onClose, onScanComplete }: CardScannerDialogProps) {
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrStatus, setOcrStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const tesseractWorkerRef = useRef<Tesseract.Worker | null>(null);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const initializeTesseract = useCallback(async () => {
    if (!tesseractWorkerRef.current) {
      const worker = await Tesseract.createWorker('eng', 1, {
        logger: m => {
          if (m.status === 'recognizing text') {
            setOcrProgress(Math.round(m.progress * 100));
            setOcrStatus(m.status);
          } else if(m.status) {
            setOcrStatus(m.status);
            setOcrProgress(0); // Reset progress for other statuses
          }
        },
      });
      tesseractWorkerRef.current = worker;
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      initializeTesseract();
    } else {
      stopCamera();
      if (tesseractWorkerRef.current) {
        tesseractWorkerRef.current.terminate();
        tesseractWorkerRef.current = null;
      }
      setHasCameraPermission(null);
      setOcrProgress(0);
      setOcrStatus(null);
      setError(null);
    }

    return () => {
      if (tesseractWorkerRef.current && !isOpen) { 
        tesseractWorkerRef.current.terminate();
        tesseractWorkerRef.current = null;
      }
    };
  }, [isOpen, stopCamera, initializeTesseract]);


  useEffect(() => {
    if (!isOpen) return;

    const getCameraPermission = async () => {
      setError(null);
      try {
        const constraints: MediaStreamConstraints = {
          video: {
            facingMode: "environment",
            // @ts-ignore TS might not know about focusMode in default MediaTrackConstraints
            focusMode: "continuous" 
          }
        };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = stream;
        setHasCameraPermission(true);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Error accessing camera:", err);
        let errorMessage = "Camera access denied. Please enable camera permissions in your browser settings.";
        if (err instanceof Error && err.name === "OverconstrainedError") {
            errorMessage = "Could not apply advanced camera settings (e.g., focus). Trying with basic settings. If focus issues persist, your device might not support software-controlled focus for this camera."
            console.warn("OverconstrainedError, attempting fallback without focusMode");
            try {
                const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }});
                streamRef.current = fallbackStream;
                setHasCameraPermission(true);
                if (videoRef.current) {
                    videoRef.current.srcObject = fallbackStream;
                }
                toast({
                    variant: "default",
                    title: "Camera Initialized (Fallback)",
                    description: "Advanced focus settings not supported by device, using basic camera mode."
                });
                return; // Successfully got stream with fallback
            } catch (fallbackErr) {
                 console.error("Fallback camera access also failed:", fallbackErr);
                 // Let the original error message for permission be shown
            }
        }

        setError(errorMessage);
        setHasCameraPermission(false);
        toast({
          variant: "destructive",
          title: "Camera Access Issue",
          description: errorMessage,
          duration: 7000,
        });
      }
    };

    getCameraPermission();
  }, [isOpen, toast]);

  const parseOcrText = (text: string): Partial<OcrScanOutput> => {
    const originalLines = text.split('\n');
    const lines = originalLines.map(line => line.trim()).filter(line => line.length > 1);

    let name: string | undefined;
    let cardNumber: string | undefined;
    let rarity: string | undefined;

    const cardNumberRegexPatterns = [
        /\b\d{1,3}\s*\/\s*\d{1,3}\b/i,
        /\b[A-Za-z]{2,6}\s?\d{1,3}[a-zA-Z]?\b/i,
        /\b(?:TG|GG)\d{1,2}\s*\/\s*(?:TG|GG)\d{1,2}\b/i,
        /\b\d{3}\/\d{3}\b/i,
    ];
    
    for (let i = lines.length - 1; i >= 0; i--) {
        for (const regex of cardNumberRegexPatterns) {
            const match = lines[i].match(regex);
            if (match && match[0].length >= 2) {
                cardNumber = match[0].replace(/\s+/g, '');
                break;
            }
        }
        if (cardNumber) break;
    }
    if (!cardNumber) {
        for (let i = Math.max(0, lines.length - 5); i < lines.length; i++) {
            const generalNumberMatch = lines[i].match(/\b(?:\d{1,3}[a-zA-Z]?|[A-Za-z]+\d{1,3})\b/);
            if (generalNumberMatch && lines[i].length < 10) {
                cardNumber = generalNumberMatch[0];
                break;
            }
        }
    }

    const commonNonNameKeywords = [
        'basic', 'stage 1', 'stage 2', 'vmax', 'vstar', ' tera', 'radiant',
        'hp', 'weakness', 'resistance', 'retreat cost', 
        'pokémon tool', 'item', 'supporter', 'stadium', 'energy',
        'evolves from', 'no.', 'illus.'
    ];
    const potentialNameLines: string[] = [];
    for (let i = 0; i < Math.min(lines.length, 5); i++) {
        const line = lines[i];
        const lowerLine = line.toLowerCase();
        if (line.length >= 3 && line.length <= 40 &&
            !/\d/.test(line.substring(line.length - 3)) && 
            !commonNonNameKeywords.some(keyword => lowerLine.includes(keyword)) &&
            !cardNumberRegexPatterns.some(regex => regex.test(line))
        ) {
            let cleanedLine = line.replace(/\s*HP\s*\d+\s*$/, "").trim();
            if (/^\d+$/.test(cleanedLine)) continue;
            potentialNameLines.push(cleanedLine);
        }
    }

    if (potentialNameLines.length > 0) {
        potentialNameLines.sort((a, b) => {
            const aEndsWithV = /\sV$/.test(a);
            const bEndsWithV = /\sV$/.test(b);
            if (aEndsWithV && !bEndsWithV) return 1;
            if (!aEndsWithV && bEndsWithV) return -1;
            return b.length - a.length; 
        });
        name = potentialNameLines[0];

        if (name) {
            const typeKeywords = ["Basic", "Stage 1", "Stage 2", "VMAX", "VSTAR", "Radiant", "Tera"];
            for (const keyword of typeKeywords) {
                if (name.toUpperCase().endsWith(" " + keyword.toUpperCase())) {
                    name = name.substring(0, name.length - (keyword.length + 1)).trim();
                    break;
                }
                 if (name.toUpperCase().startsWith(keyword.toUpperCase() + " ")) {
                    name = name.substring(keyword.length +1).trim();
                    break;
                }
            }
        }
    }
    
    const rarityKeywords: { [key: string]: string } = {
        ' C ': 'Common', ' U ': 'Uncommon', ' R ': 'Rare', 
        'COMMON': 'Common', 'UNCOMMON': 'Uncommon', 'RARE': 'Rare',
        'Holo Rare': 'Holo Rare', 'Reverse Holo': 'Reverse Holo',
        'Ultra Rare': 'Ultra Rare', 'Secret Rare': 'Secret Rare',
        'Promo': 'Promo',
    };
    for (let i = Math.max(0, lines.length - 5); i < lines.length; i++) {
        const lineUpper = lines[i].toUpperCase();
        for (const keyword in rarityKeywords) {
            if (lineUpper.includes(keyword)) {
                rarity = rarityKeywords[keyword];
                break;
            }
        }
        if (rarity) break;
    }
    if (cardNumber) {
        const cardNumberLineIndex = lines.findIndex(line => line.includes(cardNumber!));
        if (cardNumberLineIndex !== -1) {
            const parts = lines[cardNumberLineIndex].split(/[\s\/]+/); 
            const singleLetterRarity = parts.find(p => p.length === 1 && "CURS".includes(p.toUpperCase()));
            if (singleLetterRarity) {
                if (singleLetterRarity.toUpperCase() === 'C') rarity = 'Common';
                else if (singleLetterRarity.toUpperCase() === 'U') rarity = 'Uncommon';
                else if (singleLetterRarity.toUpperCase() === 'R') rarity = 'Rare';
            }
        }
    }

    return { name, cardNumber, rarity };
  };

  const handleCaptureAndScan = async () => {
    if (!videoRef.current || !canvasRef.current || !hasCameraPermission || !tesseractWorkerRef.current) {
      toast({ variant: "destructive", title: "Scan Error", description: "Camera or OCR not ready." });
      return;
    }
    setIsCapturing(true);
    setError(null);
    setOcrProgress(0);
    setOcrStatus("Initializing OCR...");

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");

    if (!context) {
      toast({ variant: "destructive", title: "Canvas Error", description: "Could not get canvas context." });
      setIsCapturing(false);
      return;
    }
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageDataUri = canvas.toDataURL("image/jpeg");

    try {
      const worker = tesseractWorkerRef.current;
      const { data: { text } } = await worker.recognize(imageDataUri);
      setOcrStatus("OCR Complete");
      
      const parsedData = parseOcrText(text);

      toast({
        title: "OCR Attempt Complete",
        description: `Parsed: Name: ${parsedData.name || 'N/A'}, #: ${parsedData.cardNumber || 'N/A'}, Rarity: ${parsedData.rarity || 'N/A'}. Please verify.`,
        duration: 8000,
      });
      
      onScanComplete({ ...parsedData, imageDataUri });

    } catch (e) {
      console.error("Error during OCR processing:", e);
      setError(e instanceof Error ? e.message : "An unknown error occurred during OCR.");
      toast({ variant: "destructive", title: "OCR Error", description: e instanceof Error ? e.message : "Failed to process image with OCR." });
      onScanComplete({ imageDataUri }); // Fallback: send only image data
    } finally {
      setIsCapturing(false);
      setOcrProgress(0);
      setOcrStatus(null);
    }
  };
  
  const handleDialogClose = () => {
    stopCamera();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleDialogClose(); }}>
      <DialogContent className="sm:max-w-lg md:max-w-xl lg:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><ScanText className="h-6 w-6 text-primary" /> Card Scanner (OCR)</DialogTitle>
          <DialogDescription>
            Position your Pokémon card clearly in the frame. Good lighting and focus are key.
            The app will attempt to read text from the card. Results may vary.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 my-4">
          <div className="w-full aspect-video bg-muted rounded-md overflow-hidden relative">
            <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
            {hasCameraPermission === null && (
                 <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                    <Loader2 className="h-8 w-8 animate-spin text-white" />
                    <p className="ml-2 text-white">Initializing camera...</p>
                 </div>
            )}
            {isCapturing && ocrStatus && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 text-white p-4">
                <Loader2 className="h-10 w-10 animate-spin mb-3" />
                <p className="text-lg font-semibold">{ocrStatus}</p>
                {ocrProgress > 0 && ocrStatus === 'recognizing text' && <p>{ocrProgress}%</p>}
                <div className="w-3/4 h-2 bg-gray-600 rounded-full overflow-hidden mt-2">
                    <div className="h-full bg-primary transition-all duration-150" style={{width: `${ocrProgress}%`}}></div>
                </div>
              </div>
            )}
          </div>
          <canvas ref={canvasRef} style={{ display: "none" }} />

          {hasCameraPermission === false && error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Camera Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
           {error && !isCapturing && hasCameraPermission && ( 
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>OCR Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={handleDialogClose} disabled={isCapturing}>
            Cancel
          </Button>
          <Button 
            onClick={handleCaptureAndScan} 
            disabled={!hasCameraPermission || isCapturing}
            className="bg-accent hover:bg-accent/90 text-accent-foreground"
          >
            {isCapturing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <ImageUp className="mr-2 h-4 w-4" />
            )}
            {isCapturing ? (ocrStatus || "Processing...") : "Capture & Scan Card"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
    

    