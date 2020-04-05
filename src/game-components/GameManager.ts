import { Schema, ArraySchema, MapSchema, type } from "@colyseus/schema";
import * as Constants from "../common/constants";
import * as DeckFunctions from "./DeckFunctions";
import Card from "./Card";
import Player from "./Player";


class NewRoundMessage extends Schema {
    @type("string") type: string;
    @type("string") action: string;
    @type("string") playerId: string;
    @type("string") cardSrc: string;
    @type([ "string" ]) cardTargets = new ArraySchema<string>();
    @type("string") virusTokenImpact: string;
}

class State extends Schema {
    @type("string") gameState: string;
    @type("uint8") numberOfPlayers: number;
    @type("string") currentTurn: string;
    @type("uint8") numberOfVirus: number;
    @type("uint8") round: number;
    @type("string") roundState: string;
    @type([ NewRoundMessage ]) newRoundMessages = new ArraySchema<NewRoundMessage>();
    @type({ map: Player }) players = new MapSchema();
    @type([ Card ]) deck = new ArraySchema<Card>();
    @type([ Card ]) cardGraveyard = new ArraySchema<Card>();
    @type([ Card ]) disadvantagesDeck = new ArraySchema<Card>();
    @type([ Card ]) advantagesDeck = new ArraySchema<Card>();
}

class GameHandler {

    state : State;
    playersThatEndedNewRoundAnimations = [];

    constructor() {
        this.state = new State();
    }

    setMainDeck() {

        var tempArray = DeckFunctions.getShuffledMainDeck(this.state.numberOfPlayers);
        this.state.numberOfVirus = tempArray.filter(function (card) {
            return card.type == Constants.CARD_TYPE_VIRUS;
        }).length;
        this.state.deck = new ArraySchema<Card>();
        tempArray.forEach((card, index) => {
            card.cardId = "cardUID_" + index + "_" + Date.now();
            this.state.deck.push(new Card(card));
        });
    }

    setDisadvantagesDeck() {
        var tempArray = DeckFunctions.getShuffledDisadvantagesDeck(this.state.numberOfPlayers);

        this.state.disadvantagesDeck = new ArraySchema<Card>();
        tempArray.forEach((card, index) => {
            card.cardId = "cardUID_D_" + index + "_" + Date.now();
            this.state.disadvantagesDeck.push(new Card(card));
        });
    }

    setAdvantagesDeck() {
        var tempArray = DeckFunctions.getShuffledAdvantagesDeck(this.state.numberOfPlayers);

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
        var card = new Card(cardDeck); //reinstantiating card to push all data to client.
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
            this.state.newRoundMessages = new ArraySchema<NewRoundMessage>();

            for (let id in this.state.players) {
                var player = this.state.players[id];
                //TODO apply disadvantages and advantages
                player.advantages.map((advantage) => {

                    if (player.virusField.length > 0) {
                        var onCards = new ArraySchema<Card>();

                        for (var i = 0; i < advantage.maxImpactPerElement; i++) {
                            var index = Math.floor(Math.random() * player.virusField.length); // TODO verify non repeating index
                            onCards.push(player.virusField[index]);
                        }

                        if (onCards.length > 0) {
                            this.applyCardEffect(advantage, player, onCards);

                            var onCardIds = new ArraySchema<string>();
                            for (var j = 0; j < onCards.length; j++) {
                                const card = onCards[j];
                                onCardIds.push(card.cardId);
                            }

                            var newRoundMessage = new NewRoundMessage();
                            newRoundMessage.type = advantage.type;
                            newRoundMessage.action = advantage.action;
                            newRoundMessage.playerId = player.sessionId;
                            newRoundMessage.cardSrc = advantage.cardId;
                            newRoundMessage.cardTargets = onCardIds;
                            newRoundMessage.virusTokenImpact = (advantage.type == Constants.ACTION_DESTROY_VIRUS_TOKEN) ? "+1" : "0";
                            this.state.newRoundMessages.push(newRoundMessage);
                        }
                    }


                    //TODO missing A4
                });

                player.disadvantages.map((disadvantage) => {

                });

                player.virusField.map((virus) => {
                    if (!virus.contained) {
                        virus.tokens++;
                        let cardTargets = new ArraySchema<string>();
                        cardTargets.push(virus.cardId);

                        var newRoundMessage = new NewRoundMessage();
                        newRoundMessage.type = virus.type;
                        newRoundMessage.action = virus.action;
                        newRoundMessage.playerId = player.sessionId;
                        newRoundMessage.cardTargets = cardTargets
                        newRoundMessage.virusTokenImpact = "+1";
                        this.state.newRoundMessages.push(newRoundMessage);
                    }
                });

            }


            this.state.roundState = Constants.ROUND_STATE_VIRUS_PHASE;
        } else {
            this.state.roundState = Constants.ROUND_STATE_PLAYERS_PHASE; //first round rules don't apply.
        }
        this.state.round = this.state.round + 1;

    }

    nextTurn() {
        console.log("next turn");
        const playerIds = Object.keys(this.state.players);
        if (this.state.currentTurn == "") {
            this.state.currentTurn = playerIds[0];
            this.applyNewRoundRules();
        } else {
            for (var i = 0; i < playerIds.length; i++) {
                const id = playerIds[i];
                if (this.state.currentTurn == id) {
                    var newTurnIndex = (i + 1 == playerIds.length) ? 0 : i + 1;
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

    moveRoundToPlayersPhase(playerId) {
        if (!this.playersThatEndedNewRoundAnimations.includes(playerId)) {
            this.playersThatEndedNewRoundAnimations.push(playerId);
        }
        if (this.playersThatEndedNewRoundAnimations.length == this.state.numberOfPlayers) {
            this.playersThatEndedNewRoundAnimations = [];
            this.state.roundState = Constants.ROUND_STATE_PLAYERS_PHASE;
        }
    }

    startNewGame() {
        this.setupDecks();
        this.setPlayersInitialHands();
        this.state.gameState = Constants.GAME_STATE_STARTED;
        this.state.roundState = Constants.ROUND_STATE_INITIAL_DRAW; //in case we ever need to do some animations at the beginning of the game.
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
                    for (var i = 0; i < onPlayer.virusField.length; i++) {
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
                    var onVirus = onPlayer.virusField.filter(card => card.cardId == onCard.cardId)[0];
                    onVirus.tokens -= card.maxImpactPerElement;
                    if (onVirus.tokens < 1) {
                        //onPlayer.virusField = onPlayer.virusField.filter(card => card.cardId != onCard.cardId);
                        onVirus.graveyard = true;
                        this.state.numberOfVirus = this.state.numberOfVirus - 1;
                        if (this.state.numberOfVirus == 0) {
                            this.state.gameState = Constants.GAME_STATE_VICTORY_END;
                        }
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

        var cardPlayed = player.hand.filter(card => card.cardId == playMessage.cardPlayed.cardId)[0]; //playMessage.cardPlayed;

        if (cardPlayed == undefined) {
            throw new Error("CardPlayed not found on server");
        }

        const onCards = onPlayer.virusField.filter(card => {
            for (var i = 0; i < playMessage.onCardIds.length; i++) {
                var cardId = playMessage.onCardIds[i];
                if (card.cardId == cardId) {
                    return true;
                }
            }
            return false;
        });

        this.applyCardEffect(cardPlayed, onPlayer, onCards);
        //player.hand = player.hand.filter(card => card.cardId != cardPlayed.cardId); //remove card from hand
        cardPlayed.graveyard = true;
        this.nextTurn();
    }

    setupNewGameState() {
        this.state.currentTurn = "";
        this.state.numberOfPlayers = 0;
        this.state.round = 0;
        this.state.gameState = Constants.GAME_STATE_WAITING_PLAYERS;
    }
}

export default GameHandler;