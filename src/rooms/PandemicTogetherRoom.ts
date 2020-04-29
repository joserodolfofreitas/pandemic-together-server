import { Room, Client } from "colyseus";
import { Schema, ArraySchema, MapSchema, type } from "@colyseus/schema";
import { GameElements } from "../game-components/GameElements"
import * as Constants from "../common/constants";
import * as DeckFunctions from "../game-components/DeckFunctions";
import Card from "../game-components/Card";
import Player from "../game-components/Player";
import GameManager from "../game-components/GameManager";

export class PandemicTogetherRoom extends Room {

  gameManager = new GameManager()

  onCreate (options: any) {
    this.maxClients = 4;
    this.setState(this.gameManager.state);
    this.gameManager.setupNewGameState();
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
      try {
          switch (message.type) {
            case Constants.GM_NEXT_TURN:
              break;
            case Constants.GM_DRAW_CARD:
              break;
            case Constants.GM_PLAY_CARD:
              this.gameManager.playerPlays(message);
              break;
            case Constants.GM_START_GAME:
              this.gameManager.startNewGame();
              this.lock();
              break;
            case Constants.GM_ADVANCE_TURN:
              this.gameManager.nextTurn();
              break;
            case Constants.GM_END_NEW_ROUND_ANIMATIONS:
              this.gameManager.moveRoundToPlayersPhase(message.playerId);
              break;
            case Constants.GM_CHAT_MESSAGE:
              this.broadcast(message);
              break;
          }
      } catch (err) {
        console.log("Error catched", err.message);
        this.broadcast({type: Constants.GAME_SERVER_ERROR, message: err.message});
      }
  }

  onLeave (client: Client, consented: boolean) {
    delete this.state.players[client.sessionId];
    console.log(client.sessionId + " left");
    this.state.numberOfPlayers--;

    //game over
    this.unlock();
    this.broadcast({type: Constants.GAME_SERVER_MESSAGE, action: "GAME_OVER", reason: client.sessionId + " left"});
    this.gameManager.resetGame(); //keep room

  }

  onDispose() {
  }

}
