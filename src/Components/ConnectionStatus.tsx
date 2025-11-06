// src/components/ConnectionStatus.tsx
import React from "react";
import "../Styles/ConnectionStatus.css"; // ✅ external style for reuse

interface ConnectionStatusProps {
  connected: boolean;
  playersConnected?: number;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  connected,
  playersConnected = 1,
}) => {
  let text = "Connecting...";
  if (connected && playersConnected < 2) text = "Waiting for opponent...";
  if (connected && playersConnected >= 2) text = "Both players connected!";
  return (
    <div className="connection-status">
      <div
        className={`status-dot ${connected ? (playersConnected >= 2 ? "both" : "waiting") : "disconnected"}`}
      ></div>
      {/* {connected ? "Connected" : "Connecting..."} */}
      {text}
    </div>
  );
};
