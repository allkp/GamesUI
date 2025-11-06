// src/pages/GamePage.tsx
import React, { useState } from "react";
import { createGame, getGame, move, type GameState } from "../api/gameApi";
import { useWebSocket } from "../CustomHooks/useWebSocket";
import { Board } from "../Components/Board";
import { GameInfo } from "../Components/GameInfo";
import { ConnectionStatus } from "../Components/ConnectionStatus";

export const GamePage: React.FC = () => {
  const [game, setGame] = useState<GameState | null>(null);
  const [id, setId] = useState("");
  const [error, setError] = useState("");
  const [playerRole, setPlayerRole] = useState<"X" | "O" | null>(null);

  const { connected } = useWebSocket(game?.id || null, setGame);

  async function handleNew() {
    setError("");
    try {
      const g = await createGame();
      setGame(g);
      setId(g.id);
      setPlayerRole("X");
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleLoad() {
    setError("");
    if (!id) return setError("Enter Game ID");

    try {
      const g = await getGame(id);
      if ((g as any).status === "error") return setError((g as any).message);
      setGame(g);
      setPlayerRole("O");
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleClick(pos: number) {
    if (!game || game.winner || game.board[pos] !== "EMPTY") return;
    if (playerRole !== game.turn)
      return setError(`It's ${game.turn}'s turn! Please wait.`);
    try {
      await move(game.id, pos);
    } catch (err: any) {
      setError(err.message);
    }
  }

  return (
    <div className="app-container">
      {/* {game && <ConnectionStatus connected={connected} />} */}
      {game && (
        <ConnectionStatus
          connected={connected}
          playersConnected={game.playersConnected ?? 1}
        />
      )}

      <h1>Tic-Tac-Toe</h1>

      <div className="controls">
        <button onClick={handleNew} className="btn btn-primary">
          New Game
        </button>
        <input
          value={id}
          onChange={(e) => setId(e.target.value)}
          placeholder="Enter Game ID"
          className="input"
        />
        <button onClick={handleLoad} className="btn btn-secondary">
          Load Game
        </button>
      </div>

      {error && (
        <div className="error-toast">
          <span>{error}</span>
          <button className="close-btn" onClick={() => setError("")}>
            ×
          </button>
        </div>
      )}

      {game ? (
        <>
          <GameInfo
            gameId={game.id}
            turn={game.turn}
            winner={game.winner}
            playerRole={playerRole}
          />
          <Board
            board={game.board}
            onClick={handleClick}
            gameTurn={game.turn}
            playerRole={playerRole}
            winner={game.winner}
          />
        </>
      ) : (
        <div className="no-game">
          <p>🎮 No game loaded yet</p>
          <p>Click "New Game" to start playing!</p>
        </div>
      )}
    </div>
  );
};
