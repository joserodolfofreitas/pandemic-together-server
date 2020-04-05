import { Schema, ArraySchema, MapSchema, type } from "@colyseus/schema";
import Card from "./Card"
import * as Constants from "../common/constants";

class Player extends Schema {
  @type("string") sessionId: string;
  @type("string") name: string;
  @type("boolean") gameStart: boolean; //TODO when player clicks start button
  @type([ Card ]) hand = new ArraySchema<Card>();
  @type([ Card ]) advantages = new ArraySchema<Card>();
  @type([ Card ]) disadvantages = new ArraySchema<Card>();
  @type([ Card ]) virusField = new ArraySchema<Card>();
}


export default Player;