import { addOutput } from "./ScheduledTask/Scheduler";
import { SharedRPIO } from "./Components/SharedRPIO";
import { createOutput } from "./PersistedOutput";
import { OutputToggleBase } from "./OutputToggleBase";


export function SimpleStateOutput(pin: number, name: string, description: string): void {
   console.log(`[SimpleStateOutput] Creating simple state output object for ${name}`);
   addOutput(name);
   createOutput(name, description)
   SharedRPIO.open(pin, SharedRPIO.OUTPUT, SharedRPIO.LOW);
   OutputToggleBase(
      name,
      description,
      (event: { state: any; callback: any; }) => {
         return new Promise((resolve, reject) => {
            console.log(`[SimpleStateOutput for ${name}] Executing`);
            if (event.state) {
               SharedRPIO.write(pin, SharedRPIO.HIGH);
            } else {
               SharedRPIO.write(pin, SharedRPIO.LOW);
            }
            resolve({
               callback: event.callback,
            });
         });
      }
   )
}

 