// src/api/gameApi.ts
const BASE =
  import.meta.env.VITE_API_BASE || "http://10.10.21.39:2108/api/games";
export const WS_BASE =
  import.meta.env.VITE_WS_BASE || "http://10.10.21.39:2108/ws";

export interface GameState {
  id: string;
  board: ("EMPTY" | "X" | "O")[];
  turn: "X" | "O";
  winner: string | null;
  playersConnected?: number; // 👈 new optional field
}

export async function createGame(): Promise<GameState> {
  const r = await fetch(BASE, { method: "POST" });
  if (!r.ok) throw new Error(`Failed to create game (${r.status})`);
  return r.json();
}

export async function getGame(id: string): Promise<GameState> {
  const r = await fetch(`${BASE}/${id}`);
  const text = await r.text();

  if (!r.ok) throw new Error(`Game not found (status ${r.status}): ${text}`);
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Failed to parse JSON: ${text}`);
  }
}

export async function move(id: string, pos: number): Promise<GameState> {
  const r = await fetch(`${BASE}/${id}/move`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pos }),
  });
  if (!r.ok) {
    const text = await r.text();
    throw new Error(`Move failed (status ${r.status}): ${text}`);
  }
  return r.json();
}
