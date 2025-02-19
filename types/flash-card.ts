export interface Flashcard {
  id: number;
  question: string;
  answer: string;
  qImage?: IDBValidKey | null; // Change to IDBValidKey
  aImage?: IDBValidKey | null;
  isReverable: boolean;
}
