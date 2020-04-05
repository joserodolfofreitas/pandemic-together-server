import http from "http";
import express from "express";
import cors from "cors";
import { Server } from "colyseus";
import { monitor } from "@colyseus/monitor";
import { PandemicTogetherRoom } from "./src/rooms/PandemicTogetherRoom";
import { Lobby } from "./src/rooms/Lobby";

const port = Number(process.env.PORT || 2567) + Number(process.env.NODE_APP_INSTANCE || 0);
const app = express()

app.use(cors());
app.use(express.json())

const server = http.createServer(app);
const gameServer = new Server({
  server,
});

// register your room handlers
gameServer.define('lobby', Lobby); //TODO lobby is blank and dumm
gameServer.define('pandemic-together-room', PandemicTogetherRoom);

app.use("/colyseus", monitor());

gameServer.listen(port);
console.log(`Listening on ws://localhost:${ port }`)
