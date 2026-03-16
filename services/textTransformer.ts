import { COMMON_WORDS, POSITIVE_TO_NEGATIVE, PROFANITIES } from '../constants';
import { TransformationResult, TextSegment } from '../types';

const getRandomProfanity = (): string => {
  const index = Math.floor(Math.random() * PROFANITIES.length);
  return PROFANITIES[index];
};

const isPrepositionIndicator = (word: string): boolean => {
  return ['looks', 'feels', 'seems', 'sounds', 'tastes', 'is', 'was', 'are', 'were'].includes(word.toLowerCase());
};

export const transformSentence = (originalText: string): TransformationResult => {
  if (!originalText.trim()) {
    return { text: '', segments: [], profanityCountAdded: 0 };
  }

  const words = originalText.trim().split(/\s+/);
  let transformedWords: string[] = [];
  let segments: TextSegment[] = [];
  let countAdded = 0;

  for (let i = 0; i < words.length; i++) {
    const rawWord = words[i];
    const cleanWord = rawWord.replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "").toLowerCase();
    const punctuation = rawWord.replace(/[a-zA-Z0-9'-]/g, "");
    const prevWordRaw = i > 0 ? words[i - 1].toLowerCase().replace(/[^a-z]/g, "") : "";

    let didTransform = false;

    // --- RULE 2: Positive -> Negative ---
    if (cleanWord === 'like') {
      if (isPrepositionIndicator(prevWordRaw)) {
        // preposition, fall through to Rule 1
      } else {
        const replaced = 'hate' + punctuation;
        transformedWords.push(replaced);
        segments.push({ text: replaced, isTransformed: true });
        countAdded++;
        didTransform = true;
      }
    } else if (POSITIVE_TO_NEGATIVE[cleanWord]) {
      const replaced = POSITIVE_TO_NEGATIVE[cleanWord] + punctuation;
      transformedWords.push(replaced);
      segments.push({ text: replaced, isTransformed: true });
      countAdded++;
      didTransform = true;
    }

    // --- RULE 1: Common Words -> Insert Profanity ---
    if (!didTransform && COMMON_WORDS.has(cleanWord)) {
      const insertBefore = Math.random() > 0.5;
      const profanity = getRandomProfanity();

      if (insertBefore) {
        segments.push({ text: profanity, isTransformed: true });
        segments.push({ text: ' ' + rawWord, isTransformed: false });
        transformedWords.push(`${profanity} ${rawWord}`);
      } else {
        segments.push({ text: rawWord + ' ', isTransformed: false });
        segments.push({ text: profanity, isTransformed: true });
        transformedWords.push(`${rawWord} ${profanity}`);
      }
      countAdded++;
    } else if (!didTransform) {
      transformedWords.push(rawWord);
      segments.push({ text: rawWord, isTransformed: false });
    }

    // Add space between words
    if (i < words.length - 1) {
      segments.push({ text: ' ', isTransformed: false });
    }
  }

  return {
    text: transformedWords.join(' '),
    segments,
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