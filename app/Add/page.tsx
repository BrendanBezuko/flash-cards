"use client";
// app/page.tsx
import { useEffect, useState } from "react";
import { initDB, addFlashcard, storeImage } from "@/utils/db";
import { Flashcard } from "@/types/flash-card";

export default function Add() {
  const [question, setQuestion] = useState<string>("");
  const [answer, setAnswer] = useState<string>("");
  const [db, setDb] = useState<any>(null);
  const [aImage, setAImage] = useState<Blob | null>(null);
  const [qImage, setQImage] = useState<Blob | null>(null);

  useEffect(() => {
    const setupDB = async () => {
      const database = await initDB();
      setDb(database);
    };
    setupDB();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (question && answer) {
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
        question,
        answer,
        isReverable: false,
        qImage: qImage ? qImageID : null,
        aImage: aImage ? aImageID : null,
      };
      await addFlashcard(db, newFlashcard, 1);
      setQuestion(""); // Clear the input after submission
      setAnswer(""); // Clear the input after submission
      setQImage(null);
      setAImage(null);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <h1 className="text-3xl font-bold my-4">Add a Card</h1>
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
          type="file" // File input for image
          accept="image/*"
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              setQImage(e.target.files[0]); // Set the selected image
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
          type="file" // File input for image
          accept="image/*"
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              setAImage(e.target.files[0]); // Set the selected image
            }
          }}
          className="border border-gray-300 p-2 mb-4 w-full rounded"
        />
        <button
          type="submit"
          className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
        >
          Add Flashcard
        </button>
      </form>

      <div className="bg-gray-100 shadow-lg rounded-lg p-6 text-center md:w-min-[500px] md:h-min-[500px] flex flex-col justify-center items-center my-12">
        <h2 className="text-2xl font-bold mb-2">{question}</h2>
        {qImage && (
          <img
            src={URL.createObjectURL(qImage)}
            alt="Question Image"
            className="mt-4 rounded max-w-[300px] max-h-[300px]"
          />
        )}
        <p className="text-xl">{answer}</p>
        {aImage && (
          <img
            src={URL.createObjectURL(aImage)}
            alt="Answer Image"
            className="mt-4 rounded max-w-[300px] max-h-[300px] object-cover"
          />
        )}
      </div>
    </div>
  );
}
