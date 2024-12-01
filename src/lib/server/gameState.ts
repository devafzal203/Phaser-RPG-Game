import { WebSocket } from "ws";

export interface Player {
  id: string;
  position: { x: number; y: number };
  direction: string;
}

export class GameState {
  private static instance: GameState;
  private players: Map<string, Player> = new Map();
  private connections: Map<string, WebSocket> = new Map();

  private constructor() {}

  static getInstance(): GameState {
    if (!GameState.instance) {
      GameState.instance = new GameState();
    }
    return GameState.instance;
  }

  addPlayer(playerId: string, ws: WebSocket) {
    const newPlayer: Player = {
      id: playerId,
      position: { x: 100, y: 100 },
      direction: "down",
    };

    this.players.set(playerId, newPlayer);
    this.connections.set(playerId, ws);

    // Notify other players about the new player
    this.broadcast(playerId, {
      type: "newPlayer",
      player: newPlayer,
    });

    // Send existing players to the new player
    const existingPlayers = Array.from(this.players.entries())
      .filter(([id]) => id !== playerId)
      .map(([_, player]) => player);

    ws.send(
      JSON.stringify({
        type: "playerList",
        players: existingPlayers,
      })
    );
  }

  removePlayer(playerId: string) {
    this.players.delete(playerId);
    this.connections.delete(playerId);
    this.broadcast(playerId, {
      type: "playerLeft",
      playerId,
    });
  }

  updatePlayerPosition(
    playerId: string,
    position: { x: number; y: number },
    direction: string
  ) {
    const player = this.players.get(playerId);
    if (player) {
      player.position = position;
      player.direction = direction;
      this.broadcast(playerId, {
        type: "playerMove",
        playerId,
        position,
        direction,
      });
    }
  }

  private broadcast(senderId: string, message: any) {
    const messageStr = JSON.stringify(message);
    this.connections.forEach((ws, playerId) => {
      if (playerId !== senderId && ws.readyState === WebSocket.OPEN) {
        ws.send(messageStr);
      }
    });
  }
}
