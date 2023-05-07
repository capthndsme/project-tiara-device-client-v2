import { addOutput } from "./ScheduledTask/Scheduler";
import { SharedRPIO } from "./Components/SharedRPIO";
import { createOutput } from "./PersistedOutput";
import { OutputToggleBase } from "./OutputToggleBase";
import { ToggleType } from "./Types/DeviceBaseToggle";
import { ToggleEvent } from "./Types/ToggleEvent";
import { ToggleResult } from "./Types/ToggleResult";
 


export function SimpleStateOutput(pin: number, name: string, description: string, toggleType: ToggleType): void {
   console.log(`[SimpleStateOutput] Creating simple state output object for ${name}`);
   addOutput(name);
   createOutput(name, description, toggleType)
   SharedRPIO.open(pin, SharedRPIO.OUTPUT, SharedRPIO.HIGH);
   OutputToggleBase(
      name,
      description,
      toggleType,
      (event: ToggleEvent): Promise<ToggleResult> => {
         return new Promise((resolve, reject) => {
            console.log(`[SimpleStateOutput for ${name}] Executing`);
            if (event.toggleValue) {
               SharedRPIO.write(pin, SharedRPIO.LOW);
            } else {
               SharedRPIO.write(pin, SharedRPIO.HIGH);
            }
            resolve({success: true});
         });
      }
   )
}

 