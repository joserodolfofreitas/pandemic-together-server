import { Room, Client } from "colyseus";
import { Schema, ArraySchema, MapSchema, type } from "@colyseus/schema";
import Player from "../game-components/Player";

class LobbyState extends Schema {
    @type("uint8") numberOfPlayers: number;
    @type({ map: Player }) players = new MapSchema();
}

export class Lobby extends Room {

    onCreate (options: any) {
        this.maxClients = 4000;
        this.setState(new LobbyState());
    }

    onJoin (client: Client, options: any) {
        var player = new Player();
        player.name = options.name;
        player.sessionId = client.sessionId;
        this.state.players[client.sessionId] = player;
        this.state.numberOfPlayers++;

        const textMessage = client.sessionId + " joined lobby"
        console.log(textMessage);
        this.broadcast(textMessage);
    }

    onMessage (client: Client, message: any) {
        console.log(client.sessionId + " message " + message);
        this.broadcast(message);
    }

    onLeave (client: Client, consented: boolean) {
        delete this.state.players[client.sessionId];
        this.state.numberOfPlayers--;

        const textMessage = client.sessionId + " left lobby"
        console.log(textMessage);
        this.broadcast(textMessage);
    }

    onDispose() {
    }

}
