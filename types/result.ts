export interface FlashcardResult {
  flashcardId: string;
  correct: boolean;
  tries: number;
  timeTaken: number; // in milliseconds
}

export interface TestResult {
  id?: number; // Optional because it will be auto-generated
  deckId: number;
  flashcardResults: FlashcardResult[];
  totalTimeTaken: number; // in milliseconds
  date: Date;
  // Add any additional fields you think are necessary
}
