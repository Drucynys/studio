// Image processing Web Worker
self.onmessage = async function(e) {
  const { imageDataUrl, options } = e.data;
  
  try {
    const processedImage = await processImageInWorker(imageDataUrl, options);
    self.postMessage({ success: true, result: processedImage });
  } catch (error) {
    self.postMessage({ success: false, error: error.message });
  }
};

async function processImageInWorker(imageDataUrl, options = {}) {
  const {
    targetWidth = 1200,
    targetHeight = 1600,
    enhanceContrast = true,
    sharpen = true,
    grayscale = false,
  } = options;

  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => {
      try {
        // Create OffscreenCanvas for better performance
        const canvas = new OffscreenCanvas(targetWidth, targetHeight);
        const ctx = canvas.getContext('2d');

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
              const contrast = 1.2;
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

        // Convert to blob for better memory management
        canvas.convertToBlob({ type: 'image/jpeg', quality: 0.9 }).then(blob => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.readAsDataURL(blob);
        });

      } catch (error) {
        reject(error);
      }
    };
    
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = imageDataUrl;
  });
}

function applySharpenFilter(ctx, width, height) {
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