import { io } from "socket.io-client";


// const URL = process.env.NODE_ENV === "production" 
//   ? undefined  // In produzione prende l'URL del sito stesso
//   : "http://localhost:3004";
const URL = "https://imgs.gruppomol.lcl";

const socket = io(URL, {
  path: "/teamGOG/multiplayer-buzzer/socket.io/",
  transports: ["websocket"]
});

export const useSocket = () => socket;