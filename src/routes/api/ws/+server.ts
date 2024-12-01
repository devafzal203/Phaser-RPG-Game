import { WebSocketServer, WebSocket } from "ws";
import { GameState } from "$lib/server/gameState";
import type { RequestHandler } from "@sveltejs/kit";
import { v4 as uuidv4 } from "uuid";

interface WebSocketHandler {
  socket: WebSocketServer;
  open: (socket: WebSocket) => void;
  message: (socket: WebSocket, message: any) => void;
  close: (socket: WebSocket) => void;
}

interface WebSocketResponse extends Response {
  webSocket: {
    accept(): WebSocketHandler;
  };
}

export const GET = (({ request }) => {
  const gameState = GameState.getInstance();
  const wss = new WebSocketServer({ noServer: true });

  const response = new Response(null, {
    status: 101,
    headers: {
      Upgrade: "websocket",
      Connection: "Upgrade",
    },
  });

  (response as WebSocketResponse).webSocket = {
    accept() {
      const playerId = uuidv4();

      return {
        socket: wss,
        open(socket: WebSocket) {
          gameState.addPlayer(playerId, socket);
        },
        message(socket: WebSocket, message: any) {
          const data = JSON.parse(message.toString());
          if (data.type === "playerMove") {
            gameState.updatePlayerPosition(
              playerId,
              data.position,
              data.direction
            );
          }
        },
        close(socket: WebSocket) {
          gameState.removePlayer(playerId);
        },
      };
    },
  };

  return response;
}) satisfies RequestHandler;
