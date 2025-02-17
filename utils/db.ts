// utils/db.js
import { openDB } from "idb";
import { IDBPDatabase } from "idb";
import { Flashcard } from "@/types/flash-card";

export const initDB = async () => {
  try {
    const db = await openDB("flashcardDB", 1, {
      upgrade(db) {
        const flashcardsStore = db.createObjectStore("flashcards", {
          keyPath: "id",
          autoIncrement: true,
        });

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

export const addFlashcard = async (db: IDBPDatabase, flashcard: Flashcard) => {
  if (!db) {
    console.log("Database is not initialized.");
  }
  await db.add("flashcards", flashcard);
};

export const getFlashcards = async (db: IDBPDatabase) => {
  if (!db) {
    console.log("Database is not initialized.");
    return []; // Return an empty array if db is null
  }
  return await db.getAll("flashcards");
};

// Function to store an image in the images object store
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
    const transaction = db.transaction("images", "readwrite");
    const store = transaction.objectStore("images");

    // Create a more complete image data object
    const imageData = {
      blob: imageBlob,
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
