import { Schema, ArraySchema, MapSchema, type } from "@colyseus/schema";
import * as Constants from "../common/constants";

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

export default Card;