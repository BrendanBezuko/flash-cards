import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Flashcard } from "@/types/flash-card";
import { FlashcardResult, TestResult } from "@/types/result";

const CHART_COLORS = {
  correct: "#22c55e",
  incorrect: "#ef4444",
  time: "#3b82f6",
  trend: "#8b5cf6",
};

function truncate(text: string, max = 24) {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

function formatDate(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function sessionScorePercent(result: TestResult) {
  const total = result.flashcardResults.length;
  if (total === 0) return 0;
  const correct = result.flashcardResults.filter((r) => r.correct).length;
  return Math.round((correct / total) * 100);
}

interface QuizStatisticsProps {
  flashcardResults: FlashcardResult[];
  flashcardsById: Map<number, Flashcard>;
  historicalResults: TestResult[];
  score: number;
  deckSize: number;
}

export function QuizStatistics({
  flashcardResults,
  flashcardsById,
  historicalResults,
  score,
  deckSize,
}: QuizStatisticsProps) {
  const correctCount = flashcardResults.filter((r) => r.correct).length;
  const incorrectCount = flashcardResults.length - correctCount;

  const outcomeData = [
    { name: "Correct", value: correctCount },
    { name: "Incorrect", value: incorrectCount },
  ].filter((d) => d.value > 0);

  const timePerCardData = flashcardResults.map((result) => {
    const card = flashcardsById.get(Number(result.flashcardId));
    return {
      name: truncate(card?.question ?? `Card ${result.flashcardId}`),
      seconds: Math.round(result.timeTaken / 100) / 10,
      tries: result.tries,
    };
  });

  const deckHistory = [...historicalResults]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(-10)
    .map((result, index) => ({
      session: formatDate(result.date) || `#${index + 1}`,
      score: sessionScorePercent(result),
    }));

  return (
    <div className="w-full max-w-4xl mx-auto px-4 pb-12 space-y-10">
      <p className="text-center text-lg text-gray-700">
        This session: {score} / {deckSize} first-try correct
        {" · "}
        {Math.round((correctCount / Math.max(flashcardResults.length, 1)) * 100)}%
        cards mastered
      </p>

      <div className="grid gap-8 md:grid-cols-2">
        <section className="bg-white rounded-lg shadow p-4">
          <h3 className="text-lg font-semibold mb-4 text-center">Outcome</h3>
          {outcomeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={outcomeData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {outcomeData.map((entry) => (
                    <Cell
                      key={entry.name}
                      fill={
                        entry.name === "Correct"
                          ? CHART_COLORS.correct
                          : CHART_COLORS.incorrect
                      }
                    />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-gray-500">No card data recorded.</p>
          )}
        </section>

        <section className="bg-white rounded-lg shadow p-4">
          <h3 className="text-lg font-semibold mb-4 text-center">
            Time per card (seconds)
          </h3>
          {timePerCardData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={timePerCardData} margin={{ bottom: 48 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11 }}
                  angle={-35}
                  textAnchor="end"
                  interval={0}
                  height={70}
                />
                <YAxis allowDecimals={false} />
                <Tooltip
                  formatter={(value, name) => [
                    name === "seconds" ? `${value}s` : value,
                    name === "seconds" ? "Time" : "Tries",
                  ]}
                />
                <Bar dataKey="seconds" fill={CHART_COLORS.time} name="seconds" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-gray-500">No timing data.</p>
          )}
        </section>
      </div>

      {deckHistory.length > 1 && (
        <section className="bg-white rounded-lg shadow p-4">
          <h3 className="text-lg font-semibold mb-4 text-center">
            Score history (this deck, last 10 sessions)
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={deckHistory} margin={{ bottom: 24 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="session" tick={{ fontSize: 12 }} />
              <YAxis domain={[0, 100]} unit="%" />
              <Tooltip formatter={(value) => [`${value}%`, "Score"]} />
              <Line
                type="monotone"
                dataKey="score"
                stroke={CHART_COLORS.trend}
                strokeWidth={2}
                dot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </section>
      )}
    </div>
  );
}
