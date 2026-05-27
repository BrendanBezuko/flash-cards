import {
  filterDuplicateFlashcards,
  flashcardKey,
  isDuplicateFlashcard,
} from "../utils/flashcard-duplicates";

describe("flashcard-duplicates", () => {
  test("matches cards case-insensitively", () => {
    expect(
      flashcardKey({ question: "What is 2+2?", answer: "Four" })
    ).toBe(flashcardKey({ question: "  what is 2+2?  ", answer: "four" }));
  });

  test("filters duplicates against existing and within import", () => {
    const existing = [{ question: "Q1", answer: "A1" }];
    const incoming = [
      { question: "Q1", answer: "A1" },
      { question: "Q2", answer: "A2" },
      { question: "q2", answer: "a2" },
      { question: "Q3", answer: "A3" },
    ];

    const { toImport, skipped } = filterDuplicateFlashcards(incoming, existing);

    expect(toImport).toEqual([{ question: "Q2", answer: "A2" }]);
    expect(skipped).toHaveLength(3);
  });

  test("detects a single duplicate", () => {
    const existing = [{ question: "Q", answer: "A" }];
    expect(isDuplicateFlashcard({ question: "q", answer: "a" }, existing)).toBe(
      true
    );
    expect(
      isDuplicateFlashcard({ question: "Other", answer: "A" }, existing)
    ).toBe(false);
  });
});
