// utils/db.js
import { openDB } from "idb";
import { IDBPDatabase } from "idb";
import { Flashcard } from "@/types/flash-card";

/* 
flashcardsStore
- image IDBValidKey -> imagesStore
- deckID -> deck
*/

export const initDB = async () => {
  try {
    const db = await openDB("flashcardDB", 1, {
      upgrade(db) {
        const flashcardsStore = db.createObjectStore("flashcards", {
          keyPath: "id",
          autoIncrement: true,
        });

        // Add a new object store for decks
        const decksStore = db.createObjectStore("decks", {
          keyPath: "id",
          autoIncrement: true,
        });

        // Add an index to the flashcards store for deckId
        flashcardsStore.createIndex("deckId", "deckId", { unique: false });

        const imagesStore = db.createObjectStore("images", {
          keyPath: "id",
          autoIncrement: true,
        });
      },
    });
    return db;
  } catch {
    console.log("error loading database");
  }
};

export const addFlashcard = async (
  db: IDBPDatabase,
  flashcard: Flashcard,
  deckId: number
) => {
  if (!db) {
    console.log("Database is not initialized.");
  }
  const flashcardWithDeck = { ...flashcard, deckId };
  await db.add("flashcards", flashcardWithDeck);
};

export const getFlashcardsByDeck = async (db: IDBPDatabase, deckId: number) => {
  if (!db) {
    console.log("Database is not initialized.");
    return [];
  }
  const transaction = db.transaction("flashcards", "readonly");
  const store = transaction.objectStore("flashcards");
  const index = store.index("deckId");
  return await index.getAll(deckId);
};

export const getFlashcards = async (db: IDBPDatabase) => {
  if (!db) {
    console.log("Database is not initialized.");
    return []; // Return an empty array if db is null
  }
  return await db.getAll("flashcards");
};

export const deleteFlashcard = async (
  db: IDBPDatabase,
  flashcardId: number
) => {
  if (!db) {
    console.log("Database is not initialized.");
    return;
  }

  const transaction = db.transaction(["flashcards", "images"], "readwrite");

  // Get the flashcard to check for associated images
  const flashcardsStore = transaction.objectStore("flashcards");
  const flashcard = await flashcardsStore.get(flashcardId);

  if (flashcard) {
    // Delete the flashcard
    await flashcardsStore.delete(flashcardId);

    // If the flashcard has associated images, delete them
    const imagesStore = transaction.objectStore("images");
    if (flashcard.qImage) {
      await imagesStore.delete(flashcard.qImage);
    }
    if (flashcard.aImage) {
      await imagesStore.delete(flashcard.aImage);
    }
  }

  // Wait for the transaction to complete
  await new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
};

export const listAllDecks = async (db: IDBPDatabase) => {
  if (!db) {
    console.log("Database is not initialized.");
    return [];
  }
  return await db.getAll("decks");
};

export const createDeck = async (
  db: IDBPDatabase,
  deckName: string
): Promise<IDBValidKey | undefined> => {
  if (!db) {
    console.log("Database is not initialized.");
    return;
  }
  const transaction = db.transaction("decks", "readwrite");
  const store = transaction.objectStore("decks");
  const deck = { name: deckName, created: new Date().getTime() };
  return await store.add(deck);
};

export const deleteDeck = async (db: IDBPDatabase, deckId: number) => {
  if (!db) {
    console.log("Database is not initialized.");
    return;
  }

  // Start a transaction for decks, flashcards, and images
  const transaction = db.transaction(
    ["decks", "flashcards", "images"],
    "readwrite"
  );

  // Delete all flashcards associated with the deck
  const flashcardsStore = transaction.objectStore("flashcards");
  const flashcardsIndex = flashcardsStore.index("deckId");
  const flashcards = await flashcardsIndex.getAll(deckId);
  const imagesStore = transaction.objectStore("images");

  for (const flashcard of flashcards) {
    // Delete each flashcard
    await flashcardsStore.delete(flashcard.id);

    // Delete associated images
    if (flashcard.qImage) {
      await imagesStore.delete(flashcard.qImage);
    }
    if (flashcard.aImage) {
      await imagesStore.delete(flashcard.aImage);
    }
  }

  // Delete the deck itself
  const decksStore = transaction.objectStore("decks");
  await decksStore.delete(deckId);

  // Wait for the transaction to complete
  await new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
};

const scaleImage = async (
  blob: Blob,
  targetSize: number = 300
): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      let width = img.width;
      let height = img.height;

      // Calculate new dimensions maintaining aspect ratio
      if (width > height) {
        if (width > targetSize) {
          height = (height * targetSize) / width;
          width = targetSize;
        }
      } else {
        if (height > targetSize) {
          width = (width * targetSize) / height;
          height = targetSize;
        }
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Failed to get canvas context"));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob((scaledBlob) => {
        if (scaledBlob) {
          resolve(scaledBlob);
        } else {
          reject(new Error("Failed to create blob from canvas"));
        }
      }, blob.type);
    };

    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = URL.createObjectURL(blob);
  });
};

export const storeImage = async (
  db: IDBPDatabase,
  imageBlob: Blob
): Promise<IDBValidKey | undefined> => {
  if (!db) {
    console.log("Database is not initialized.");
    return;
  }

  if (!(imageBlob instanceof Blob)) {
    console.log("Invalid image blob.");
    return;
  }

  try {
    const scaledBlob = await scaleImage(imageBlob);

    const transaction = db.transaction("images", "readwrite");
    const store = transaction.objectStore("images");

    // Create a more complete image data object
    const imageData = {
      blob: scaledBlob,
      timestamp: new Date().getTime(),
      size: imageBlob.size,
      type: imageBlob.type,
    };

    // Wait for the add operation to complete
    const request = store.add(imageData);

    // Wait for the transaction to complete
    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });

    return request;
  } catch (error) {
    console.error("Error storing image:", error);
    return undefined;
  }
};

export const getImage = async (
  db: IDBPDatabase,
  id: number
): Promise<Blob | null> => {
  try {
    const imageData = await db.get("images", id);
    if (!imageData) return null;
    // Return the blob property which contains the File/Blob object
    return imageData.blob;
  } catch (error) {
    console.error("Error getting image:", error);
    return null;
  }
};

export const deleteImage = async (db: IDBPDatabase, imageId: number) => {
  if (!db) {
    console.log("Database is not initialized.");
    return;
  }

  const transaction = db.transaction("images", "readwrite");
  const store = transaction.objectStore("images");
  await store.delete(imageId);

  // Wait for the transaction to complete
  await new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
};

export const listAllImages = async (db: IDBPDatabase) => {
  if (!db) {
    console.log("Database is not initialized.");
    return [];
  }
  const images = await db.getAll("images");
  return images.map((img) => ({
    id: img.id,
    timestamp: new Date(img.timestamp),
    size: img.size,
    type: img.type,
  }));
};
