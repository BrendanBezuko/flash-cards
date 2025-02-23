import React from "react";
import { Flashcard } from "@/types/flash-card";
import Image from "next/image";

const Card: React.FC<Flashcard> = ({
  id,
  question,
  answer,
  qImage,
  aImage,
  isReverable,
}) => {
  return (
    <div key={id} className="card">
      <div className="card-content">
        <h2>Question</h2>
        <p>{question}</p>
        {qImage && <Image src={String(qImage)} alt="Question related" />}

        <h2>Answer</h2>
        <p>{answer}</p>
        {aImage && <Image src={String(aImage)} alt="Answer related" />}

        <p>Reversible: {isReverable ? "Yes" : "No"}</p>
      </div>
    </div>
  );
};

export default Card;
