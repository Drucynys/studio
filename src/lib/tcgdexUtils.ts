
const TCGDEX_IMAGE_BASE_URL = "https://assets.tcgdex.net";

export const getSafeTcgDexCardImageUrl = (
  basePathSegment: string | undefined | null,
  quality: 'high' | 'low' = 'low',
  extension: 'png' | 'webp' | 'jpg' = 'webp'
): string | null => {
  if (!basePathSegment || typeof basePathSegment !== 'string') return null;
  let trimmedPath = basePathSegment.trim();

  // If it already looks like a full URL with an extension, use it.
  if (trimmedPath.match(/\.(png|webp|jpg)$/i)) {
    if (trimmedPath.startsWith(TCGDEX_IMAGE_BASE_URL)) {
      return trimmedPath;
    }
    // If it's a relative path with an extension.
    if (trimmedPath.startsWith('/')) {
      return `${TCGDEX_IMAGE_BASE_URL}${trimmedPath}`;
    }
    // Or a path segment that happens to end in an extension but needs the base.
    return `${TCGDEX_IMAGE_BASE_URL}/${trimmedPath}`;
  }

  // If it's just a path segment (e.g., "swsh35/73")
  const corePath = trimmedPath.replace(/^\/+|\/+$/g, ''); // Remove leading/trailing slashes
  if (corePath.length < 3) return null; // Basic sanity check

  let fullBasePath = corePath;
  if (!corePath.startsWith('http')) { // If not already a full URL
    fullBasePath = `${TCGDEX_IMAGE_BASE_URL}/${corePath}`;
  } else if (!corePath.startsWith(TCGDEX_IMAGE_BASE_URL)){ // If it's a full URL but wrong domain
    return null; // Or handle as error
  }
  
  return `${fullBasePath}/${quality}.${extension}`;
};

export const getSafeTcgDexSetAssetUrl = (
  assetPathInput: string | undefined | null,
  extension: 'png' | 'webp' = 'webp'
): string | null => {
  if (!assetPathInput || typeof assetPathInput !== 'string') return null;
  let basePath = assetPathInput.trim();

  // If it already looks like a full URL with an extension, use it.
  if (basePath.match(/\.(png|webp|jpg)$/i)) {
     if (basePath.startsWith(TCGDEX_IMAGE_BASE_URL)) {
      return basePath;
    }
    if (basePath.startsWith('/')) { // Relative path with extension
      return `${TCGDEX_IMAGE_BASE_URL}${basePath}`;
    }
    return `${TCGDEX_IMAGE_BASE_URL}/${basePath}`; // Path segment with extension
  }
  
  // If it's just a path segment (e.g., "swsh3/logo")
  const corePath = basePath.replace(/^\/+|\/+$/g, ''); // Remove leading/trailing slashes
  if (corePath.length < 3) return null; // Basic sanity check

  let fullBasePath = corePath;
  if (!corePath.startsWith('http')) { // If not already a full URL
    fullBasePath = `${TCGDEX_IMAGE_BASE_URL}/${corePath}`;
  } else if (!corePath.startsWith(TCGDEX_IMAGE_BASE_URL)){ // If it's a full URL but wrong domain
    return null; 
  }

  return `${fullBasePath}.${extension}`;
};
