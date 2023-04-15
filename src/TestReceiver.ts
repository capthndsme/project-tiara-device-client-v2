import { SharedEventBus } from "./Components/SharedEventBus";
export function TestReceiver() {
   console.log("On")
   SharedEventBus.on("StartEvent", () => {
      console.log("StartEvent received");
   });
}