export interface TextSegment {
  text: string;
  isTransformed: boolean;
}

export interface TransformationResult {
  text: string;
  segments: TextSegment[];
  profanityCountAdded: number;
}

export interface AppState {
  isListening: boolean;
  transcript: string;
  transformedTranscript: string;
  totalProfanityCount: number;
  error: string | null;
}

export enum SpeechState {
  IDLE = 'IDLE',
  LISTENING = 'LISTENING',
  ERROR = 'ERROR'
}