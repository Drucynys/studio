
"use client";

// This component is no longer used in the main card adding flow as of image upload feature.
// Keeping the file for now in case direct camera scanning is revisited, but its functionality
// is replaced by the image upload and AI identification flow.

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
import { Loader2, Camera, ImageUp, AlertCircle, ScanText, ZoomIn, ZoomOut, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Tesseract from 'tesseract.js';
import { cn } from "@/lib/utils";

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
  const videoTrackRef = useRef<MediaStreamTrack | null>(null);

  const [zoomSupported, setZoomSupported] = useState(false);
  const [currentZoom, setCurrentZoom] = useState(1);
  const [minZoom, setMinZoom] = useState(1);
  const [maxZoom, setMaxZoom] = useState(1);
  const [stepZoom, setStepZoom] = useState(0.1);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    videoTrackRef.current = null;
    setZoomSupported(false);
  }, []);

  const initializeTesseract = useCallback(async () => {
    if (!tesseractWorkerRef.current) {
      try {
        const worker = await Tesseract.createWorker('eng', 1, {
          logger: m => {
            if (m.status === 'recognizing text') {
              setOcrProgress(Math.round(m.progress * 100));
              setOcrStatus(m.status);
            } else if(m.status) {
              setOcrStatus(m.status);
              setOcrProgress(0);
            }
          },
        });
        tesseractWorkerRef.current = worker;
      } catch (e) {
        console.error("Failed to initialize Tesseract worker:", e);
        setError("Failed to initialize OCR engine. Please try refreshing.");
        toast({ variant: "destructive", title: "OCR Initialization Error", description: "Could not load the OCR engine." });
      }
    }
  }, [toast]);

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
      if (tesseractWorkerRef.current && (!isOpen || (isOpen && tesseractWorkerRef.current))) { 
        tesseractWorkerRef.current.terminate();
        tesseractWorkerRef.current = null;
      }
    };
  }, [isOpen, stopCamera, initializeTesseract]);


  useEffect(() => {
    if (!isOpen) return;

    const getCameraPermission = async () => {
      setError(null);
      setHasCameraPermission(null); 
      try {
        const constraints: MediaStreamConstraints = {
          video: {
            facingMode: "environment",
            // @ts-ignore
            focusMode: "continuous", 
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
        };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = stream;
        setHasCameraPermission(true);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }

        const track = stream.getVideoTracks()[0];
        videoTrackRef.current = track;
        // @ts-ignore
        const capabilities = track.getCapabilities?.();
        if (capabilities?.zoom) {
          setZoomSupported(true);
          // @ts-ignore
          setMinZoom(capabilities.zoom.min || 1);
          // @ts-ignore
          setMaxZoom(Math.min(capabilities.zoom.max || 10, 10)); 
          // @ts-ignore
          setStepZoom(capabilities.zoom.step || 0.1);
          // @ts-ignore
          const currentSettingsZoom = track.getSettings?.()?.zoom;
          setCurrentZoom(typeof currentSettingsZoom === 'number' ? currentSettingsZoom : 1);
        } else {
          setZoomSupported(false);
        }

      } catch (err) {
        console.error("Error accessing camera:", err);
        let errorMessage = "Camera access denied. Please enable camera permissions in your browser settings.";
        if (err instanceof Error && err.name === "OverconstrainedError") {
            errorMessage = "Could not apply advanced camera settings. Trying with basic settings."
            console.warn("OverconstrainedError, attempting fallback without focusMode/resolution");
            try {
                const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }});
                streamRef.current = fallbackStream;
                setHasCameraPermission(true);
                if (videoRef.current) {
                    videoRef.current.srcObject = fallbackStream;
                }
                videoTrackRef.current = fallbackStream.getVideoTracks()[0];
                setZoomSupported(false); 
                toast({
                    variant: "default",
                    title: "Camera Initialized (Fallback)",
                    description: "Using basic camera mode. Advanced features like zoom might be unavailable."
                });
                return;
            } catch (fallbackErr) {
                 console.error("Fallback camera access also failed:", fallbackErr);
                 errorMessage = "Camera access denied. Please ensure permissions are enabled and no other app is using the camera.";
            }
        } else if (err instanceof Error && err.name === "NotAllowedError") {
          errorMessage = "Camera access was denied. Please enable camera permissions in your browser settings to use this feature.";
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

  const handleZoom = async (direction: 'in' | 'out') => {
    if (!videoTrackRef.current || !zoomSupported || isCapturing) return;
    let newZoom = currentZoom;
    if (direction === 'in') {
      newZoom = Math.min(maxZoom, currentZoom + stepZoom);
    } else {
      newZoom = Math.max(minZoom, currentZoom - stepZoom);
    }
    newZoom = parseFloat(newZoom.toFixed(2)); 

    try {
      // @ts-ignore
      await videoTrackRef.current.applyConstraints({ advanced: [{ zoom: newZoom }] });
      setCurrentZoom(newZoom);
    } catch (e) {
      console.error("Error applying zoom:", e);
      toast({ variant: "destructive", title: "Zoom Error", description: "Could not change zoom level." });
    }
  };

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
        'basic', 'stage 1', 'stage 2', 'vmax', 'vstar', ' tera', 'radiant', 'ex', 'gx',
        'hp', 'weakness', 'resistance', 'retreat cost', 'energy',
        'pokémon tool', 'item', 'supporter', 'stadium',
        'evolves from', 'no.', 'illus.', 'ability:', 'poké-power', 'poké-body'
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
            cleanedLine = cleanedLine.replace(/^[A-Z\s]+ Energy$/i, "").trim(); 
            if (/^\d+$/.test(cleanedLine) || cleanedLine.length < 2) continue; 
            potentialNameLines.push(cleanedLine);
        }
    }

    if (potentialNameLines.length > 0) {
        potentialNameLines.sort((a, b) => {
            const aSpecialSuffix = /\s(V|VMAX|VSTAR|GX|EX)$/i.test(a);
            const bSpecialSuffix = /\s(V|VMAX|VSTAR|GX|EX)$/i.test(b);
            if (aSpecialSuffix && !bSpecialSuffix) return -1; 
            if (!aSpecialSuffix && bSpecialSuffix) return 1; 
            return b.length - a.length; 
        });
        name = potentialNameLines[0];

        if (name) {
            const typeKeywords = ["Basic", "Stage 1", "Stage 2", "VMAX", "VSTAR", "Radiant", "Tera", "ex", "GX"];
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
        'Holo Rare': 'Holo Rare', 'Reverse Holo': 'Reverse Holo', 'Holo': 'Holo Rare',
        'Ultra Rare': 'Ultra Rare', 'Secret Rare': 'Secret Rare', 'Hyper Rare': 'Hyper Rare',
        'Amazing Rare': 'Amazing Rare', 'Radiant': 'Radiant Rare', 'Illustration Rare': 'Illustration Rare',
        'Special Illustration Rare': 'Special Illustration Rare', 'Double Rare': 'Double Rare',
        'PROMO': 'Promo',
    };
     
    if (cardNumber) {
        const cardNumberLineIndex = lines.findIndex(line => line.includes(cardNumber!));
        if (cardNumberLineIndex !== -1) {
            const lineWithNumber = lines[cardNumberLineIndex];
            const partsAroundNumber = lineWithNumber.split(cardNumber!);
            const textAfterNumber = partsAroundNumber[1] || "";
            const textBeforeNumber = partsAroundNumber[0] || "";

            const symbolRegex = /\b([CURPSATH])\b/i; 
            let match = textAfterNumber.trim().match(symbolRegex) || textBeforeNumber.trim().match(symbolRegex);
            if (match && match[1]) {
                const sym = match[1].toUpperCase();
                if (sym === 'C') rarity = 'Common';
                else if (sym === 'U') rarity = 'Uncommon';
                else if (sym === 'R') rarity = 'Rare';
                else if (sym === 'P') rarity = 'Promo';
                else if (sym === 'S') rarity = 'Secret Rare'; 
                else if (sym === 'H') rarity = 'Holo Rare';
            }
        }
    }
    
    if (!rarity) {
        for (let i = Math.max(0, lines.length - 5); i < lines.length; i++) {
            const lineUpper = lines[i].toUpperCase();
            for (const keyword in rarityKeywords) {
                if (lineUpper.includes(keyword.toUpperCase())) { 
                    rarity = rarityKeywords[keyword];
                    break;
                }
            }
            if (rarity) break;
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
      onScanComplete({ imageDataUri }); // Still pass image URI on OCR error
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
            This component is no longer primary. Use image upload on the Add Card page. <br/>
            Position card in the guide. Use zoom if needed. Good lighting and focus are key.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 my-4">
          <div className="w-full aspect-video bg-muted rounded-md overflow-hidden relative group">
            <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />

            <div className={cn(
              "absolute inset-0 flex items-center justify-center pointer-events-none transition-opacity duration-300",
              isCapturing ? "opacity-0" : "opacity-100"
            )}>
              <div
                className="w-[60%] aspect-[2.5/3.5] border-2 border-dashed border-background/70 rounded-lg"
                style={{
                  boxShadow: '0 0 0 9999px hsla(0, 0%, 0%, 0.3)', 
                }}
              />
            </div>

            {hasCameraPermission === null && !error && (
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

            {zoomSupported && hasCameraPermission && !isCapturing && (
              <div className="absolute bottom-3 right-3 flex flex-col gap-2 opacity-20 group-hover:opacity-100 transition-opacity duration-300">
                <Button
                  variant="secondary"
                  size="icon"
                  onClick={() => handleZoom('in')}
                  disabled={currentZoom >= maxZoom}
                  className="rounded-full h-10 w-10 shadow-md"
                  aria-label="Zoom In"
                >
                  <ZoomIn className="h-5 w-5" />
                </Button>
                <Button
                  variant="secondary"
                  size="icon"
                  onClick={() => handleZoom('out')}
                  disabled={currentZoom <= minZoom}
                  className="rounded-full h-10 w-10 shadow-md"
                  aria-label="Zoom Out"
                >
                  <ZoomOut className="h-5 w-5" />
                </Button>
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
            disabled={!hasCameraPermission || isCapturing || (!!error && !isCapturing && hasCameraPermission === null) }
            className="bg-accent hover:bg-accent/90 text-accent-foreground"
          >
            {isCapturing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Camera className="mr-2 h-4 w-4" /> // Changed icon
            )}
            {isCapturing ? (ocrStatus || "Processing...") : "Capture & Scan Card (Legacy)"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

    
