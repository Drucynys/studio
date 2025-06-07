
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
import { Loader2, Camera, ScanLine, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { scanCard, type ScanCardOutput } from "@/ai/flows/scan-card-flow";

type CardScannerDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onScanComplete: (scannedData: ScanCardOutput) => void;
};

export function CardScannerDialog({ isOpen, onClose, onScanComplete }: CardScannerDialogProps) {
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setHasCameraPermission(null); // Reset permission status when dialog closes
      return;
    }

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
        setError(
          "Camera access denied. Please enable camera permissions in your browser settings."
        );
        setHasCameraPermission(false);
        toast({
          variant: "destructive",
          title: "Camera Access Denied",
          description: "Please enable camera permissions in your browser settings.",
        });
      }
    };

    getCameraPermission();

    // Cleanup function to stop camera when component unmounts or dialog closes
    return () => {
      stopCamera();
    };
  }, [isOpen, toast, stopCamera]);

  const handleCaptureAndScan = async () => {
    if (!videoRef.current || !canvasRef.current || !hasCameraPermission) {
      toast({ variant: "destructive", title: "Scanner Error", description: "Camera not ready or no permission." });
      return;
    }
    setIsScanning(true);
    setError(null);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) {
        toast({ variant: "destructive", title: "Canvas Error", description: "Could not get canvas context." });
        setIsScanning(false);
        return;
    }
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageDataUri = canvas.toDataURL("image/jpeg");

    try {
      const result = await scanCard({ imageDataUri });
      if (result.error && !result.isPokemonCard) {
        toast({ variant: "destructive", title: "Scan Failed", description: result.error });
      } else if (!result.isPokemonCard) {
        toast({ variant: "destructive", title: "Not a Pokémon Card", description: "The scanned image does not appear to be a Pokémon card." });
      } else {
        toast({ title: "Scan Successful!", description: `Found: ${result.name || 'Unknown Name'}, Set: ${result.set || 'Unknown Set'}`});
        onScanComplete(result);
      }
    } catch (e) {
      console.error("Error during AI scan:", e);
      toast({ variant: "destructive", title: "AI Scan Error", description: e instanceof Error ? e.message : "An unknown error occurred during scanning." });
    } finally {
      setIsScanning(false);
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
          <DialogTitle className="flex items-center gap-2"><Camera className="h-6 w-6 text-primary" /> Card Scanner</DialogTitle>
          <DialogDescription>
            Position your Pokémon card clearly in the frame and capture.
            Ensure good lighting for best results.
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
          </div>
          <canvas ref={canvasRef} style={{ display: "none" }} />

          {hasCameraPermission === false && error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Camera Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={handleDialogClose} disabled={isScanning}>
            Cancel
          </Button>
          <Button 
            onClick={handleCaptureAndScan} 
            disabled={!hasCameraPermission || isScanning}
            className="bg-accent hover:bg-accent/90 text-accent-foreground"
          >
            {isScanning ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <ScanLine className="mr-2 h-4 w-4" />
            )}
            {isScanning ? "Scanning..." : "Capture & Scan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
