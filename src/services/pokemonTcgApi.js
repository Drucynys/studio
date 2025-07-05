// src/services/pokemonTcgApi.js
// Enhanced Pokemon TCG API Search Service

// API Configuration
const POKEMON_TCG_API_BASE = 'https://api.pokemontcg.io/v2';
const DEFAULT_PAGE_SIZE = 25;

/**
 * Enhanced card search using multi-tier strategy
 * @param {Object} detectedData - Data from OCR: {name, cardNumber, set}
 * @returns {Array} - Array of matching cards
 */
async function findCardOnAPI(detectedData) {
  console.log('🔍 Starting enhanced API search with data:', detectedData);
  
  const { name, cardNumber, set } = detectedData;
  
  if (!name) {
    console.warn('⚠️ No Pokemon name detected, cannot search API');
    return [];
  }
  
  // TIER 1: Perfect Match (name + number + set)
  if (name && cardNumber && set) {
    console.log('🎯 TIER 1: Attempting perfect match search');
    const results = await searchTier1(name, cardNumber, set);
    if (results.length > 0) {
      console.log('✅ TIER 1 SUCCESS:', results.length, 'results');
      return results;
    }
  }
  
  // TIER 2: Name + Number (high confidence)
  if (name && cardNumber) {
    console.log('🎯 TIER 2: Attempting name + number search');
    const results = await searchTier2(name, cardNumber);
    if (results.length > 0) {
      console.log('✅ TIER 2 SUCCESS:', results.length, 'results');
      return results;
    }
  }
  
  // TIER 3: Name + Set (medium confidence)
  if (name && set) {
    console.log('🎯 TIER 3: Attempting name + set search');
    const results = await searchTier3(name, set);
    if (results.length > 0) {
      console.log('✅ TIER 3 SUCCESS:', results.length, 'results');
      return filterAndRankResults(results, detectedData);
    }
  }
  
  // TIER 4: Name only with smart filtering (lower confidence)
  if (name) {
    console.log('🎯 TIER 4: Attempting name-only search with smart filtering');
    const results = await searchTier4(name);
    if (results.length > 0) {
      console.log('✅ TIER 4 SUCCESS:', results.length, 'results before filtering');
      return filterAndRankResults(results, detectedData);
    }
  }
  
  console.log('❌ No matches found in any tier');
  return [];
}

// TIER 1: Perfect match using all available data
async function searchTier1(name, cardNumber, set) {
  console.log(`🔍 TIER 1: Searching for "${name}" #${cardNumber} from "${set}"`);
  
  // Strategy 1a: Exact set name match
  let query = `name:"${name.toLowerCase()}" AND number:${cardNumber} AND set.name:"${set}"`;
  let results = await makeAPICall(query, 'TIER 1a - Exact set name');
  
  if (results.length > 0) return results;
  
  // Strategy 1b: Fuzzy set matching (for "Base Set" vs "Base")
  const setVariations = generateSetVariations(set);
  for (const setVar of setVariations) {
    query = `name:"${name.toLowerCase()}" AND number:${cardNumber} AND set.name:"${setVar}"`;
    results = await makeAPICall(query, `TIER 1b - Set variation: ${setVar}`);
    if (results.length > 0) return results;
  }
  
  // Strategy 1c: Search by set series (for older sets)
  if (set.toLowerCase().includes('base')) {
    query = `name:"${name.toLowerCase()}" AND number:${cardNumber} AND set.series:"Base"`;
    results = await makeAPICall(query, 'TIER 1c - Base series');
    if (results.length > 0) return results;
  }
  
  return [];
}

// TIER 2: Name + Number (without set constraint)
async function searchTier2(name, cardNumber) {
  console.log(`🔍 TIER 2: Searching for "${name}" #${cardNumber}`);
  
  // Strategy 2a: Exact name and number
  let query = `name:"${name.toLowerCase()}" AND number:${cardNumber}`;
  let results = await makeAPICall(query, 'TIER 2a - Exact name and number');
  
  if (results.length > 0) return results;
  
  // Strategy 2b: Handle card number format variations (4 vs 004)
  const numberVariations = generateNumberVariations(cardNumber);
  for (const numVar of numberVariations) {
    query = `name:"${name.toLowerCase()}" AND number:${numVar}`;
    results = await makeAPICall(query, `TIER 2b - Number variation: ${numVar}`);
    if (results.length > 0) return results;
  }
  
  return [];
}

// TIER 3: Name + Set (without number constraint)
async function searchTier3(name, set) {
  console.log(`🔍 TIER 3: Searching for "${name}" from "${set}"`);
  
  // Strategy 3a: Exact set name
  let query = `name:"${name.toLowerCase()}" AND set.name:"${set}"`;
  let results = await makeAPICall(query, 'TIER 3a - Exact set');
  
  if (results.length > 0) return results;
  
  // Strategy 3b: Set variations
  const setVariations = generateSetVariations(set);
  for (const setVar of setVariations) {
    query = `name:"${name.toLowerCase()}" AND set.name:"${setVar}"`;
    results = await makeAPICall(query, `TIER 3b - Set variation: ${setVar}`);
    if (results.length > 0) return results;
  }
  
  return [];
}

// TIER 4: Name only with post-filtering
async function searchTier4(name) {
  console.log(`🔍 TIER 4: Searching for "${name}" only`);
  
  // Strategy 4a: Exact name match
  let query = `name:"${name.toLowerCase()}"`;
  let results = await makeAPICall(query, 'TIER 4a - Exact name', 100);
  
  if (results.length > 0) return results;
  
  // Strategy 4b: Fuzzy name matching
  query = `name:${name.toLowerCase()}*`;
  results = await makeAPICall(query, 'TIER 4b - Fuzzy name', 100);
  
  return results;
}

// Core API call function
async function makeAPICall(query, strategy, pageSize = DEFAULT_PAGE_SIZE) {
  try {
    console.log(`📡 ${strategy}: ${query}`);
    
    const params = new URLSearchParams({
      q: query,
      pageSize: pageSize.toString(),
      orderBy: 'set.releaseDate,-number'
    });
    
    const response = await fetch(`${POKEMON_TCG_API_BASE}/cards?${params}`);
    
    if (!response.ok) {
      console.error(`❌ API Error ${response.status}: ${response.statusText}`);
      return [];
    }
    
    const data = await response.json();
    console.log(`📊 ${strategy} - Found ${data.data.length} results`);
    
    return data.data || [];
    
  } catch (error) {
    console.error(`❌ ${strategy} - Network error:`, error);
    return [];
  }
}

// Generate set name variations for better matching
function generateSetVariations(setName) {
  const variations = new Set();
  const lower = setName.toLowerCase();
  
  variations.add(setName);
  variations.add(lower);
  
  const setMappings = {
    'base set': ['Base', 'Base Set', 'base'],
    'base': ['Base Set', 'base set'],
    'jungle': ['Jungle'],
    'fossil': ['Fossil'],
    'team rocket': ['Team Rocket'],
    'scarlet & violet': ['Scarlet & Violet', 'Scarlet and Violet'],
  };
  
  const mapping = setMappings[lower];
  if (mapping) {
    mapping.forEach(variant => variations.add(variant));
  }
  
  return Array.from(variations);
}

// Generate card number variations (4, 004, etc.)
function generateNumberVariations(cardNumber) {
  const variations = new Set();
  
  variations.add(cardNumber);
  
  if (/^\d+$/.test(cardNumber)) {
    const num = parseInt(cardNumber);
    variations.add(num.toString());
    variations.add(num.toString().padStart(3, '0'));
    variations.add(num.toString().padStart(2, '0'));
  }
  
  if (cardNumber.includes('/')) {
    const number = cardNumber.split('/')[0];
    variations.add(number);
    variations.add(number.padStart(3, '0'));
  }
  
  return Array.from(variations);
}

// Filter and rank results based on confidence
function filterAndRankResults(results, detectedData) {
  console.log('🔄 Filtering and ranking results...');
  
  const { name, cardNumber, set } = detectedData;
  
  const scoredResults = results.map(card => {
    let score = 0;
    let confidence = 'medium';
    
    // Name matching score
    if (card.name.toLowerCase() === name.toLowerCase()) {
      score += 100;
    } else if (card.name.toLowerCase().includes(name.toLowerCase())) {
      score += 80;
    } else {
      score += 50;
    }
    
    // Card number matching bonus
    if (cardNumber) {
      const cardNum = cardNumber.includes('/') ? cardNumber.split('/')[0] : cardNumber;
      if (card.number === cardNum || card.number === cardNumber) {
        score += 50;
        confidence = 'high';
      }
    }
    
    // Set matching bonus
    if (set && card.set) {
      if (card.set.name.toLowerCase().includes(set.toLowerCase()) || 
          set.toLowerCase().includes(card.set.name.toLowerCase())) {
        score += 30;
        confidence = 'high';
      }
    }
    
    // Prefer older/more iconic sets for classic Pokemon
    if (name.toLowerCase() === 'charizard' && card.set.series === 'Base') {
      score += 20;
    }
    
    return {
      ...card,
      searchScore: score,
      searchConfidence: confidence
    };
  });
  
  const ranked = scoredResults.sort((a, b) => b.searchScore - a.searchScore);
  
  console.log('🏆 Top results:', ranked.slice(0, 3).map(r => ({
    name: r.name,
    set: r.set.name,
    number: r.number,
    score: r.searchScore,
    confidence: r.searchConfidence
  })));
  
  return ranked;
}

// Transform API results to your app's format
function transformToSearchResults(apiResults) {
  return apiResults.map(card => ({
    id: card.id,
    name: card.name,
    set: card.set.name,
    cardNumber: card.number,
    imageUrl: card.images?.large || card.images?.small,
    confidence: card.searchConfidence || 'medium',
    score: card.searchScore || 0,
    rarity: card.rarity,
    artist: card.artist,
    setId: card.set.id,
    releaseDate: card.set.releaseDate
  }));
}

// Main export function
export async function searchCardsEnhanced(detectedData) {
  try {
    console.log('🚀 Starting enhanced card search...');
    
    const apiResults = await findCardOnAPI(detectedData);
    
    if (apiResults.length === 0) {
      console.log('❌ No cards found');
      return [];
    }
    
    const searchResults = transformToSearchResults(apiResults);
    
    console.log('✅ Search complete:', searchResults.length, 'results');
    
    return searchResults;
    
  } catch (error) {
    console.error('❌ Enhanced search failed:', error);
    return [];
  }
}