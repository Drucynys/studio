// src/hooks/useImageProcessor.ts
import { useState, useEffect, useCallback, useRef } from 'react';

interface ProcessingOptions {
  targetWidth?: number;
  targetHeight?: number;
  enhanceContrast?: boolean;
  sharpen?: boolean;
  grayscale?: boolean;
}

export function useImageProcessor() {
  const [worker, setWorker] = useState<Worker | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    // Create worker only on client side
    if (typeof window !== 'undefined') {
      try {
        const imageWorker = new Worker('/workers/imageProcessor.worker.js');
        setWorker(imageWorker);
        workerRef.current = imageWorker;

        return () => {
          imageWorker.terminate();
          workerRef.current = null;
        };
      } catch (err) {
        console.error('Failed to create image processing worker:', err);
        setError('Image processing not available');
      }
    }
  }, []);

  const processImage = useCallback(
    (imageDataUrl: string, options: ProcessingOptions = {}): Promise<string> => {
      return new Promise((resolve, reject) => {
        if (!worker || !workerRef.current) {
          reject(new Error('Worker not available'));
          return;
        }

        setIsProcessing(true);
        setError(null);

        const handleMessage = (e: MessageEvent) => {
          const { success, result, error } = e.data;

          if (success) {
            resolve(result);
          } else {
            setError(error);
            reject(new Error(error));
          }

          setIsProcessing(false);
          worker.removeEventListener('message', handleMessage);
        };

        const handleError = (err: ErrorEvent) => {
          setError('Worker processing failed');
          setIsProcessing(false);
          reject(new Error('Worker processing failed'));
          worker.removeEventListener('error', handleError);
        };

        worker.addEventListener('message', handleMessage);
        worker.addEventListener('error', handleError);

        worker.postMessage({ imageDataUrl, options });
      });
    },
    [worker]
  );

  const processImageWithProgress = useCallback(
    async (
      imageDataUrl: string,
      options: ProcessingOptions = {},
      onProgress?: (step: string) => void
    ): Promise<string> => {
      const steps = [
        'Initializing processing...',
        'Resizing image...',
        'Enhancing contrast...',
        'Applying sharpening...',
        'Finalizing...',
      ];

      if (onProgress) {
        for (let i = 0; i < steps.length; i++) {
          onProgress(steps[i]);
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }

      return processImage(imageDataUrl, options);
    },
    [processImage]
  );

  return {
    processImage,
    processImageWithProgress,
    isProcessing,
    error,
    isAvailable: !!worker,
  };
}
