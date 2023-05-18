import { Socket, io } from "socket.io-client";
import { config } from "../Components/ConfLoader";
import {HWID_STRING} from "../Components/HWIDLoader";
import { SharedEventBus } from "../Components/SharedEventBus";
import { DeviceBaseToggle } from "../Types/DeviceBaseToggle";
import { ToggleEvent } from "../Types/ToggleEvent";
import { localDeviceState } from "../Components/LocalDeviceState";
import { DeviceReqStatus } from "../Types/DeviceReqStatus";
import { ScheduledTask } from "../Types/Scheduler";
import { getScheduledTasks, insertScheduledTask } from "../ScheduledTask/Scheduler";
import { createNotification } from "../Components/NotificationSender";
import { NotificationType } from "../Types/NotificationType";
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
// This is used to prevent the connect event from firing multiple times
let  connectOnceIndicator = true;
// Write a function to average the latency of the websocket
let slidingWindow = new Array<number>();
function addToSlidingWindow(latency: number) {
   slidingWindow.push(latency);
   // Keep the sliding window to 10 items
   if (slidingWindow.length > 10) {
      slidingWindow.shift();
   }
}
function average(arr: Array<number>) {
   let sum = 0;
   for (let i = 0; i < arr.length; i++) {
      sum += arr[i];
   }
   return sum / arr.length;
}
export function getAverageLatency(): number {
   return average(slidingWindow);
}
let connectFailCount = 0;
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
            let latency = (Date.now() - pingStart);
            console.log("[WSC] Heartbeat successful.", data.ts);
            console.log("[WSC] WebSocket Latency: " + latency + "ms");
            addToSlidingWindow(latency);
            console.log("[WSC] Average Latency: " + getAverageLatency() + "ms");
            socket.emit("SyncDeviceState", localDeviceState);
         }
      });
   }, 30000);
   socket.connect();
}


socket.on("connect", () => {
   console.log("Connected to server");
   
createNotification(
      "Device went online",
      "Device is online and connected to the server.",
      NotificationType.SYSTEM_STARTED
   )
   // Websocket is connected, emit event for other subsystems to use
   SharedEventBus.emit("WSClientConnected");
  
   console.log("Connected, syncing device state", localDeviceState);
   socket.emit("SyncDeviceState", localDeviceState);

});
socket.on("ToggleStateMutate", (data: DeviceBaseToggle, callback) => {
   console.log("ToggleStateMutate", data.toggleName);
   const toggleEvent: ToggleEvent = {
      ...data,
      callback: callback
   }
   SharedEventBus.emit("ToggleEvent", null, toggleEvent);
});
socket.on("CameraStreamRequest", (data: any, callback: any) => {
   SharedEventBus.emit("CameraStreamRequest", null, {...data, callback});
});
socket.on("disconnect", () => {
   console.log("Disconnected from server");
   SharedEventBus.emit("WSClientDisonnected");
});

SharedEventBus.on("SystemTriggeredStart", () => {
   socket.timeout(9000).emit("SyncDeviceState", localDeviceState);
})

socket.on("getDeviceScheduler", (data, callback: (data: Array<ScheduledTask>) => void) => {
   console.log("getDeviceScheduler");
   callback(getScheduledTasks())
});

export function getSocket(): Socket {
   return socket;
}

socket.on("AddTrigger", (data: ScheduledTask, callback: (any) => void) => {
   const insertSuccess = insertScheduledTask(data);
   callback({success: insertSuccess});
});

socket.on("ManualPicture", () => {
   SharedEventBus.emit("ManualPicture");
}) 