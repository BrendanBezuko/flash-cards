import { Flashcard } from "@/types/flash-card";

export type FlashcardExport = {
  question: string;
  answer: string;
  isReverable?: boolean;
};

export type FlashcardExportFile = {
  version: 1;
  deck?: string;
  flashcards: FlashcardExport[];
};

export type ParsedFlashcardFile = {
  deckName?: string;
  flashcards: FlashcardExport[];
};

export function flashcardsToExport(
  flashcards: Flashcard[],
  deckName?: string
): FlashcardExportFile {
  return {
    version: 1,
    ...(deckName ? { deck: deckName } : {}),
    flashcards: flashcards.map(({ question, answer, isReverable }) => ({
      question,
      answer,
      isReverable,
    })),
  };
}

export function parseFlashcardJson(text: string): ParsedFlashcardFile {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Invalid JSON file.");
  }

  const deckName = extractDeckName(parsed);
  const items = extractFlashcardArray(parsed);
  if (items.length === 0) {
    throw new Error("No flashcards found in file.");
  }

  return {
    deckName,
    flashcards: items.map((item, index) => validateFlashcardExport(item, index)),
  };
}

function extractDeckName(parsed: unknown): string | undefined {
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return undefined;
  }

  const record = parsed as Record<string, unknown>;
  const deckName = record.deck ?? record.deckName;
  if (deckName === undefined) {
    return undefined;
  }
  if (typeof deckName !== "string" || !deckName.trim()) {
    throw new Error("Deck name must be a non-empty string.");
  }
  return deckName.trim();
}

function extractFlashcardArray(parsed: unknown): unknown[] {
  if (Array.isArray(parsed)) {
    return parsed;
  }
  if (parsed && typeof parsed === "object") {
    const record = parsed as Record<string, unknown>;
    if (Array.isArray(record.flashcards)) {
      return record.flashcards;
    }
    if (Array.isArray(record.questions)) {
      return record.questions;
    }
  }
  throw new Error(
    "Expected a JSON array or an object with a flashcards or questions array."
  );
}

function validateFlashcardExport(item: unknown, index: number): FlashcardExport {
  if (!item || typeof item !== "object") {
    throw new Error(`Item ${index + 1} is not an object.`);
  }

  const record = item as Record<string, unknown>;
  const question = record.question;
  const answer = record.answer;

  if (typeof question !== "string" || !question.trim()) {
    throw new Error(`Item ${index + 1} is missing a valid question.`);
  }
  if (typeof answer !== "string" || !answer.trim()) {
    throw new Error(`Item ${index + 1} is missing a valid answer.`);
  }

  const exportCard: FlashcardExport = {
    question: question.trim(),
    answer: answer.trim(),
  };

  if (record.isReverable !== undefined) {
    if (typeof record.isReverable !== "boolean") {
      throw new Error(`Item ${index + 1} has an invalid isReverable value.`);
    }
    exportCard.isReverable = record.isReverable;
  }

  return exportCard;
}

export function downloadFlashcardsJson(
  flashcards: Flashcard[],
  deckName?: string,
  filename = "flashcards.json"
) {
  const data = flashcardsToExport(flashcards, deckName);
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
