import { Room, Client } from "colyseus";
import { Schema, ArraySchema, MapSchema, type } from "@colyseus/schema";
import { GameElements } from './GameElements'
import * as Constants from './constants';

class Card extends Schema {
  @type("string") cardId: string;
  @type("string") elementId: string;
  @type("string") type: string;
  @type("string") name: string;
  @type("string") description: string;
  @type("string") action: string;
  @type("number") maxImpactPerElement: number;
  @type(["string"]) impactedElements = new ArraySchema<string>();

  constructor({elementId, type, name, description, action, maxImpactPerElement = 0, impactedElements = []}) {
    super();
    this.cardId = "cardUID_" + Date.now();
    console.log(this.cardId);
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
  @type("string") name: string;
  @type("boolean") gameStart: boolean;
  @type([ Card ]) hand = new ArraySchema<Card>();
}

class State extends Schema {
  @type("uint8") currentTurn: number;
  @type({ map: Player }) players = new MapSchema();
  @type([ Card ]) deck = new ArraySchema<Card>();
}

function shuffle(array) {
  var currentIndex = array.length, temporaryValue, randomIndex;

  // While there remain elements to shuffle...
  while (0 !== currentIndex) {

    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;

    // And swap it with the current element.
    temporaryValue = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temporaryValue;
  }

  return array;
}

export class PandemicTogetherRoom extends Room {
  maxClients = 4;

  onCreate (options: any) {
    var state = new State();
    state.currentTurn = 0;
    var virusCard = GameElements.cards[0];
    var resourceCards =  GameElements.cards.filter(function(card) {
      return card.type == Constants.CARD_TYPE_RESOURCE;
    });

    console.log("resourceCards.length", resourceCards.length);

    var tempArray = [];
    for (var i = 0; i < 12; i++) {
      tempArray.push(virusCard); //12 virus cards;
    }

    for (var j = 0; j < 3; j++) {
      tempArray.push(resourceCards); //three from each resource card;
    }

    tempArray = shuffle(tempArray);


    tempArray.forEach(card => {
      state.deck.push(new Card(card));
    });


    this.setState(state);
  }

  onJoin (client: Client, options: any) {
    var player = new Player();
    player.name = options.name;
    this.state.players[client.sessionId] = player;
    console.log(client.sessionId + " joined ");
  }

  onMessage (client: Client, message: any) {
    console.log(client.sessionId + " message " + message);
    if (message == "NEXT_TURN") {
      this.state.currentTurn = this.state.currentTurn + 1;
    } else {
      this.broadcast(message);
    }

  }

  onLeave (client: Client, consented: boolean) {
    delete this.state.players[client.sessionId];
    console.log(client.sessionId + " left");
  }

  onDispose() {
  }

}
