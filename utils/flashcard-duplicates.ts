import { FlashcardExport } from "@/utils/flashcard-json";

export function flashcardKey(card: {
  question: string;
  answer: string;
}): string {
  return `${card.question.trim().toLowerCase()}|${card.answer.trim().toLowerCase()}`;
}

export function filterDuplicateFlashcards(
  incoming: FlashcardExport[],
  existing: FlashcardExport[]
): { toImport: FlashcardExport[]; skipped: FlashcardExport[] } {
  const seen = new Set(existing.map(flashcardKey));
  const toImport: FlashcardExport[] = [];
  const skipped: FlashcardExport[] = [];

  for (const card of incoming) {
    const key = flashcardKey(card);
    if (seen.has(key)) {
      skipped.push(card);
    } else {
      toImport.push(card);
      seen.add(key);
    }
  }

  return { toImport, skipped };
}

export function isDuplicateFlashcard(
  card: FlashcardExport,
  existing: FlashcardExport[]
): boolean {
  const key = flashcardKey(card);
  return existing.some((item) => flashcardKey(item) === key);
}
