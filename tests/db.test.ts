import { openDB, IDBPDatabase } from "idb";
import {
  initDB,
  createDeck,
  deleteDeck,
  addFlashcard,
  deleteFlashcard,
  storeImage,
  deleteImage,
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
});
