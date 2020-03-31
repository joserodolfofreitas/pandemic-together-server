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
  @type("number") tokens: number;
  @type("number") maxImpactPerElement: number;
  @type(["string"]) impactedElements = new ArraySchema<string>();
  @type("string") cardHolder: string;
  @type("boolean") contained: boolean;

  constructor({cardId, elementId, type, name, description, action, maxImpactPerElement = 0, impactedElements = []}) {
    super();
    this.cardId = cardId;
    this.elementId = elementId;
    this.type = type;
    this.name = name;
    this.description = description;
    this.action = action;
    this.tokens = (type == Constants.CARD_TYPE_VIRUS)? 1 : 0;
    this.maxImpactPerElement = maxImpactPerElement;
    this.contained = false;

    for (var i = 0; i < impactedElements.length; i++) {
      this.impactedElements[i] = impactedElements[i];
    }
  }
}

class Player extends Schema {
  @type("string") sessionId: string;
  @type("string") name: string;
  @type("boolean") gameStart: boolean; //TODO when player clicks start button
  @type([ Card ]) hand = new ArraySchema<Card>();
  @type([ Card ]) advantages = new ArraySchema<Card>();
  @type([ Card ]) disadvantages = new ArraySchema<Card>();
  @type([ Card ]) virusField = new ArraySchema<Card>();
}

class State extends Schema {
  @type("string") gameState: string;
  @type("uint8") numberOfPlayers: number;
  @type("string") currentTurn: string;
  @type("uint8") round: number;
  @type({ map: Player }) players = new MapSchema();
  @type([ Card ]) deck = new ArraySchema<Card>();
  @type([ Card ]) disadvantagesDeck = new ArraySchema<Card>();
  @type([ Card ]) advantagesDeck = new ArraySchema<Card>();
}


export class PandemicTogetherRoom extends Room {


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
    if (this.state.deck.length == 0) {
      console.log("deck empty");
      return;
    }
    var cardDeck = this.state.deck.pop();
    var card = new Card(cardDeck); //I dont know why but I had to reinstatiate it.
    card.cardHolder = player.sessionId;

    if (card.type == Constants.CARD_TYPE_VIRUS) {
      player.virusField.push(card);
    } else {
      player.hand.push(card);
    }
  }

  setPlayersInitialHands() {
    for (let id in this.state.players) {
      var player = this.state.players[id];
      for (var i = 0; i < 3; i++) {
        this.drawCardForPlayer(player);
      }

      player.disadvantages.push(this.state.disadvantagesDeck.pop());
      player.advantages.push(this.state.advantagesDeck.pop());

      //this.state.players[id] = player;
    }
  }
  applyNewRoundRules() {
    console.log("next round");
    if (this.state.round > 0) {
      for (let id in this.state.players){
        var player = this.state.players[id];
        player.virusField.map((virus) => {
          if (!virus.contained) {
            virus.tokens++;
          }
        });
      }
    }
    this.state.round = this.state.round + 1;
    //TODO apply disadvantages and advantages
  }
  nextTurn () {
    console.log("next turn");
    const playerIds = Object.keys(this.state.players);
    if (this.state.currentTurn == "") {
      this.state.currentTurn = playerIds[0];
      this.applyNewRoundRules();
    } else {
      for (var i = 0; i< playerIds.length; i++) {
        const id = playerIds[i];
        if (this.state.currentTurn == id) {
          var newTurnIndex =  (i+1 == playerIds.length) ? 0 : i+1;

          if (newTurnIndex == 0) {
            this.applyNewRoundRules();
          }
          this.state.currentTurn = playerIds[newTurnIndex];
          break;
        }
      }
    }
    this.drawCardForPlayer(this.state.players[this.state.currentTurn]);
  }

  startNewGame() {
    this.setupDecks();
    this.setPlayersInitialHands();
    this.state.gameState = Constants.GAME_STATE_STARTED;
    this.nextTurn();
  }

  resetGame() {
    for (let id in this.state.players) {
      var player = this.state.players[id];
      player.hand = new ArraySchema<Card>();
      player.advantages = new ArraySchema<Card>();
      player.disadvantages = new ArraySchema<Card>();
      player.virusField = new ArraySchema<Card>();
      this.state.players[id] = player;
    }
    this.setupNewGameState();
  }

  applyCardEffect(card, onPlayer, onCards) {
    switch (card.action) {
      case Constants.ACTION_CONTAIN_VIRUS:
        onCards.map(onCard => {
          for (var i = 0; i < onPlayer.virusField.length; i++){
            var card = onPlayer.virusField[i];

            if (card.cardId == onCard.cardId) {
              card.contained = true;
              onPlayer.virusField[i] = card;
            }
          }
        });

        break;
      case Constants.ACTION_DESTROY_VIRUS_TOKEN:
        onCards.map(onCard => {
          console.log("apply card effect", card.cardId, onCard.cardId);
          var onVirus = onPlayer.virusField.filter(card  => card.cardId == onCard.cardId)[0];
          onVirus.tokens -= card.maxImpactPerElement;
          if (onVirus.tokens < 1) {
            onPlayer.virusField = onPlayer.virusField.filter(card  => card.cardId != onCard.cardId);
            onVirus = null;
          }
        });

        break;

      case Constants.ACTION_INCREMENT_VIRUS_TOKEN:
        break;
      case Constants.ACTION_INCREMENT_VIRUS_TOKEN_CARD:
        break;

      case Constants.ACTION_PREVENT_FROM_NEIGHBOR_INFECTION:
        break;
      case Constants.ACTION_PREVENT_RESOURCE:
        break;

      default:
        break;
    }
  }

  playerPlays(playMessage) {
    var player = this.state.players[playMessage.player];
    var onPlayer = this.state.players[playMessage.onPlayer];
    const cardPlayed = playMessage.cardPlayed;

    const onCards = onPlayer.virusField.filter(card  => {
      for (var i = 0; i < playMessage.onCardIds.length; i++) {
        var cardId = playMessage.onCardIds[i];
        if (card.cardId == cardId) {
          return true;
        }
      }
      return false;
    });

    this.applyCardEffect(cardPlayed, onPlayer, onCards);
    player.hand = player.hand.filter(card  => card.cardId != cardPlayed.cardId);
    this.nextTurn();
  }

  setupNewGameState() {
    this.state.currentTurn = "";
    this.state.numberOfPlayers = 0;
    this.state.round = 0;
    this.state.gameState = Constants.GAME_STATE_WAITING_PLAYERS;
  }

  onCreate (options: any) {
    this.maxClients = 4;
    var state = new State();
    this.setState(state);
    this.setupNewGameState();
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
        this.playerPlays(message);
        break;
      case Constants.GM_START_GAME:
        this.startNewGame();
        break;
      case Constants.GM_ADVANCE_TURN:
        this.nextTurn();
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
    this.resetGame(); //keep room

  }

  onDispose() {
  }

}
