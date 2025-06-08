
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
    }

    return () => {
      if (tesseractWorkerRef.current && !isOpen) { // Ensure termination if dialog closes unexpectedly
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
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        streamRef.current = stream;
        setHasCameraPermission(true);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Error accessing camera:", err);
        setError("Camera access denied. Please enable camera permissions in your browser settings.");
        setHasCameraPermission(false);
        toast({
          variant: "destructive",
          title: "Camera Access Denied",
          description: "Please enable camera permissions in your browser settings.",
        });
      }
    };

    getCameraPermission();
  }, [isOpen, toast]);

  // Basic parsing - this will need significant improvement
  const parseOcrText = (text: string): Partial<OcrScanOutput> => {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 2);
    let name: string | undefined;
    let set: string | undefined; // OCR is unlikely to get set name accurately without more context
    let cardNumber: string | undefined;

    // Try to find card number (e.g., 123/456 or XY123)
    const cardNumberRegex = /(\b\w*\d+[a-zA-Z]?\s*\/\s*\d+\w*\b|\b[A-Z]{0,3}\d{1,3}[a-zA-Z]?\b)/;
    for (const line of lines) {
      const match = line.match(cardNumberRegex);
      if (match) {
        cardNumber = match[0];
        // Very naively assume the line before card number might be the set
        // This is highly unreliable
        const currentLineIndex = lines.indexOf(line);
        if (currentLineIndex > 0 && lines[currentLineIndex-1].length > 3 && lines[currentLineIndex-1].length < 50) {
           // set = lines[currentLineIndex-1]; // Commenting out for now as it's too unreliable
        }
        break;
      }
    }
    
    // Assume the longest line (or one of the longest) is the name, if not clearly a number/set string
    if (lines.length > 0) {
        const potentialNames = lines.filter(l => !cardNumberRegex.test(l) && l.length > 5 && l.length < 40 && isNaN(parseFloat(l)));
        potentialNames.sort((a,b) => b.length - a.length);
        if (potentialNames.length > 0) {
            name = potentialNames[0];
        }
    }

    return { name, set, cardNumber };
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
        description: `Extracted text (raw): "${text.substring(0, 50)}..." Parsed: Name: ${parsedData.name || 'N/A'}, Num: ${parsedData.cardNumber || 'N/A'}. Please verify.`,
        duration: 7000,
      });
      
      onScanComplete({ ...parsedData, imageDataUri });

    } catch (e) {
      console.error("Error during OCR processing:", e);
      setError(e instanceof Error ? e.message : "An unknown error occurred during OCR.");
      toast({ variant: "destructive", title: "OCR Error", description: e instanceof Error ? e.message : "Failed to process image with OCR." });
      // Fallback: send only image data if OCR fails hard
      onScanComplete({ imageDataUri });
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
            Position your Pokémon card clearly in the frame. Good lighting is key.
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
           {error && !isCapturing && hasCameraPermission && ( // OCR specific error display
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
