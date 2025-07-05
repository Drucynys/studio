// File: src/lib/image-preprocessing.ts

/**
 * Image preprocessing utilities to improve OCR accuracy
 */

export interface ProcessingOptions {
  targetWidth?: number;
  targetHeight?: number;
  enhanceContrast?: boolean;
  sharpen?: boolean;
  grayscale?: boolean;
  cropToCard?: boolean;
}

export async function preprocessImageForOCR(
  file: File | string,
  options: ProcessingOptions = {}
): Promise<string> {
  const {
    targetWidth = 1200,
    targetHeight = 1600,
    enhanceContrast = true,
    sharpen = true,
    grayscale = false,
    cropToCard = false,
  } = options;

  let imageDataUrl: string;
  
  if (typeof file === 'string') {
    imageDataUrl = file;
  } else {
    imageDataUrl = await fileToDataUrl(file);
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;

      // Calculate optimal size while maintaining aspect ratio
      const aspectRatio = img.width / img.height;
      let newWidth = targetWidth;
      let newHeight = targetHeight;

      if (aspectRatio > newWidth / newHeight) {
        newHeight = newWidth / aspectRatio;
      } else {
        newWidth = newHeight * aspectRatio;
      }

      canvas.width = newWidth;
      canvas.height = newHeight;

      // Draw the image
      ctx.drawImage(img, 0, 0, newWidth, newHeight);

      // Apply image enhancements
      if (enhanceContrast || sharpen || grayscale) {
        const imageData = ctx.getImageData(0, 0, newWidth, newHeight);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
          let r = data[i];
          let g = data[i + 1];
          let b = data[i + 2];

          // Convert to grayscale if requested
          if (grayscale) {
            const gray = 0.299 * r + 0.587 * g + 0.114 * b;
            r = g = b = gray;
          }

          // Enhance contrast
          if (enhanceContrast) {
            const contrast = 1.2; // Adjust as needed
            r = Math.min(255, Math.max(0, (r - 128) * contrast + 128));
            g = Math.min(255, Math.max(0, (g - 128) * contrast + 128));
            b = Math.min(255, Math.max(0, (b - 128) * contrast + 128));
          }

          data[i] = r;
          data[i + 1] = g;
          data[i + 2] = b;
        }

        ctx.putImageData(imageData, 0, 0);
      }

      // Apply sharpening filter
      if (sharpen) {
        applySharpenFilter(ctx, newWidth, newHeight);
      }

      resolve(canvas.toDataURL('image/jpeg', 0.9));
    };
    img.src = imageDataUrl;
  });
}

function applySharpenFilter(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const newData = new Uint8ClampedArray(data);

  // Sharpening kernel
  const kernel = [
    0, -1, 0,
    -1, 5, -1,
    0, -1, 0
  ];

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      for (let c = 0; c < 3; c++) { // RGB channels
        let sum = 0;
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const pixelIndex = ((y + ky) * width + (x + kx)) * 4 + c;
            const kernelIndex = (ky + 1) * 3 + (kx + 1);
            sum += data[pixelIndex] * kernel[kernelIndex];
          }
        }
        newData[(y * width + x) * 4 + c] = Math.min(255, Math.max(0, sum));
      }
    }
  }

  const newImageData = new ImageData(newData, width, height);
  ctx.putImageData(newImageData, 0, 0);
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Utility to detect if image might be rotated
export function detectImageRotation(imageDataUrl: string): Promise<number> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      
      // Simple heuristic: check if width > height (landscape)
      // Most Pokemon cards are portrait, so landscape might mean rotation needed
      if (img.width > img.height) {
        resolve(90); // Suggest 90-degree rotation
      } else {
        resolve(0); // No rotation needed
      }
    };
    img.src = imageDataUrl;
  });
}

// Crop image to focus on the card area
export async function cropToCardArea(imageDataUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      
      // Assume card takes up central 80% of image
      const cropMargin = 0.1; // 10% margin on each side
      const cropX = img.width * cropMargin;
      const cropY = img.height * cropMargin;
      const cropWidth = img.width * (1 - 2 * cropMargin);
      const cropHeight = img.height * (1 - 2 * cropMargin);
      
      canvas.width = cropWidth;
      canvas.height = cropHeight;
      
      ctx.drawImage(
        img,
        cropX, cropY, cropWidth, cropHeight,
        0, 0, cropWidth, cropHeight
      );
      
      resolve(canvas.toDataURL('image/jpeg', 0.9));
    };
    img.src = imageDataUrl;
  });
}
