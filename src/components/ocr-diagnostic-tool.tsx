// File: src/components/OCRDiagnosticTool.tsx
'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Camera, Bug, CheckCircle } from 'lucide-react';
import { findCardByImageEnhanced, testImageVisibility } from '@/ai/flows/find-card-by-image-flow';
import Image from 'next/image';

export function OCRDiagnosticTool() {
  const [isLoading, setIsLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageDescription, setImageDescription] = useState<string>('');
  const [cardResult, setCardResult] = useState<any>(null);
  const [error, setError] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setError('');
    setImageDescription('');
    setCardResult(null);

    try {
      // Convert file to data URL
      const dataUrl = await fileToDataUrl(file);
      setImagePreview(dataUrl);

      console.log('Image size:', file.size, 'bytes');
      console.log('Image type:', file.type);
      console.log('Data URL length:', dataUrl.length);

      // Test 1: Can AI see the image at all?
      console.log('Testing image visibility...');
      const description = await testImageVisibility(dataUrl);
      setImageDescription(description);
      console.log('AI description:', description);

      // Test 2: Try to extract card data
      console.log('Attempting card extraction...');
      const result = await findCardByImageEnhanced({ imageDataUri: dataUrl });
      setCardResult(result);
      console.log('Card result:', result);
    } catch (err: any) {
      console.error('Error:', err);
      setError(err.message || 'Unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bug className="h-5 w-5" />
            OCR Diagnostic Tool
          </CardTitle>
        </CardHeader>
        <CardContent>
          <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            ref={fileInputRef}
            className="hidden"
          />
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            className="w-full"
            size="lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Testing...
              </>
            ) : (
              <>
                <Camera className="mr-2 h-4 w-4" />
                Upload Test Image
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Image Preview */}
      {imagePreview && (
        <Card>
          <CardHeader>
            <CardTitle>Uploaded Image</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative aspect-[63/88] w-full max-w-sm mx-auto">
              <Image
                src={imagePreview}
                alt="Test image"
                fill
                sizes="(max-width: 640px) 100vw, 384px"
                className="object-contain rounded-lg border"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Display */}
      {error && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-red-600">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-600">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Test 1: Image Visibility */}
      {imageDescription && (
        <Card className="border-green-200">
          <CardHeader>
            <CardTitle className="text-green-600 flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Test 1: AI Can See the Image ✓
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-2">AI Description of what it sees:</p>
            <Textarea value={imageDescription} readOnly className="min-h-[100px]" />
          </CardContent>
        </Card>
      )}

      {/* Test 2: Card Data Extraction */}
      {cardResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Test 2: Card Data Extraction
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Name:</label>
                  <p className={cardResult.name ? 'text-green-600' : 'text-red-500'}>
                    {cardResult.name || '❌ Not detected'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Set:</label>
                  <p className={cardResult.set ? 'text-green-600' : 'text-red-500'}>
                    {cardResult.set || '❌ Not detected'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Card Number:</label>
                  <p className={cardResult.cardNumber ? 'text-green-600' : 'text-red-500'}>
                    {cardResult.cardNumber || '❌ Not detected'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Rarity:</label>
                  <p className={cardResult.rarity ? 'text-green-600' : 'text-red-500'}>
                    {cardResult.rarity || '❌ Not detected'}
                  </p>
                </div>
              </div>

              {cardResult.rawText && (
                <div>
                  <label className="text-sm font-medium">Raw Text Extracted:</label>
                  <Textarea
                    value={cardResult.rawText}
                    readOnly
                    className="mt-2 min-h-[100px] font-mono text-sm"
                  />
                </div>
              )}

              <details className="mt-4">
                <summary className="cursor-pointer text-sm font-medium">Raw JSON Response</summary>
                <pre className="mt-2 p-3 bg-muted rounded text-xs overflow-auto">
                  {JSON.stringify(cardResult, null, 2)}
                </pre>
              </details>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>How to Use This Tool</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li>Upload a clear photo of a Pokemon card</li>
            <li>Check if "Test 1" passes - this means the AI can see your image</li>
            <li>Check "Test 2" results - this shows what card data was extracted</li>
            <li>Look at the browser console (F12) for detailed logs</li>
            <li>If Test 1 fails, there's an issue with image processing</li>
            <li>If Test 1 passes but Test 2 fails, we need to improve the prompts</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
