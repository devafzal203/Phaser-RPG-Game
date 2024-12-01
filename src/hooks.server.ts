import { WebSocketServer } from "ws";
import { GameState } from "$lib/server/gameState";
import { v4 as uuidv4 } from "uuid";
import type { Handle } from "@sveltejs/kit";

const wss = new WebSocketServer({ noServer: true });
const gameState = GameState.getInstance();

export const handle: Handle = async ({ event, resolve }) => {
  if (event.url.pathname === "/api/ws") {
    if (event.request.headers.get("upgrade") === "websocket") {
      const response = new Response(null, {
        status: 101,
        headers: {
          Upgrade: "websocket",
          Connection: "Upgrade",
        },
      });

      // @ts-ignore
      const socket = event.request?.socket;
      const head = Buffer.from([]);

      wss.handleUpgrade(event.request as any, socket, head, (ws) => {
        const playerId = uuidv4();
        gameState.addPlayer(playerId, ws);

        ws.on("message", (message: string) => {
          try {
            const data = JSON.parse(message.toString());
            switch (data.type) {
              case "playerMove":
                gameState.updatePlayerPosition(
                  playerId,
                  data.position,
                  data.direction
                );
                break;
            }
          } catch (e) {
            console.error("Failed to parse message:", e);
          }
        });

        ws.on("close", () => {
          gameState.removePlayer(playerId);
        });
      });

      return response;
    }
  }

  return resolve(event);
};
