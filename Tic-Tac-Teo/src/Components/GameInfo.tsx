// src/components/GameInfo.tsx
import React from "react";

interface GameInfoProps {
  gameId: string;
  turn: "X" | "O";
  winner: string | null;
  playerRole: "X" | "O" | null;
}

export const GameInfo: React.FC<GameInfoProps> = ({
  gameId,
  turn,
  winner,
  playerRole,
}) => {
  return (
    <div className="game-info">
      <p>
        <span>Game ID:</span>
        <strong>{gameId}</strong>
      </p>
      <p>
        <span>Current Turn:</span>
        {turn === playerRole ? (
          <strong style={{ color: "#10b981" }}>Your turn ({turn})</strong>
        ) : (
          <strong style={{ color: "#f59e0b" }}>Opponent's turn ({turn})</strong>
        )}
      </p>
      <p>
        <span>Winner:</span>
        {winner ? (
          <span className="winner-badge">
            {winner === "DRAW" ? "Draw!" : `${winner} Wins!`}
          </span>
        ) : (
          <strong>In Progress</strong>
        )}
      </p>
    </div>
  );
};
