import { COMMON_WORDS, POSITIVE_TO_NEGATIVE, PROFANITIES } from '../constants';
import { TransformationResult } from '../types';

const getRandomProfanity = (): string => {
  const index = Math.floor(Math.random() * PROFANITIES.length);
  return PROFANITIES[index];
};

const isPronoun = (word: string): boolean => {
  return ['i', 'you', 'he', 'she', 'it', 'we', 'they', 'who'].includes(word.toLowerCase());
};

const isPrepositionIndicator = (word: string): boolean => {
  return ['looks', 'feels', 'seems', 'sounds', 'tastes', 'is', 'was', 'are', 'were'].includes(word.toLowerCase());
};

export const transformSentence = (originalText: string): TransformationResult => {
  if (!originalText.trim()) {
    return { text: '', profanityCountAdded: 0 };
  }

  const words = originalText.trim().split(/\s+/);
  let transformedWords: string[] = [];
  let countAdded = 0;

  for (let i = 0; i < words.length; i++) {
    const rawWord = words[i];
    // Remove punctuation for checking, keep it for rendering
    const cleanWord = rawWord.replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "").toLowerCase();
    const punctuation = rawWord.replace(/[a-zA-Z0-9'-]/g, ""); 
    
    // Check previous word for context
    const prevWordRaw = i > 0 ? words[i - 1].toLowerCase().replace(/[^a-z]/g, "") : "";

    let processedWord = rawWord;
    let didTransform = false;

    // --- RULE 2: Positive -> Negative ---
    // Special handling for "like"
    if (cleanWord === 'like') {
      // Heuristic: If previous word is a preposition indicator (looks like), it's a preposition -> Rule 1
      // If previous word is a pronoun (I like), it's a verb -> Rule 2
      if (isPrepositionIndicator(prevWordRaw)) {
        // Treat as preposition, SKIP Rule 2, fall through to Rule 1
      } else {
        // Treat as Verb (e.g. "I like"), force replace to 'hate' (conceptually negative)
        processedWord = 'hate' + punctuation;
        countAdded++;
        didTransform = true;
      }
    } 
    // General Positive Adjective Replacement
    else if (POSITIVE_TO_NEGATIVE[cleanWord]) {
      processedWord = POSITIVE_TO_NEGATIVE[cleanWord] + punctuation;
      countAdded++;
      didTransform = true;
    }

    // --- RULE 1: Common Words -> Insert Profanity ---
    // Only applies if Rule 2 didn't trigger
    if (!didTransform && COMMON_WORDS.has(cleanWord)) {
      // 50% chance to insert before, 50% after, but only if it flows reasonably
      const insertBefore = Math.random() > 0.5;
      const profanity = getRandomProfanity();
      
      if (insertBefore) {
        processedWord = `${profanity} ${rawWord}`;
      } else {
        processedWord = `${rawWord} ${profanity}`;
      }
      countAdded++;
    }

    transformedWords.push(processedWord);
  }

  return {
    text: transformedWords.join(' '),
    profanityCountAdded: countAdded
  };
};

/**
 * Calculates the *difference* between a new transcript and the previously processed one
 * to avoid double counting the same words in a streaming context.
 */
export const processRealtimeTranscript = (
  fullTranscript: string, 
  previousLength: number
): { text: string, deltaCount: number, newLength: number } => {
  
  // We only care about the *new* part of the sentence for counting, 
  // but we want to display the *whole* transformed sentence.
  // This is tricky because the API corrects previous words.
  // Simpler approach for this specific app:
  // Re-transform the entire string every time for display consistency.
  // BUT, for the *counter*, we need to be careful.
  
  // Strategy: 
  // 1. Transform the full text.
  // 2. Count total "bad words" in the full transformed text.
  // 3. Return the total count directly. 
  // The App component will manage the "Total Session Count" by tracking the max count of the current sentence?
  // No, speech recognition clears when you pause.
  
  const result = transformSentence(fullTranscript);
  
  // To handle the counter correctly in a streaming setup where words might change:
  // We will return the TOTAL count for this current specific utterance.
  // The parent component should reset its "current utterance count" when silence happens.
  
  return {
    text: result.text,
    deltaCount: result.profanityCountAdded, // This is the total count for THIS transcript chunk
    newLength: fullTranscript.length
  };
};