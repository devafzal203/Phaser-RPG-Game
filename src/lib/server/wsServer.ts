import { WebSocketServer } from "ws";
import { GameState } from "./gameState";

export function startWebSocketServer(port: number) {
  const wss = new WebSocketServer({ port });
  const gameState = GameState.getInstance();

  wss.on("connection", (ws) => {
    const playerId = crypto.randomUUID();

    gameState.addPlayer(playerId, ws);

    ws.on("message", (message) => {
      const data = JSON.parse(message.toString());
      if (data.type === "playerMove") {
        gameState.updatePlayerPosition(playerId, data.position, data.direction);
      }
    });

    ws.on("close", () => {
      gameState.removePlayer(playerId);
    });
  });

  console.log(`WebSocket server started on port ${port}`);
}
