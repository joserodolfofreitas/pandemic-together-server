import { Schema, ArraySchema, MapSchema, type } from "@colyseus/schema";
import * as Constants from "../common/constants";
import * as DeckFunctions from "./DeckFunctions";
import Card from "./Card";
import Player from "./Player";
import { GameElements } from './GameElements'


class NewRoundMessage extends Schema {
    @type("string") type: string;
    @type("string") action: string;
    @type("string") nullifiedBy: string;
    @type("string") playerId: string;
    @type("string") playerSrc: string;
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
    //@type([ Card ]) cardGraveyard = new ArraySchema<Card>(); // maybe we'll need a graveyard;
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
    checkVictoryCondition() {
        if (this.state.numberOfVirus == 0) {
            this.state.gameState = Constants.GAME_STATE_VICTORY_END;
        }
    };
    checkGameOverCondition() {

        //condition 1. No player has more virus than MAX_VIRUS_CARD_PER_PLAYER
        for (let id in this.state.players) {
            const player = this.state.players[id];
            if (player.virusField.length > Constants.MAX_VIRUS_CARD_PER_PLAYER) {
                this.state.gameState = Constants.GAME_STATE_OVER;
                return;
            }

        }

        //condition 2. If deck is empty and players can't win the game anymore.
        if (this.state.deck.length == 0) {
            var remainingTokens = 0;
            var remainingActionAgainstTokens = 0;
            for (let id in this.state.players) {
                const player = this.state.players[id];
                player.virusField.map((virus) => {
                    remainingTokens += virus.tokens;
                });
                player.hand.map((resource) => {
                   if (resource.action == Constants.ACTION_DESTROY_VIRUS_TOKEN) {
                       remainingActionAgainstTokens += resource.maxTokensImpact;
                   }
                });
            }

            if (remainingTokens > remainingActionAgainstTokens) {
                this.state.gameState = Constants.GAME_STATE_OVER;
            }
        }
    }

    drawCardForPlayer(player) {
        if (this.state.deck.length == 0) {
            console.log("deck empty");
            this.checkGameOverCondition();
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

    virusSpreadToPlayer(player, virusSrc) {
        const nullifiedBy = player.advantages.filter(counterCard => counterCard.action == Constants.ACTION_PREVENT_FROM_NEIGHBOR_INFECTION);
        var newRoundMessage = new NewRoundMessage();

        if (nullifiedBy.length > 0) {
            console.log("spreadTo", player.name, "but it was nullified");
            newRoundMessage.type = Constants.ACTION_NEIGHBOUR_INFECTION;
            newRoundMessage.playerId = player.sessionId;
            newRoundMessage.playerSrc = virusSrc.cardHolder.sessionId;
            newRoundMessage.cardSrc = virusSrc.cardId;
            newRoundMessage.nullifiedBy = nullifiedBy[0].elementId;
        } else {
            var cardRef = GameElements.cards[0];
            var card = new Card(Object.assign(cardRef, {cardId : "cardUID_NBV_" + Date.now() + "__SRC__" + virusSrc.cardId}));
            card.cardHolder = player.sessionId;
            player.virusField.push(card);

            newRoundMessage.type = Constants.ACTION_NEIGHBOUR_INFECTION;
            newRoundMessage.playerId = player.sessionId;
            newRoundMessage.playerSrc = virusSrc.cardHolder.sessionId;
            newRoundMessage.cardSrc = virusSrc.cardId;
            newRoundMessage.cardTargets.push(card.cardId);
            this.state.numberOfVirus = this.state.numberOfVirus + 1;
        }

        this.state.newRoundMessages.push(newRoundMessage);
    }

    applyVirusSpread () {
        const playerIds = Object.keys(this.state.players);
        for (var playerIndex = 0; playerIndex < playerIds.length; playerIndex++) {
            const player = this.state.players[playerIds[playerIndex]];
            if (player.virusField.length > 0) {
                player.virusField.map((virus) => {
                    if (!virus.contained) { //contained virus don't spread.
                        if (virus.tokens >= Constants.TOKENS_SPREAD_THRESHOLD && !virus.spreadedToNeighbours) {
                            var neighborToTheLeft = playerIndex + 1;
                            if (neighborToTheLeft >= playerIds.length) {
                                neighborToTheLeft = 0;
                            }
                            this.virusSpreadToPlayer(this.state.players[playerIds[neighborToTheLeft]], virus);
                            var neighborToTheRight = playerIndex -1;
                            if (neighborToTheRight < 0) {
                                neighborToTheRight = playerIds.length - 1;
                            }
                            this.virusSpreadToPlayer(this.state.players[playerIds[neighborToTheRight]], virus);
                            virus.spreadedToNeighbours = true;
                        }
                    }
                });
            }

        }
    }
    applyCharacterEffects (player, cardsArray, counterCardsArray) {
        cardsArray.map((card) => {
            const nullifiedBy = counterCardsArray.filter(counterCard => counterCard.action == Constants.ACTION_PREVENT_CARD_ACTION && counterCard.impactedElements.includes(card.elementId));
            if (nullifiedBy != undefined && nullifiedBy.length > 0) {
                var newRoundMessage = new NewRoundMessage();
                newRoundMessage.type = card.type;
                newRoundMessage.playerId = player.sessionId;
                newRoundMessage.cardSrc = card.cardId;
                newRoundMessage.nullifiedBy = nullifiedBy[0].elementId;
                this.state.newRoundMessages.push(newRoundMessage);
            } else {
                var onCards = new ArraySchema<Card>();


                var openIndexes = [];
                for (var i = 0; i < player.virusField.length; i++) {
                    openIndexes.push(i);
                }

                for (var i = 0; i < card.maxCardsImpact && i < player.virusField.length; i++) {

                    var noRepeatingIndex = Math.floor(Math.random() * openIndexes.length);
                    console.log("noRepeatingIndex",noRepeatingIndex, player.name);
                    var onCard = player.virusField[openIndexes[noRepeatingIndex]];
                    console.log("card", card.elementId, card.cardId );
                    console.log("onCard", onCard.elementId, onCard.cardId );
                    onCards.push(onCard);
                    openIndexes.splice(noRepeatingIndex, 1);
                }

                if (onCards.length > 0) {
                    this.applyCardEffect(card, player, onCards);

                    //create NewRoundMessage
                    var onCardIds = new ArraySchema<string>();
                    for (var j = 0; j < onCards.length; j++) {
                        const card = onCards[j];
                        onCardIds.push(card.cardId);
                    }
                    var newRoundMessage = new NewRoundMessage();
                    newRoundMessage.type = card.type;
                    newRoundMessage.action = card.action;
                    newRoundMessage.playerId = player.sessionId;
                    newRoundMessage.cardSrc = card.cardId;
                    newRoundMessage.cardTargets = onCardIds;
                    var virusTokenImpact;
                    switch (card.type) {
                        case Constants.ACTION_DESTROY_VIRUS_TOKEN:
                            virusTokenImpact = "-" + card.maxTokensImpact;
                            break;
                        case Constants.ACTION_CONTAIN_VIRUS:
                            virusTokenImpact = "0";
                            break;
                        case Constants.ACTION_INCREMENT_VIRUS_TOKEN:
                            virusTokenImpact = "+" + card.maxTokensImpact;
                            break;
                        default:
                            virusTokenImpact = "0";
                            break;
                    }
                    newRoundMessage.virusTokenImpact = virusTokenImpact;
                    this.state.newRoundMessages.push(newRoundMessage);
                }
            }
        });
    }
    applyNewRoundRules() {
        console.log("next round");
        if (this.state.round > 0) {
            this.state.newRoundMessages = new ArraySchema<NewRoundMessage>();

            for (let id in this.state.players) {
                var player = this.state.players[id];
                console.log("newRound players card", player.name);
                if (player.virusField.length > 0) {
                    player.virusField.map((virus) => {
                        if (!virus.contained) {
                            this.applyCardEffect(virus, player, [virus]);
                            let cardTargets = new ArraySchema<string>();
                            cardTargets.push(virus.cardId);

                            var newRoundMessage = new NewRoundMessage();
                            newRoundMessage.type = virus.type;
                            newRoundMessage.action = virus.action;
                            newRoundMessage.playerId = player.sessionId;
                            newRoundMessage.cardTargets = cardTargets
                            newRoundMessage.virusTokenImpact = "+" + virus.maxTokensImpact;
                            this.state.newRoundMessages.push(newRoundMessage);
                        }
                    });

                    //third parameter is the counterCardsArray
                    this.applyCharacterEffects(player, player.advantages, player.disadvantages); //apply common advantages
                    this.applyCharacterEffects(player, player.disadvantages, player.advantages); //apply common disadvantages
                }
            }


            this.applyVirusSpread();
            this.checkGameOverCondition();
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

    applyCardEffect(playedCard, onPlayer, onCards) {
        var card = playedCard;
        switch (card.action) {
            //TODO a card that frees a virus
            case Constants.ACTION_CONTAIN_VIRUS:
                onCards.map(onCard => {
                    console.log("apply ACTION_CONTAIN_VIRUS effect =>", card.elementId,  card.cardId, " on ", onCard.elementId, onCard.cardId);
                    for (var i = 0; i < onPlayer.virusField.length; i++) {
                        var virus = onPlayer.virusField[i];
                        if (virus.cardId == onCard.cardId) {
                            virus.contained = true;
                            onPlayer.virusField[i] = virus;
                        }
                    }
                });

                break;
            case Constants.ACTION_DESTROY_VIRUS_TOKEN:
                onCards.map(onCard => {
                    console.log("apply ACTION_DESTROY_VIRUS_TOKEN effect =>", card.elementId,  card.cardId, " on ", onCard.elementId ,onCard.cardId);
                    var onVirus = onPlayer.virusField.filter(card => card.cardId == onCard.cardId)[0];
                    onVirus.tokens -= card.maxTokensImpact;
                    if (onVirus.tokens < 1) {
                        onPlayer.virusField = onPlayer.virusField.filter(card => card.cardId != onCard.cardId);
                        onVirus = null; //.graveyard = true;
                        this.state.numberOfVirus = this.state.numberOfVirus - 1;
                        this.checkVictoryCondition();
                    }
                });

                break;
            case Constants.ACTION_INCREMENT_VIRUS_TOKEN:
                onCards.map(onCard => {
                    console.log("apply ACTION_INCREMENT_VIRUS_TOKEN effect =>", card.elementId, card.cardId, " on ", onCard.elementId, onCard.cardId);
                    var onVirus = onPlayer.virusField.filter(card => card.cardId == onCard.cardId)[0];
                    onVirus.tokens += card.maxTokensImpact;
                });
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
        player.hand = player.hand.filter(card => card.cardId != cardPlayed.cardId); //remove card from hand
        //cardPlayed.graveyard = true;
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