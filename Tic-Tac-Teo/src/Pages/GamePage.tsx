// src/Pages/GamePage.tsx - modified
import React, { useState, useEffect } from "react";
import { createGame, getGame, move, type GameState } from "../api/gameApi";
import { useWebSocket } from "../CustomHooks/useWebSocket";


function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

export const GamePage: React.FC = () => {
  const [game, setGame] = useState<GameState | null>(null);
  const [id, setId] = useState("");
  const [error, setError] = useState("");
  const [playerRole, setPlayerRole] = useState<"X" | "O" | null>(null);
  const [copied, setCopied] = useState(false);
  const [loadingAction, setLoadingAction] = useState<"new" | "join" | null>(null);

  const { connected } = useWebSocket(game?.id || null, setGame);

  // Auto-dismiss error toast after 4 seconds
  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => setError(""), 4000);
    return () => clearTimeout(timer);
  }, [error]);

  async function handleNew() {
    setError("");
    setLoadingAction("new");
    try {
      const g = await createGame();
      setGame(g);
      setId(g.id);
      setPlayerRole("X");
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Failed to create room"));
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleLoad(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setError("");
    const trimmedId = id.trim();
    if (!trimmedId) return setError("Please enter a valid Room ID");

    setLoadingAction("join");
    try {
      const g = await getGame(trimmedId);
      
      setGame(g);
      setPlayerRole("O");
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Could not find room"));
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleClick(pos: number) {
    if (!game || game.winner || game.board[pos] !== "EMPTY") return;
    if (playerRole !== game.turn) {
      return setError(`Wait for Player ${game.turn} to make their move.`);
    }
    try {
      await move(game.id, pos);
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Failed to make move"));
    }
  }

  function handleCopyRoomId() {
    if (!game?.id) return;
    navigator.clipboard.writeText(game.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const isMyTurn = Boolean(game && !game.winner && playerRole === game.turn);
  const playersCount = game?.playersConnected ?? 1;

  return (
      <div className="app-container">
        {/* Top Navigation & Telemetry Header */}
        <header className="app-header">
          <div className="brand">
            <h1>Tic-Tac-Toe</h1>
            <span className="brand-badge">Live</span>
          </div>

          {game && (
              <div className="status-pill">
                <span className={`status-dot ${connected ? "online" : ""}`} />
                <span>{connected ? "Server Connected" : "Reconnecting..."}</span>
                <span>•</span>
                <span>{playersCount}/2 Players</span>
              </div>
          )}
        </header>

        {/* Matchmaking Controls */}
        <form className="controls-bar" onSubmit={handleLoad}>
          <button
              type="button"
              onClick={handleNew}
              disabled={loadingAction !== null}
              className="btn btn-primary"
          >
            {loadingAction === "new" ? "Creating..." : "+ Create Room"}
          </button>

          <div className="join-group">
            <input
                value={id}
                onChange={(e) => setId(e.target.value)}
                placeholder="Paste Room ID to join..."
                className="input"
            />
            <button
                type="submit"
                disabled={loadingAction !== null}
                className="btn btn-secondary"
            >
              {loadingAction === "join" ? "Joining..." : "Join"}
            </button>
          </div>
        </form>

        {/* Main Arena or Empty Onboarding State */}
        {game ? (
            <main className="arena-grid">
              {/* Left Column: Match HUD */}
              <aside className="hud-panel">
                {/* Room Code Card */}
                <div className="hud-card">
              <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 700 }}>
                Invite Opponent
              </span>
                  <div className="room-id-row">
                    <span className="room-code">{game.id}</span>
                    <button type="button" onClick={handleCopyRoomId} className="copy-btn">
                      {copied ? "✓ Copied" : "Copy ID"}
                    </button>
                  </div>
                </div>

                {/* Player Cards */}
                <div className="players-stack">
                  <div
                      className={`player-card ${
                          !game.winner && game.turn === "X" ? "active-turn-x" : ""
                      }`}
                  >
                    <div className="player-identity">
                      <div className="role-icon x">X</div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: "0.95rem" }}>
                          Player X
                          {playerRole === "X" && <span className="you-tag">You</span>}
                        </div>
                      </div>
                    </div>
                    {!game.winner && game.turn === "X" && (
                        <span className="turn-indicator" style={{ color: "var(--x-color)" }}>
                    Thinking...
                  </span>
                    )}
                  </div>

                  <div
                      className={`player-card ${
                          !game.winner && game.turn === "O" ? "active-turn-o" : ""
                      }`}
                  >
                    <div className="player-identity">
                      <div className="role-icon o">O</div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: "0.95rem" }}>
                          Player O
                          {playerRole === "O" && <span className="you-tag">You</span>}
                        </div>
                      </div>
                    </div>
                    {!game.winner && game.turn === "O" && (
                        <span className="turn-indicator" style={{ color: "var(--o-color)" }}>
                    Thinking...
                  </span>
                    )}
                  </div>
                </div>

                {/* Match Outcome Banner */}
                {game.winner && (
                    <div className="result-banner">
                      <h3>
                        {game.winner === "DRAW"
                            ? "🤝 It's a Draw!"
                            : game.winner === playerRole
                                ? "🏆 Victory! You Won!"
                                : `💀 Player ${game.winner} Wins!`}
                      </h3>
                      <button
                          type="button"
                          onClick={handleNew}
                          className="btn btn-primary"
                          style={{ width: "100%" }}
                      >
                        Start New Match
                      </button>
                    </div>
                )}
              </aside>

              {/* Right Column: Interactive 3x3 Board */}
              <section className="board-wrapper">
                <div className="board-container">
                  {game.board.map((cell, idx) => {
                    const isEmpty = cell === "EMPTY";
                    const canPlay = isEmpty && isMyTurn;
                    const hoverClass = canPlay
                        ? playerRole === "X"
                            ? "can-play-x"
                            : "can-play-o"
                        : "";

                    return (
                        <button
                            key={idx}
                            type="button"
                            className={`cell ${hoverClass}`}
                            disabled={!canPlay}
                            onClick={() => handleClick(idx)}
                            aria-label={`Cell ${idx + 1}`}
                        >
                          {!isEmpty && (
                              <span
                                  className={`symbol ${
                                      cell === "X" ? "x-symbol" : "o-symbol"
                                  }`}
                              >
                        {cell}
                      </span>
                          )}
                        </button>
                    );
                  })}
                </div>
              </section>
            </main>
        ) : (
            <section className="empty-state">
              <div className="empty-icon">⚔️</div>
              <h2>Ready for a Match?</h2>
              <p>
                Create a private room to get an invite code, or paste a friend's Room ID above to jump straight into a live game.
              </p>
            </section>
        )}

        {/* Floating Toast Notification */}
        {error && (
            <div className="error-toast" role="alert">
              <span>{error}</span>
              <button className="close-btn" onClick={() => setError("")} aria-label="Dismiss">
                ×
              </button>
            </div>
        )}
      </div>
  );
};
