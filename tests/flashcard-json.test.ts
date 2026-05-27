import {
  flashcardsToExport,
  parseFlashcardJson,
} from "../utils/flashcard-json";
import { Flashcard } from "../types/flash-card";

describe("flashcard-json", () => {
  test("exports flashcards with deck name", () => {
    const flashcards: Flashcard[] = [
      {
        id: 1,
        question: "Q1",
        answer: "A1",
        isReverable: true,
        qImage: 99,
      },
      {
        id: 2,
        question: "Q2",
        answer: "A2",
        isReverable: false,
      },
    ];

    expect(flashcardsToExport(flashcards, "Geography")).toEqual({
      version: 1,
      deck: "Geography",
      flashcards: [
        { question: "Q1", answer: "A1", isReverable: true },
        { question: "Q2", answer: "A2", isReverable: false },
      ],
    });
  });

  test("parses deck name and flashcards", () => {
    const json = JSON.stringify({
      version: 1,
      deck: "Science",
      flashcards: [{ question: "Q", answer: "A", isReverable: true }],
    });

    expect(parseFlashcardJson(json)).toEqual({
      deckName: "Science",
      flashcards: [{ question: "Q", answer: "A", isReverable: true }],
    });
  });

  test("parses a bare array and questions alias", () => {
    expect(
      parseFlashcardJson(JSON.stringify([{ question: "Q1", answer: "A1" }]))
    ).toEqual({
      deckName: undefined,
      flashcards: [{ question: "Q1", answer: "A1" }],
    });

    expect(
      parseFlashcardJson(
        JSON.stringify({ questions: [{ question: "Q2", answer: "A2" }] })
      )
    ).toEqual({
      deckName: undefined,
      flashcards: [{ question: "Q2", answer: "A2" }],
    });
  });

  test("rejects invalid entries", () => {
    expect(() =>
      parseFlashcardJson(JSON.stringify([{ question: "only Q" }]))
    ).toThrow("missing a valid answer");

    expect(() => parseFlashcardJson("not json")).toThrow("Invalid JSON");
  });
});
