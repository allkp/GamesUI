// src/components/Board.tsx
import React from "react";

type Cell = "EMPTY" | "X" | "O";

interface BoardProps {
  board: Cell[];
  onClick: (pos: number) => void;
  gameTurn: "X" | "O";
  playerRole: "X" | "O" | null;
  winner: string | null;
}

export const Board: React.FC<BoardProps> = ({
  board,
  onClick,
  gameTurn,
  playerRole,
  winner,
}) => {
  return (
    <div className="board-container">
      {board.map((cell, i) => (
        <button
          key={i}
          onClick={() => onClick(i)}
          className={`cell ${cell !== "EMPTY" ? "filled" : ""}`}
          style={{padding:'0'}}
          disabled={
            cell !== "EMPTY" || winner !== null || playerRole !== gameTurn
          }
        >
          {cell !== "EMPTY" && (
            <span
              className={`symbol ${cell === "X" ? "x-symbol" : "o-symbol"}`}
            >
              {cell}
            </span>
          )}
        </button>
      ))}
    </div>
  );
};
