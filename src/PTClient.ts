import { SharedEventBus } from "./Components/SharedEventBus";
import * as WSClient from "./WebSockets/WSClient"
import * as Scheduler from "./ScheduledTask/Scheduler"
console.log("[PTClient] Initialising client...");
Scheduler.initScheduler();
WSClient.connect();
SharedEventBus.emit("StartEvent")