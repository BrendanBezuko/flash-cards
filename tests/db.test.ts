import { openDB, IDBPDatabase } from "idb";
import {
  initDB,
  createDeck,
  deleteDeck,
  addFlashcard,
  deleteFlashcard,
  storeImage,
  deleteImage,
  createResult,
  getResults,
  getResult,
  deleteResult,
} from "../utils/db";
import "fake-indexeddb/auto";

describe("Database Operations", () => {
  let db: IDBPDatabase | undefined;

  beforeAll(async () => {
    db = await initDB();

    if (!db) {
      throw new Error("Failed to initialize the database");
    }
  });

  beforeEach(async () => {
    if (db) {
      const transaction = db.transaction(
        ["decks", "flashcards", "images", "results"],
        "readwrite"
      );
      await transaction.objectStore("decks").clear();
      await transaction.objectStore("flashcards").clear();
      await transaction.objectStore("images").clear();
      await transaction.objectStore("results").clear();

      await transaction.done;
    }
  });

  test("should create and delete a deck", async () => {
    if (!db) {
      throw new Error("Failed to initialize the database");
    }

    const deckName = "Test Deck";
    const deckId = await createDeck(db, deckName);
    expect(deckId).toBeDefined();

    const decks = await db.getAll("decks");
    expect(decks.length).toBe(1);
    expect(decks[0].name).toBe(deckName);

    await deleteDeck(db, deckId as number);
    const decksAfterDelete = await db.getAll("decks");
    expect(decksAfterDelete.length).toBe(0);
  });

  test("should add and delete a flashcard", async () => {
    if (!db) {
      throw new Error("Failed to initialize the database");
    }

    const deckName = "Test Deck";
    const deckId = await createDeck(db, deckName);

    const flashcard = {
      id: Date.now(),
      question: "What is the capital of France?",
      answer: "Paris",
      isReverable: true,
    };

    await addFlashcard(db, flashcard, deckId as number);
    const flashcards = await db.getAll("flashcards");
    expect(flashcards.length).toBe(1);
    expect(flashcards[0].question).toBe(flashcard.question);

    await deleteFlashcard(db, flashcards[0].id);
    const flashcardsAfterDelete = await db.getAll("flashcards");
    expect(flashcardsAfterDelete.length).toBe(0);
  });

  test("should delete flashcards when a deck is deleted", async () => {
    if (!db) {
      throw new Error("Failed to initialize the database");
    }

    const deckName = "Test Deck with Flashcards";
    const deckId = await createDeck(db, deckName);

    const flashcard1 = {
      id: Date.now(),
      question: "What is the capital of Spain?",
      answer: "Madrid",
      isReverable: true,
    };

    const flashcard2 = {
      id: Date.now() + 1,
      question: "What is the capital of Italy?",
      answer: "Rome",
      isReverable: true,
    };

    await addFlashcard(db, flashcard1, deckId as number);
    await addFlashcard(db, flashcard2, deckId as number);

    const flashcardsBeforeDelete = await db.getAll("flashcards");
    expect(flashcardsBeforeDelete.length).toBe(2);

    await deleteDeck(db, deckId as number);
    const decksAfterFirstDel = await db.getAll("decks");
    expect(decksAfterFirstDel.length).toBe(0);

    const flashcardsAfterDelete = await db.getAll("flashcards");
    expect(flashcardsAfterDelete.length).toBe(0);
  });

  test("should maintain flashcards in the second deck after the first deck is deleted", async () => {
    if (!db) {
      throw new Error("Failed to initialize the database");
    }

    const decks = await db.getAll("decks");
    expect(decks.length).toBe(0);

    // Create two decks
    const firstDeckName = "First Test Deck";
    const secondDeckName = "Second Test Deck";
    const firstDeckId = await createDeck(db, firstDeckName);
    const secondDeckId = await createDeck(db, secondDeckName);

    // Add flashcards to the first deck
    const flashcard1 = {
      id: Date.now(),
      question: "What is the capital of Germany?",
      answer: "Berlin",
      isReverable: true,
    };

    const flashcard2 = {
      id: Date.now() + 1,
      question: "What is the capital of Portugal?",
      answer: "Lisbon",
      isReverable: true,
    };

    await addFlashcard(db, flashcard1, firstDeckId as number);
    await addFlashcard(db, flashcard2, firstDeckId as number);

    // Add a flashcard to the second deck
    const flashcard3 = {
      id: Date.now() + 2,
      question: "What is the capital of Greece?",
      answer: "Athens",
      isReverable: true,
    };

    await addFlashcard(db, flashcard3, secondDeckId as number);

    // Verify flashcards in both decks before deletion
    const flashcardsInFirstDeck = await db.getAllFromIndex(
      "flashcards",
      "deckId",
      firstDeckId
    );
    expect(flashcardsInFirstDeck.length).toBe(2);

    const flashcardsInSecondDeck = await db.getAllFromIndex(
      "flashcards",
      "deckId",
      secondDeckId
    );
    expect(flashcardsInSecondDeck.length).toBe(1);

    // Delete the first deck
    await deleteDeck(db, firstDeckId as number);
    const decksAfterFirstDel = await db.getAll("decks");
    expect(decksAfterFirstDel.length).toBe(1);

    // Verify the first deck's flashcards are deleted
    const flashcardsAfterFirstDeckDelete = await db.getAllFromIndex(
      "flashcards",
      "deckId",
      firstDeckId
    );
    expect(flashcardsAfterFirstDeckDelete.length).toBe(0);

    // Verify the second deck and its flashcards still exist
    const remainingDecks = await db.getAll("decks");
    expect(remainingDecks.some((deck) => deck.id === secondDeckId)).toBe(true);

    const flashcardsInSecondDeckAfterDelete = await db.getAllFromIndex(
      "flashcards",
      "deckId",
      secondDeckId
    );
    expect(flashcardsInSecondDeckAfterDelete.length).toBe(1);

    // Clean up by deleting the second deck
    await deleteDeck(db, secondDeckId as number);
    const decksAfterCleanup = await db.getAll("decks");
    expect(decksAfterCleanup.length).toBe(0);
  });

  // test("should add and delete an image", async () => {
  //   if (!db) {
  //     throw new Error("Failed to initialize the database");
  //   }

  //   const image = {
  //     id: Date.now(),
  //     url: "http://example.com/image.jpg",
  //     description: "A sample image",
  //   };

  //   await storeImage(db, image);
  //   const images = await db.getAll("images");
  //   expect(images.length).toBe(1);
  //   expect(images[0].url).toBe(image.url);

  //   await deleteImage(db, images[0].id);
  //   const imagesAfterDelete = await db.getAll("images");
  //   expect(imagesAfterDelete.length).toBe(0);
  // });

  test("should create, retrieve, and delete a TestResult", async () => {
    if (!db) {
      throw new Error("Failed to initialize the database");
    }

    // Create a deck
    const deckName = "Test Deck for Results";
    const deckId = await createDeck(db, deckName);

    // Create flashcard results
    const flashcardResults = [
      { flashcardId: "1", correct: true, tries: 1, timeTaken: 500 },
      { flashcardId: "2", correct: false, tries: 2, timeTaken: 1000 },
      { flashcardId: "3", correct: true, tries: 1, timeTaken: 750 },
    ];

    // Create a test result
    const testResult = {
      deckId: deckId as number,
      flashcardResults,
      totalTimeTaken: flashcardResults.reduce(
        (sum, fr) => sum + fr.timeTaken,
        0
      ),
      date: new Date(),
    };

    const resultId = await createResult(db, testResult);
    expect(resultId).toBeDefined();

    // Retrieve and verify the test result
    const retrievedResult = await getResult(db, resultId as number);
    expect(retrievedResult).not.toBeNull();
    expect(retrievedResult?.flashcardResults.length).toBe(3);

    // Calculate and verify average time taken
    const averageTimeTaken =
      retrievedResult!.flashcardResults.reduce(
        (sum, fr) => sum + fr.timeTaken,
        0
      ) / retrievedResult!.flashcardResults.length;
    expect(averageTimeTaken).toBe(750);

    // Delete the test result
    await deleteResult(db, resultId as number);
    const resultAfterDelete = await getResult(db, resultId as number);
    expect(resultAfterDelete).toBeNull();
  });
});
