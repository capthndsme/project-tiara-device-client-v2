#!/usr/bin/env node

import { SharedEventBus } from "./Components/SharedEventBus";
import fs from "node:fs"
// Initialise our ServoController as early as possible. Ignore the warning about unused vars.
// eslint-disable-next-line @typescript-eslint/no-unused-vars 
import * as ServoController from "./ServoController"; 
ServoController.port.open(() => {
   console.log("[PTClient] ServoController open success.");
})
import * as WSClient from "./WebSockets/WSClient"
import * as Scheduler from "./ScheduledTask/Scheduler"
console.log("[PTClient] Initialising client...");
Scheduler.initScheduler();
// Load our outputs here...
fs.readdirSync(__dirname + "/Output/").forEach((file) => {
   if (file.endsWith(".map")) return; // Do not attempt to load .map files.
   console.log(`[PTClient] Loading output ${file}`);
      import(`${__dirname}/Output/${file}`).then((output) => {
      console.log(`[PTClient] Loaded output ${file}`);
      
   });
});
SharedEventBus.emit("StartEvent")

WSClient.connect();

