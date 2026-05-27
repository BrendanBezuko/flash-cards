import { useEffect, useRef, useState } from "react";
import { Flashcard } from "@/types/flash-card";
import {
  createDeck,
  createResult,
  getFlashcardsByDeck,
  getImage,
  getResultsByDeck,
  initDB,
  listAllDecks,
} from "@/utils/db";
import { Deck } from "@/types/deck";
import { Button } from "@/components/ui/button";
import { QuizStatistics } from "@/components/quiz-statistics";
import { FlashcardResult, TestResult } from "@/types/result";
import { IDBPDatabase } from "idb";

type CardStat = { tries: number; timeMs: number; correct: boolean };

export default function Quiz() {
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [deckSize, setDeckSize] = useState<number>(0);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [showAnswer, setShowAnswer] = useState<boolean>(false);
  const [score, setScore] = useState<number>(0);
  const [wrongQuestions, setWrongQuestions] = useState<number[]>([]);
  const [isQuizStarted, setIsQuizStarted] = useState<boolean>(false);
  const [isQuizEnded, setIsQuizEnded] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [pedantic, setPedantic] = useState(false);
  const [images, setImages] = useState<{
    [key: number]: Blob | undefined | null;
  }>({});
  const [typedAnswer, setTypedAnswer] = useState<string>("");
  const [decks, setDecks] = useState<Deck[]>([]);
  const [selectedDeckId, setSelectedDeckId] = useState<number | null>(null);
  const [db, setDb] = useState<IDBPDatabase | null>(null);
  const [perCardStats, setPerCardStats] = useState<Record<number, CardStat>>(
    {}
  );
  const [sessionResults, setSessionResults] = useState<FlashcardResult[]>([]);
  const [historicalResults, setHistoricalResults] = useState<TestResult[]>([]);
  const [quizCardsSnapshot, setQuizCardsSnapshot] = useState<Flashcard[]>([]);
  const initialCardIdsRef = useRef<number[]>([]);
  const cardStartTimeRef = useRef(Date.now());

  const loadDeckCards = async (
    database: IDBPDatabase,
    deckId: number
  ) => {
    const cards = await getFlashcardsByDeck(database, deckId);
    setFlashcards(cards);
    setDeckSize(cards.length);

    const loadedImages: { [key: number]: Blob | null } = {};
    for (const card of cards) {
      if (card.qImage) {
        const imageBlob = await getImage(database, card.qImage);
        loadedImages[card.id] = imageBlob ?? null;
      }
    }
    setImages(loadedImages);
  };

  useEffect(() => {
    const setupDB = async () => {
      const database = await initDB();
      if (!database) return;

      setDb(database);
      let allDecks = await listAllDecks(database);
      if (allDecks.length === 0) {
        await createDeck(database, "Default");
        allDecks = await listAllDecks(database);
      }
      setDecks(allDecks);
      const initialDeckId = allDecks[0]?.id as number;
      setSelectedDeckId(initialDeckId);
      if (initialDeckId !== undefined) {
        await loadDeckCards(database, initialDeckId);
      }
    };
    setupDB();
  }, []);

  const handleDeckChange = async (deckId: number) => {
    setSelectedDeckId(deckId);
    setIsQuizStarted(false);
    setIsQuizEnded(false);
    if (db) {
      await loadDeckCards(db, deckId);
    }
  };

  useEffect(() => {
    if (isQuizStarted && !isQuizEnded) {
      cardStartTimeRef.current = Date.now();
    }
  }, [currentIndex, isQuizStarted, isQuizEnded]);

  const buildFlashcardResults = (
    stats: Record<number, CardStat>
  ): FlashcardResult[] =>
    initialCardIdsRef.current.map((id) => ({
      flashcardId: String(id),
      correct: stats[id]?.correct ?? false,
      tries: stats[id]?.tries ?? 0,
      timeTaken: stats[id]?.timeMs ?? 0,
    }));

  const saveQuizResult = async (stats: Record<number, CardStat>) => {
    if (!db || selectedDeckId === null) return;

    const flashcardResults = buildFlashcardResults(stats);
    setSessionResults(flashcardResults);

    await createResult(db, {
      deckId: selectedDeckId,
      flashcardResults,
      totalTimeTaken: flashcardResults.reduce((sum, r) => sum + r.timeTaken, 0),
      date: new Date(),
    });

    const history = await getResultsByDeck(db, selectedDeckId);
    setHistoricalResults(history);
  };

  const handleStartQuiz = () => {
    const cardsToUse = shuffle
      ? shuffleArray([...flashcards])
      : orderById([...flashcards]);
    const deck = cardsToUse.slice(0, deckSize);
    setQuizCardsSnapshot(deck);
    initialCardIdsRef.current = deck.map((c) => c.id);
    const stats: Record<number, CardStat> = {};
    for (const id of initialCardIdsRef.current) {
      stats[id] = { tries: 0, timeMs: 0, correct: false };
    }
    setPerCardStats(stats);
    setSessionResults([]);
    cardStartTimeRef.current = Date.now();
    setFlashcards(deck);
    setIsQuizEnded(false);
    setIsQuizStarted(true);
    setScore(0);
    setCurrentIndex(0);
    setWrongQuestions([]);
  };

  const handleAnswerClick = (isCorrect: boolean) => {
    const card = flashcards[currentIndex];
    const elapsed = Date.now() - cardStartTimeRef.current;
    const current = perCardStats[card.id] ?? {
      tries: 0,
      timeMs: 0,
      correct: false,
    };
    const nextStats: Record<number, CardStat> = {
      ...perCardStats,
      [card.id]: {
        tries: current.tries + 1,
        timeMs: current.timeMs + elapsed,
        correct: isCorrect || current.correct,
      },
    };
    setPerCardStats(nextStats);

    if (!isCorrect) {
      if (currentIndex < deckSize) {
        setWrongQuestions((prev) => [...prev, currentIndex]);
      }
      setFlashcards((prev) => [...prev, prev[currentIndex]]);
    } else if (currentIndex < deckSize) {
      setScore((prev) => prev + 1);
    }
    setShowAnswer(false);

    const quizComplete =
      isCorrect && currentIndex + 1 >= flashcards.length;
    if (quizComplete) {
      setIsQuizEnded(true);
      void saveQuizResult(nextStats);
    } else {
      setCurrentIndex((prev) => prev + 1);
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
    return array.sort((a, b) => a.id - b.id);
  };

  if (!isQuizStarted) {
    return (
      <div className="flex flex-col gap-4 h-screen items-center justify-center">
        <h1 className="text-3xl font-bold mb-4">Flashcard Quiz</h1>
        <div className="flex flex-col items-center gap-2">
          <label htmlFor="quiz-deck-select" className="text-sm text-gray-600">
            Deck
          </label>
          <select
            id="quiz-deck-select"
            value={selectedDeckId ?? ""}
            onChange={(e) => handleDeckChange(Number(e.target.value))}
            className="border border-gray-300 p-2 rounded min-w-[200px]"
          >
            {decks.map((deck) => (
              <option key={deck.id} value={deck.id}>
                {deck.name}
              </option>
            ))}
          </select>
        </div>
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
    const flashcardsById = new Map(
      quizCardsSnapshot.map((card) => [card.id, card])
    );

    return (
      <div className="min-h-screen py-8">
        <div className="flex flex-col gap-4 items-center">
          <h1 className="text-3xl font-bold">Quiz Finished!</h1>
          <p className="text-xl">
            Your Score: {score} / {deckSize}
          </p>
          <div className="flex flex-row gap-4">
            <Button
              onClick={handleStartQuiz}
              className="bg-blue-500 text-white p-3 rounded hover:bg-blue-600 transition"
            >
              Restart Quiz
            </Button>
            <Button
              onClick={() => setShuffle((prev) => !prev)}
              className={`p-2 rounded ${
                shuffle ? "bg-green-500 text-white" : "bg-green-200 text-white"
              }`}
            >
              Shuffle {shuffle && "✅"}
            </Button>
            <Button
              onClick={() => setPedantic((prev) => !prev)}
              className={`p-2 rounded ${
                pedantic ? "bg-green-500 text-white" : "bg-green-200 text-white"
              }`}
            >
              Typed {pedantic && "✅"}
            </Button>
          </div>
        </div>

        <QuizStatistics
          flashcardResults={sessionResults}
          flashcardsById={flashcardsById}
          historicalResults={historicalResults}
          score={score}
          deckSize={deckSize}
        />

        <div className="flex flex-col items-center justify-center mt-8">
          {wrongQuestions.length > 0 ? (
            <>
              <h2 className="text-2xl font-bold mb-4">Incorrect Answers</h2>
              <div className="carousel">
                {wrongQuestions.map((index, i) => {
                  const card = quizCardsSnapshot[index];
                  if (!card) return null;
                  return (
                    <div
                      key={`${card.id}-${i}`}
                      className="carousel-item bg-gray-100 shadow-lg rounded-lg p-6 text-center md:w-[500px] md:h-[500px] flex flex-col justify-center items-center my-12"
                    >
                      <h3 className="text-xl">{card.question}</h3>
                      <p className="text-lg">{card.answer}</p>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <h2 className="text-2xl font-bold mb-4">100%</h2>
          )}
        </div>
      </div>
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
                  className="mb-4 rounded max-w-[300px] h-auto mx-auto"
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
