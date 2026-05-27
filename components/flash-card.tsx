import { useState } from "react";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface FlashcardProps {
  question: string;
  answer: string;
  questionImage?: string;
  answerImage?: string;
  onAnswerCheck: (isCorrect: boolean) => void; // New prop for callback
}

export default function FlashCard({
  question,
  answer,
  questionImage,
  answerImage,
  onAnswerCheck, // Destructure the new prop
}: FlashcardProps) {
  const [isAnswerVisible, setIsAnswerVisible] = useState(false);
  const [userInput, setUserInput] = useState("");

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader>
        <CardTitle className="text-xl font-semibold text-center">
          {question}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {questionImage && (
          <div className="relative aspect-video rounded-lg overflow-hidden">
            <img
              src={questionImage}
              alt={question}
              className="mb-4 rounded max-w-[300px] h-auto"
            />
          </div>
        )}

        <div className="space-y-4">
          <Input
            placeholder="Type your answer..."
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            className="w-full"
          />

          {isAnswerVisible && (
            <div className="space-y-4 pt-4 border-t">
              <div className="font-medium">Answer:</div>
              <p className="text-lg">{answer}</p>
              {answerImage && (
                <div className="relative aspect-video rounded-lg overflow-hidden">
                  <img
                    src={answerImage}
                    alt={answer}
                    className="mb-4 rounded max-w-[300px] h-auto"
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex justify-center gap-2">
        {!isAnswerVisible ? (
          <Button onClick={() => setIsAnswerVisible(true)}>Check</Button>
        ) : (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                onAnswerCheck(false);
              }}
            >
              <X className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                onAnswerCheck(true);
              }}
            >
              <Check className="h-4 w-4" />
            </Button>
          </div>
        )}
      </CardFooter>
    </Card>
  );
}
