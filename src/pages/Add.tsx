import { useCallback, useEffect, useRef, useState } from "react";
import {
  initDB,
  addFlashcard,
  createDeck,
  getFlashcardsByDeck,
  getOrCreateDeck,
  listAllDecks,
  storeImage,
} from "@/utils/db";
import { Flashcard } from "@/types/flash-card";
import { Deck } from "@/types/deck";
import {
  downloadFlashcardsJson,
  parseFlashcardJson,
} from "@/utils/flashcard-json";
import {
  filterDuplicateFlashcards,
  isDuplicateFlashcard,
} from "@/utils/flashcard-duplicates";
import { IDBPDatabase } from "idb";

const DEFAULT_DECK_NAME = "Default";

export default function Add() {
  const [question, setQuestion] = useState<string>("");
  const [answer, setAnswer] = useState<string>("");
  const [db, setDb] = useState<IDBPDatabase | null>(null);
  const [decks, setDecks] = useState<Deck[]>([]);
  const [selectedDeckId, setSelectedDeckId] = useState<number | null>(null);
  const [newDeckName, setNewDeckName] = useState<string>("");
  const [aImage, setAImage] = useState<Blob | null>(null);
  const [qImage, setQImage] = useState<Blob | null>(null);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadDecks = useCallback(async (database: IDBPDatabase) => {
    let allDecks = await listAllDecks(database);
    if (allDecks.length === 0) {
      const defaultDeckId = await createDeck(database, DEFAULT_DECK_NAME);
      allDecks = await listAllDecks(database);
      if (defaultDeckId !== undefined) {
        setSelectedDeckId(defaultDeckId as number);
      }
    }
    setDecks(allDecks);
    setSelectedDeckId((current) => {
      if (current !== null && allDecks.some((deck) => deck.id === current)) {
        return current;
      }
      return (allDecks[0]?.id as number) ?? null;
    });
  }, []);

  useEffect(() => {
    const setupDB = async () => {
      const database = await initDB();
      if (!database) return;
      setDb(database);
      await loadDecks(database);
    };
    setupDB();
  }, [loadDecks]);

  const selectedDeck = decks.find((deck) => deck.id === selectedDeckId);

  const handleCreateDeck = async () => {
    if (!db || !newDeckName.trim()) return;

    const exists = decks.some(
      (deck) => deck.name.toLowerCase() === newDeckName.trim().toLowerCase()
    );
    if (exists) {
      setImportMessage("A deck with that name already exists.");
      return;
    }

    const deckId = await createDeck(db, newDeckName.trim());
    if (deckId === undefined) return;

    await loadDecks(db);
    setSelectedDeckId(deckId as number);
    setNewDeckName("");
    setImportMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question || !answer || !db || selectedDeckId === null) return;

    const existingCards = await getFlashcardsByDeck(db, selectedDeckId);
    const cardToAdd = {
      question: question.trim(),
      answer: answer.trim(),
      isReverable: false,
    };

    if (isDuplicateFlashcard(cardToAdd, existingCards)) {
      setImportMessage("This question and answer already exist in this deck.");
      return;
    }

    let aImageID;
    if (aImage) {
      aImageID = await storeImage(db, aImage);
    }

    let qImageID;
    if (qImage) {
      qImageID = await storeImage(db, qImage);
    }

    const newFlashcard: Flashcard = {
      id: Date.now(),
      question: cardToAdd.question,
      answer: cardToAdd.answer,
      isReverable: false,
      qImage: qImage ? qImageID : null,
      aImage: aImage ? aImageID : null,
    };
    await addFlashcard(db, newFlashcard, selectedDeckId);
    setQuestion("");
    setAnswer("");
    setQImage(null);
    setAImage(null);
    setImportMessage(null);
  };

  const handleDownload = async () => {
    if (!db || selectedDeckId === null) return;

    const flashcards = await getFlashcardsByDeck(db, selectedDeckId);
    if (flashcards.length === 0) {
      setImportMessage("No flashcards to download in this deck.");
      return;
    }

    const deckName = selectedDeck?.name ?? "flashcards";
    const filename = `${deckName.replace(/\s+/g, "-").toLowerCase()}.json`;
    downloadFlashcardsJson(flashcards, deckName, filename);
    setImportMessage(null);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !db || selectedDeckId === null) return;

    setImportMessage(null);
    try {
      const text = await file.text();
      const { deckName: fileDeckName, flashcards: imported } =
        parseFlashcardJson(text);

      const targetDeckId = fileDeckName
        ? await getOrCreateDeck(db, fileDeckName)
        : selectedDeckId;

      if (fileDeckName) {
        await loadDecks(db);
        setSelectedDeckId(targetDeckId);
      }

      const existingCards = await getFlashcardsByDeck(db, targetDeckId);
      const { toImport, skipped } = filterDuplicateFlashcards(
        imported,
        existingCards
      );

      for (const card of toImport) {
        const newFlashcard: Flashcard = {
          id: Date.now(),
          question: card.question,
          answer: card.answer,
          isReverable: card.isReverable ?? false,
          qImage: null,
          aImage: null,
        };
        await addFlashcard(db, newFlashcard, targetDeckId);
      }

      const deckLabel =
        fileDeckName ?? decks.find((deck) => deck.id === targetDeckId)?.name;
      const parts = [`Imported ${toImport.length} flashcard(s) to ${deckLabel}.`];
      if (skipped.length > 0) {
        parts.push(`Skipped ${skipped.length} duplicate(s).`);
      }
      if (toImport.length === 0) {
        parts.push("No new cards were added.");
      }
      setImportMessage(parts.join(" "));
    } catch (error) {
      setImportMessage(
        error instanceof Error ? error.message : "Failed to import file."
      );
    } finally {
      e.target.value = "";
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <h1 className="text-3xl font-bold my-4">Add a Card</h1>

      <div className="bg-white p-4 rounded shadow-md w-80 mb-4 flex flex-col gap-3">
        <label className="text-sm text-gray-600" htmlFor="deck-select">
          Deck
        </label>
        <select
          id="deck-select"
          value={selectedDeckId ?? ""}
          onChange={(e) => setSelectedDeckId(Number(e.target.value))}
          className="border border-gray-300 p-2 rounded w-full"
        >
          {decks.map((deck) => (
            <option key={deck.id} value={deck.id}>
              {deck.name}
            </option>
          ))}
        </select>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="New deck name"
            value={newDeckName}
            onChange={(e) => setNewDeckName(e.target.value)}
            className="border border-gray-300 p-2 rounded flex-1"
          />
          <button
            type="button"
            onClick={handleCreateDeck}
            className="bg-gray-700 text-white px-3 rounded hover:bg-gray-800"
          >
            Add
          </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded shadow-md w-80 mb-4 flex flex-col gap-3">
        <p className="text-sm text-gray-600">
          Import or export flashcards as JSON (duplicates are skipped)
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 bg-gray-700 text-white p-2 rounded hover:bg-gray-800"
          >
            Upload JSON
          </button>
          <button
            type="button"
            onClick={handleDownload}
            className="flex-1 bg-gray-700 text-white p-2 rounded hover:bg-gray-800"
          >
            Download JSON
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          onChange={handleImport}
          className="hidden"
        />
        {importMessage && (
          <p className="text-sm text-gray-800">{importMessage}</p>
        )}
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white p-6 rounded shadow-md w-80"
      >
        <input
          type="text"
          placeholder="Question"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          required
          className="border border-gray-300 p-2 mb-4 w-full rounded"
        />
        <input
          type="file"
          accept="image/*"
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              setQImage(e.target.files[0]);
            }
          }}
          className="border border-gray-300 p-2 mb-4 w-full rounded"
        />
        <input
          type="text"
          placeholder="Answer"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          required
          className="border border-gray-300 p-2 mb-4 w-full rounded"
        />
        <input
          type="file"
          accept="image/*"
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              setAImage(e.target.files[0]);
            }
          }}
          className="border border-gray-300 p-2 mb-4 w-full rounded"
        />
        <button
          type="submit"
          className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600 w-full"
        >
          Add Flashcard
        </button>
      </form>

      <div className="bg-gray-100 shadow-lg rounded-lg p-6 text-center md:w-min-[500px] md:h-min-[500px] flex flex-col justify-center items-center my-12">
        <h2 className="text-2xl font-bold mb-2">{question}</h2>
        {qImage && (
          <img
            src={URL.createObjectURL(qImage)}
            alt="Question"
            className="mt-4 max-w-[300px] h-auto"
          />
        )}
        <p className="text-xl">{answer}</p>
        {aImage && (
          <img
            src={URL.createObjectURL(aImage)}
            alt="Answer"
            className="mt-4 rounded max-w-[300px] h-auto"
          />
        )}
      </div>
    </div>
  );
}
