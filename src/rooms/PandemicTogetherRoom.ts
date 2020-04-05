import { Room, Client } from "colyseus";
import { Schema, ArraySchema, MapSchema, type } from "@colyseus/schema";
import { GameElements } from "../game-components/GameElements"
import * as Constants from "../common/constants";
import * as DeckFunctions from "../game-components/DeckFunctions";
import Card from "../game-components/Card";
import Player from "../game-components/Player";
import GameHandler from "../game-components/GameHandler";

export class PandemicTogetherRoom extends Room {

  gameHandler = new GameHandler()

  onCreate (options: any) {
    this.maxClients = 4;
    this.setState(this.gameHandler.state);
    this.gameHandler.setupNewGameState();
  }

  onJoin (client: Client, options: any) {
    var player = new Player();
    player.name = options.name;
    player.sessionId = client.sessionId;
    this.state.players[client.sessionId] = player;
    this.state.numberOfPlayers++;
    console.log(client.sessionId + " joined ");
  }

  onMessage (client: Client, message: any) {
    console.log(client.sessionId + " message " + message);

    switch (message.type) {
      case Constants.GM_NEXT_TURN:
        this.state.currentTurn = this.state.currentTurn + 1;
        break;
      case Constants.GM_DRAW_CARD:
        break;
      case Constants.GM_PLAY_CARD:
        this.gameHandler.playerPlays(message);
        break;
      case Constants.GM_START_GAME:
        this.gameHandler.startNewGame();
        break;
      case Constants.GM_ADVANCE_TURN:
        this.gameHandler.nextTurn();
        break;
      case Constants.GM_CHAT_MESSAGE:
        break;
    }

    this.broadcast(message);

  }

  onLeave (client: Client, consented: boolean) {
    delete this.state.players[client.sessionId];
    console.log(client.sessionId + " left");
    this.state.numberOfPlayers--;

    //game over
    this.broadcast({type: "SERVER_MESSAGE", action: "GAME_OVER", reason: client.sessionId + " left"});
    this.gameHandler.resetGame(); //keep room

  }

  onDispose() {
  }

}
