import * as Constants from './constants';

//unique cards
export const GameElements = {
    cards: [

        {
            elementId: "VIRUS1",
            type: Constants.CARD_TYPE_VIRUS,
            name: "Virus",
            description: "Infections Killing Virus initial stage",
            action: Constants.ACTION_INCREMENT_VIRUS_TOKEN,
            increment: 1
        },
        {
            elementId: "R1",
            type: Constants.CARD_TYPE_RESOURCE,
            name: "Social Distancing",
            description: "Prevent a virus card to increment tokens",
            action: Constants.ACTION_CONTAIN_VIRUS,
            maxImpactPerElement: 1,
            impactedElements: ["VIRUS1"],
        },
        {
            elementId: "R2",
            type: Constants.CARD_TYPE_RESOURCE,
            name: "Quarantine/Lockdown",
            description: "Prevent 3 virus cards to increment tokens",
            action: Constants.ACTION_CONTAIN_VIRUS,
            maxImpactPerElement: 3,
            impactedElements: ["VIRUS1"],
        },
        {
            elementId: "R3",
            type: Constants.CARD_TYPE_RESOURCE,
            name: "Masks and Ventilators",
            description: "destroy one virus token",
            action: Constants.ACTION_DESTROY_VIRUS_TOKEN,
            maxImpactPerElement: 1,
            impactedElements: ["VIRUS1"],
        },
        {
            elementId: "R4",
            type: Constants.CARD_TYPE_RESOURCE,
            name: "Medics",
            description: "destroy three virus token",
            action: Constants.ACTION_DESTROY_VIRUS_TOKEN,
            maxImpactPerElement: 3,
            impactedElements: ["VIRUS1"],
        },
        {
            elementId: "A1",
            type: Constants.CARD_TYPE_ADVANTAGE,
            name: "Educated Population",
            description: "Each round prevents a virus card to increment token",
            action: Constants.ACTION_CONTAIN_VIRUS,
            maxImpactPerElement: 1,
            impactedElements: ["VIRUS1"],
        },
        {
            elementId: "A2",
            type: Constants.CARD_TYPE_ADVANTAGE,
            name: "Public Health System",
            description: "Each round prevents three virus cards to increment token",
            action: Constants.ACTION_CONTAIN_VIRUS,
            maxImpactPerElement: 3,
            impactedElements: ["VIRUS1"],
        },
        {
            elementId: "A3",
            type: Constants.CARD_TYPE_ADVANTAGE,
            name: "Advanced Research Labs",
            description: "Each round destroys a virus card token",
            action: Constants.ACTION_DESTROY_VIRUS_TOKEN,
            maxImpactPerElement: 1,
            impactedElements: ["VIRUS1"],
        },
        {
            elementId: "A4",
            type: Constants.CARD_TYPE_ADVANTAGE,
            name: "Safe ports",
            description: "Cant get infected by neighbohrs.",
            action: Constants.ACTION_PREVENT_FROM_NEIGHBOR_INFECTION,
        },
        {
            elementId: "D1",
            type: Constants.CARD_TYPE_DISADVANTAGE,
            name: "Social Ignorance",
            description: "Each round increments a token to a virus card",
            action: Constants.ACTION_INCREMENT_VIRUS_TOKEN,
            maxImpactPerElement: 1,
            impactedElements: ["VIRUS1"],
        },
        {
            elementId: "D2",
            type: Constants.CARD_TYPE_DISADVANTAGE,
            name: "Slums",
            description: "Each round increments two tokens to a virus card",
            action: Constants.ACTION_INCREMENT_VIRUS_TOKEN,
            maxImpactPerElement: 2,
            impactedElements: ["VIRUS1"],
        },
        {
            elementId: "D3",
            type: Constants.CARD_TYPE_DISADVANTAGE,
            name: "Fighiting Narratives",
            description: "Each round increments a token in three virus card",
            action: Constants.ACTION_INCREMENT_VIRUS_TOKEN_CARD,
            maxImpactPerElement: 3,
            impactedElements: ["VIRUS1"],
        },
        {
            elementId: "D4",
            type: Constants.CARD_TYPE_DISADVANTAGE,
            name: "Overloaded hospitals",
            description: "Nullify Advantage Card 2 and Resource Card 4 takes no effect",
            action: Constants.ACTION_PREVENT_RESOURCE,
            maxImpactPerElement: 1,
            impactedElements: ["A2", "R4"],
        },
    ],
}
