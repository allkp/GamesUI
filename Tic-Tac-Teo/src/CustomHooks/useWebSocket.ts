// src/hooks/useWebSocket.ts
import { useEffect, useRef, useState } from "react";
import SockJS from "sockjs-client";
import { Client, type IMessage } from "@stomp/stompjs";
import { WS_BASE, type GameState } from "../api/gameApi";

export function useWebSocket(
  gameId: string | null,
  onMessage: (msg: GameState) => void,
  onErrorMessage?: (msg: string) => void
) {
  const stompClient = useRef<Client | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // 🧹 Cleanup any previous connection first
    if (stompClient.current) {
      stompClient.current.deactivate();
      stompClient.current = null;
    }

    const socket = new SockJS(WS_BASE);
    const client = new Client({
      webSocketFactory: () => socket as unknown as WebSocket,
      reconnectDelay: 3000,
      debug: (msg) => console.log(msg),

      onConnect: () => {
        console.log("✅ WebSocket connected");
        setConnected(true);

        // ✅ Subscribe for private error messages
        client.subscribe("/user/queue/errors", (message: IMessage) => {
          console.warn("⚠️ Error message:", message.body);
          if (onErrorMessage) onErrorMessage(message.body);
          else alert(message.body);
        });

        // ✅ Subscribe to game updates
        if (gameId) {
          client.subscribe(`/topic/game/${gameId}`, (message: IMessage) => {
            try {
              const updated = JSON.parse(message.body) as GameState ;
              onMessage(updated);
            } catch {
              console.error("⚠️ Failed to parse JSON:", message.body);
            }
          });
        }
      },

      onDisconnect: () => {
        console.warn("❌ WebSocket disconnected");
        setConnected(false);
      },

      onStompError: (frame) => {
        console.error("❌ STOMP Error:", frame.headers["message"]);
        console.error("Details:", frame.body);
      },

      onWebSocketError: (err) => {
        console.error("⚠️ WebSocket Transport Error:", err);
      },
    });

    client.activate();
    stompClient.current = client;

    return () => {
      console.log("🧹 Cleaning up WebSocket connection...");
      client.deactivate();
      stompClient.current = null;
    };
  }, [gameId, onMessage, onErrorMessage]);

  // Optional helper to send messages manually later
  function send(destination: string, body: unknown) {
    if (stompClient.current?.connected) {
      stompClient.current.publish({
        destination,
        body: JSON.stringify(body),
      });
    }
  }

  return { connected, stompClient, send };
}
