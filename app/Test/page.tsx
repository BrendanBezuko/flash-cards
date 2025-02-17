"use client";

import { useEffect, useState } from "react";
import { Flashcard } from "@/types/flash-card";
import { getFlashcards, initDB, getImage } from "@/utils/db";

export default function Test() {
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [deckSize, setDeckSize] = useState<number>(0);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [showAnswer, setShowAnswer] = useState<boolean>(false);
  const [score, setScore] = useState<number>(0);
  const [wrongQuestions, setWrongQuestions] = useState<number[]>([]);
  const [isQuizStarted, setIsQuizStarted] = useState<boolean>(false);
  const [db, setDb] = useState<any>(null);
  const [isQuizEnded, setIsQuizEnded] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [pedantic, setPedantic] = useState(false); // pedantic or typed responses mode
  const [images, setImages] = useState<{
    [key: number]: Blob | undefined | null;
  }>({});
  const [typedAnswer, setTypedAnswer] = useState<string>("");

  useEffect(() => {
    const setupDB = async () => {
      const database = await initDB();
      setDb(database);
      if (database) {
        const cards = await getFlashcards(database);
        setFlashcards(cards);
        setDeckSize(cards.length);

        // Load images for each flashcard
        const loadedImages: { [key: number]: Blob | null } = {};
        for (const card of cards) {
          if (card.qImage) {
            const imageBlob = await getImage(database, card.qImage);
            console.log(imageBlob);
            loadedImages[card.id] = imageBlob ?? null;
          }
        }
        setImages(loadedImages);
      }
    };
    setupDB();
  }, []);

  const handleStartQuiz = () => {
    const cardsToUse = shuffle
      ? shuffleArray([...flashcards])
      : orderById([...flashcards]);
    setFlashcards(cardsToUse.slice(0, deckSize)); // Update to set flashcards to a subarray
    setIsQuizEnded(false);
    setIsQuizStarted(true);
    setScore(0);
    setCurrentIndex(0);
    setWrongQuestions([]);
  };

  const handleAnswerClick = (isCorrect: boolean) => {
    if (!isCorrect) {
      if (currentIndex < deckSize) {
        setWrongQuestions((prev) => [...prev, currentIndex]);
      }
      setFlashcards((prev) => [...prev, prev[currentIndex]]);
    } else if (currentIndex < deckSize) {
      setScore((prev) => prev + 1);
    }
    setShowAnswer(false);

    // Check if the game has ended and cycle through wrong questions
    if (currentIndex + 1 >= flashcards.length && isCorrect) {
      setIsQuizEnded(true);
    } else {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handleShowAnswer = () => {
    if (!showAnswer) {
      setShowAnswer(true);
    }
  };

  const shuffleArray = (array: Flashcard[]) => {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  };

  const orderById = (array: Flashcard[]) => {
    return array.sort((a, b) => a.id - b.id); // Sort flashcards by id
  };

  if (!isQuizStarted) {
    return (
      <div className="flex flex-col gap-4 h-screen items-center justify-center">
        <h1 className="text-3xl font-bold mb-4">Flashcard Quiz</h1>
        <button
          onClick={handleStartQuiz}
          disabled={flashcards.length === 0}
          className={`p-3 rounded transition ${
            flashcards.length === 0
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-blue-500 hover:bg-blue-600 text-white"
          }`}
        >
          {flashcards.length === 0 ? "No Flashcards Available" : "Start Quiz"}
        </button>
        <div className="flex flex-row gap-4 ">
          <button
            onClick={() => setShuffle((prev) => !prev)}
            className={`p-2 rounded ${
              shuffle ? "bg-green-500 text-white" : "bg-green-200 text-white"
            }`}
          >
            Shuffle {shuffle && "✅"}
          </button>
          <button
            onClick={() => setPedantic((prev) => !prev)}
            className={`p-2 rounded ${
              pedantic ? "bg-green-500 text-white" : "bg-green-200 text-white"
            }`}
          >
            Typed {pedantic && "✅"}
          </button>
        </div>
      </div>
    );
  }

  if (isQuizEnded) {
    return (
      <>
        <div className="flex flex-col gap-4 h-screen items-center justify-center">
          <h1 className="text-3xl font-bold mb-4">Quiz Finished!</h1>
          <p className="text-xl mb-4">
            Your Score: {score} / {deckSize}
          </p>
          <button
            onClick={handleStartQuiz}
            className="bg-blue-500 text-white p-3 rounded hover:bg-blue-600 transition"
          >
            Restart Quiz
          </button>
          <div className="flex flex-row gap-4 ">
            <button
              onClick={() => setShuffle((prev) => !prev)}
              className={`p-2 rounded ${
                shuffle ? "bg-green-500 text-white" : "bg-green-200 text-white"
              }`}
            >
              Shuffle {shuffle && "✅"}
            </button>
            <button
              onClick={() => setPedantic((prev) => !prev)}
              className={`p-2 rounded ${
                pedantic ? "bg-green-500 text-white" : "bg-green-200 text-white"
              }`}
            >
              Typed {pedantic && "✅"}
            </button>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center mt-8">
          {wrongQuestions.length > 0 ? (
            <>
              <h2 className="text-2xl font-bold mb-4">Incorrect Answers</h2>
              <div className="carousel">
                {wrongQuestions.map((index) => (
                  <div
                    key={index}
                    className="carousel-item bg-gray-100 shadow-lg rounded-lg p-6 text-center md:w-[500px] md:h-[500px] flex flex-col justify-center items-center my-12"
                  >
                    <h3 className="text-xl">{flashcards[index].question}</h3>
                    <p className="text-lg">{flashcards[index].answer}</p>
                  </div>
                ))}
              </div>{" "}
            </>
          ) : (
            <h2 className="text-2xl font-bold mb-4">100%</h2>
          )}
        </div>
      </>
    );
  }

  const currentFlashcard = flashcards[currentIndex];

  return (
    <>
      <div className="text-white absolute top-4 right-4">
        Score: {score} / {deckSize}
      </div>

      <div className="flex flex-col justify-center items-center flex-grow">
        <div className="bg-gray-100 shadow-lg rounded-lg p-6 text-center md:w-[500px] md:h-[500px] flex flex-col justify-center items-center my-12">
          <div className="transition-transform duration-500 transform scale-100">
            <h2 className="text-2xl font-bold mb-2">
              {currentFlashcard.question}
            </h2>
            {currentFlashcard.qImage &&
              images[currentFlashcard.id] instanceof Blob && (
                <img
                  src={URL.createObjectURL(images[currentFlashcard.id] as Blob)}
                  alt={currentFlashcard.question}
                  className="mb-4 rounded"
                />
              )}

            {pedantic ? (
              <>
                <input
                  type="text"
                  value={typedAnswer}
                  onChange={(e) => setTypedAnswer(e.target.value)}
                  className="w-full p-2 border rounded mb-4 text-black"
                  placeholder="Type your answer..."
                />
                <button
                  onClick={() => {
                    setShowAnswer(true);
                  }}
                  className="bg-blue-500 text-white p-2 rounded"
                >
                  Check Answer
                </button>
                {showAnswer && (
                  <div className="mt-4">
                    <p className="text-xl mb-2">
                      Correct answer: {currentFlashcard.answer}
                    </p>
                    <button
                      onClick={() => {
                        handleAnswerClick(
                          typedAnswer.trim().toLowerCase() ===
                            currentFlashcard.answer.trim().toLowerCase()
                        );
                        setTypedAnswer("");
                        setShowAnswer(false);
                      }}
                      className="bg-blue-500 text-white p-2 rounded"
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            ) : (
              <>
                {!showAnswer ? (
                  <button
                    onClick={() => {
                      setShowAnswer(true);
                    }}
                    className="bg-blue-500 text-white p-2 rounded"
                  >
                    Check Answer
                  </button>
                ) : (
                  <p className="text-xl">{currentFlashcard.answer}</p>
                )}
                {showAnswer && (
                  <div className="flex space-x-4 mt-4">
                    <button
                      onClick={() => handleAnswerClick(false)}
                      className="bg-red-500 text-white p-2 rounded"
                    >
                      Wrong
                    </button>
                    <button
                      onClick={() => handleAnswerClick(true)}
                      className="bg-green-500 text-white p-2 rounded"
                    >
                      Right
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
