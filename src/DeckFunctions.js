import { GameElements } from './GameElements'
import * as Constants from './constants';

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

export function getShuffledMainDeck(numberOfPlayers) {
    var virusCard = GameElements.cards[0];
    var resourceCards =  GameElements.cards.filter(function(card) {
        return card.type == Constants.CARD_TYPE_RESOURCE;
    });



    var deck = [];
    for (var i = 0; i < numberOfPlayers * 4; i++) {
        deck.push(virusCard);
    }

    for (var j = 0; j < numberOfPlayers; j++) {
        deck.push(...resourceCards); //numberOfPlayers * each resource card;
    }

    deck = shuffle(deck);
    return deck;
}

function getShuffledSimpleDeck(numberOfPlayers, cardType) {

    var cards =  GameElements.cards.filter(function(card) {
        return card.type == cardType;
    });

    var deck = [];

    for (var j = 0; j < numberOfPlayers; j++) {
        deck.push(...cards); //numberOfPlayers * each resource card;
    }

    deck = shuffle(deck);
    return deck;
}

export function getShuffledDisadvantagesDeck(numberOfPlayers) {
    return getShuffledSimpleDeck(numberOfPlayers, Constants.CARD_TYPE_DISADVANTAGE);
}

export function getShuffledAdvantagesDeck(numberOfPlayers) {
    return getShuffledSimpleDeck(numberOfPlayers, Constants.CARD_TYPE_ADVANTAGE);
}