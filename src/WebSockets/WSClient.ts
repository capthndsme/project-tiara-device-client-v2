import { io } from "socket.io-client";
import { config } from "../Components/ConfLoader";
import {HWID_STRING} from "../Components/HWIDLoader";
import { SharedEventBus } from "../Components/SharedEventBus";
export const socket = io(config.syncUrl + "/device", {
   autoConnect: false,
   reconnection: true,
   reconnectionDelay: 1500,
   reconnectionDelayMax: 5000,
   reconnectionAttempts: Infinity,
   query: {
      deviceHwid: HWID_STRING,
      deviceToken: config.deviceToken
   }
});

export function connect() {
   console.log("Connecting to server");
   // This ensures our connection
   setInterval(() => {
      if (!socket.connected) {
         console.log("[WSC] Socket not connected, reconnecting");
         socket.connect();
      }
      console.log("[WSC] Sending heartbeat.")
      let pingStart = Date.now();
      socket.timeout(15000).emit("heartbeat", null, (err: boolean, data: any) => {
         if (err) {
            console.log("[WSC] Heartbeat failed.");
            console.log(err);
         } else {
            console.log("[WSC] Heartbeat successful.", data.ts);
            console.log("[WSC] WebSocket Latency: " + (Date.now() - pingStart) + "ms");
         }
      });
   }, 30000);
   socket.connect();
}

socket.on("connect", () => {
   console.log("Connected to server");
   SharedEventBus.emit("WSClientConnected");
});

socket.on("disconnect", () => {
   console.log("Disconnected from server");
   SharedEventBus.emit("WSClientDisonnected");
});
