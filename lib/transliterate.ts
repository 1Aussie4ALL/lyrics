// Detection and transliteration utility for foreign language lyrics

/**
 * Detects if text contains non-Latin characters
 */
export function hasNonLatinCharacters(text: string): boolean {
  // Check if text contains characters outside the basic Latin range
  return /[^\x00-\x7F]/.test(text);
}

/**
 * Transliterates text to Latin characters
 * Handles Cyrillic, Arabic, Chinese, Japanese, Korean, Greek, etc.
 */
export function transliterate(text: string): string {
  if (!hasNonLatinCharacters(text)) {
    return text; // Already in Latin script
  }

  // Use unidecode to transliterate
  try {
    const unidecode = require('unidecode');
    return unidecode(text);
  } catch (error) {
    console.error("Transliteration error:", error);
    return text; // Return original if transliteration fails
  }
}

/**
 * Detects the primary script used in the text
 */
export function detectScript(text: string): 'latin' | 'cyrillic' | 'arabic' | 'cjk' | 'other' {
  if (!hasNonLatinCharacters(text)) {
    return 'latin';
  }

  // Check for Cyrillic (Russian, Bulgarian, etc.)
  if (/[\u0400-\u04FF]/.test(text)) {
    return 'cyrillic';
  }

  // Check for Arabic
  if (/[\u0600-\u06FF]/.test(text)) {
    return 'arabic';
  }

  // Check for CJK (Chinese, Japanese, Korean)
  if (/[\u4E00-\u9FFF\u3040-\u309F\u30A0-\u30FF\uAC00-\uD7AF]/.test(text)) {
    return 'cjk';
  }

  return 'other';
}

/**
 * Main transliteration function
 * Returns both original and transliterated versions
 */
export function transliterateLyrics(lyrics: string): string {
  const script = detectScript(lyrics);
  
  if (script === 'latin') {
    return lyrics;
  }

  console.log(`Detected ${script} script, transliterating to English...`);
  
  const transliterated = transliterate(lyrics);
  
  console.log(`Transliteration complete. Example: "${lyrics.substring(0, 50)}" -> "${transliterated.substring(0, 50)}"`);
  
  return transliterated;
}

