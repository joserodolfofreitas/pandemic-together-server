import { Room, Client } from "colyseus";
import { Schema, ArraySchema, MapSchema, type } from "@colyseus/schema";
import { GameElements } from './GameElements'
import * as Constants from './constants';
import * as DeckFunctions from './DeckFunctions';

class Card extends Schema {
  @type("string") cardId: string;
  @type("string") elementId: string;
  @type("string") type: string;
  @type("string") name: string;
  @type("string") description: string;
  @type("string") action: string;
  @type("number") maxImpactPerElement: number;
  @type(["string"]) impactedElements = new ArraySchema<string>();

  constructor({cardId, elementId, type, name, description, action, maxImpactPerElement = 0, impactedElements = []}) {
    super();
    this.cardId = cardId;
    this.elementId = elementId;
    this.type = type;
    this.name = name;
    this.description = description;
    this.action = action;
    this.maxImpactPerElement = maxImpactPerElement;
    for (var i = 0; i < impactedElements.length; i++) {
      this.impactedElements[i] = impactedElements[i];
    }
  }
}

class Player extends Schema {
  @type("string") sessionId: string;
  @type("string") name: string;
  @type("boolean") gameStart: boolean;
  @type([ Card ]) hand = new ArraySchema<Card>();
  @type([ Card ]) advantages = new ArraySchema<Card>();
  @type([ Card ]) disadvantages = new ArraySchema<Card>();
  @type([ Card ]) virusField = new ArraySchema<Card>();
}

class State extends Schema {
  @type("string") gameState: string;
  @type("uint8") numberOfPlayers: number;
  @type("uint8") currentTurn: number;
  @type({ map: Player }) players = new MapSchema();
  @type([ Card ]) deck = new ArraySchema<Card>();
  @type([ Card ]) disadvantagesDeck = new ArraySchema<Card>();
  @type([ Card ]) advantagesDeck = new ArraySchema<Card>();
}


export class PandemicTogetherRoom extends Room {
  maxClients = 4;

  setMainDeck() {

    var tempArray = DeckFunctions.getShuffledMainDeck(this.state.numberOfPlayers);

    this.state.deck = new ArraySchema<Card>();
    tempArray.forEach((card, index) => {
      card.cardId = "cardUID_" + index + "_" + Date.now();
      this.state.deck.push(new Card(card));
    });
  }

  setDisadvantagesDeck() {
    var tempArray = DeckFunctions.getShuffledDisadvantagesDeck (this.state.numberOfPlayers);

    this.state.disadvantagesDeck = new ArraySchema<Card>();
    tempArray.forEach((card, index) => {
      card.cardId = "cardUID_D_" + index + "_" + Date.now();
      this.state.disadvantagesDeck.push(new Card(card));
    });
  }

  setAdvantagesDeck() {
    var tempArray = DeckFunctions.getShuffledAdvantagesDeck (this.state.numberOfPlayers);

    this.state.advantagesDeck = new ArraySchema<Card>();
    tempArray.forEach((card, index) => {
      card.cardId = "cardUID_A_" + index + "_" + Date.now();
      this.state.advantagesDeck.push(new Card(card));
    });
  }

  setupDecks() {
    this.setMainDeck();
    this.setDisadvantagesDeck();
    this.setAdvantagesDeck();
  }

  drawCardForPlayer(player) {
    var card = this.state.deck.pop();

    if (card.type == Constants.CARD_TYPE_VIRUS) {
      player.virusField.push(card);
    } else {
      player.hand.push(card);
    }
    return player;
  }

  setPlayersInitialHands() {
    for (let id in this.state.players) {
      var player = this.state.players[id];
      for (var i = 0; i < 3; i++) {
        this.drawCardForPlayer(player);
      }

      player.disadvantages.push(this.state.disadvantagesDeck.pop());
      player.advantages.push(this.state.advantagesDeck.pop());

      this.state.players[id] = player;
    }
  }

  startNewGame() {
    this.setupDecks();
    this.setPlayersInitialHands();
    this.state.gameState = Constants.GAME_STATE_STARTED;
  }

  onCreate (options: any) {
    var state = new State();
    state.currentTurn = 0;
    state.numberOfPlayers = 0;
    state.gameState = Constants.GAME_STATE_WAITING_PLAYERS;
    this.setState(state);
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
        break;
      case Constants.GM_START_GAME:
        this.startNewGame();
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
  }

  onDispose() {
  }

}
