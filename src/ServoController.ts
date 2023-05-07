import { SerialPort }  from 'serialport'
import { ReadlineParser } from '@serialport/parser-readline'
import { config } from './Components/ConfLoader';
export const port = new SerialPort({ path: config.servoController, baudRate: 9600 });

const parser = port.pipe(new ReadlineParser({ delimiter: '\r\n' }));
console.log("ServoController Started")

let ServoReadyState: boolean = false;
export function getReadyState(): boolean {
   return ServoReadyState;
}
type ServoCallback = {
   identifier: string,
   resolve: () => void,
   latency: number
}
let ServoCallbacks: Array<ServoCallback> = [];

/**
 * Make sure ServoTypes are in sync with the extern/ServoControllerClient/ServoControllerClient.ino file,
 * and the Arduino in {config.servoController} is flashed with the same file.
 */
export enum ServoTypes {
   FoodBowl1 = "FoodBowl1",
   FoodBowl2 = "FoodBowl2",
   FoodDispenser = "FoodDispenser",
   DoorLock = "DoorLock",
   PoopPad1 = "PoopPad1",
   PoopPad2 = "PoopPad2"
}

parser.on('data', data=> {
   data.trim(); // remove trailing data.
   if (data === "Servo Ready!") {
      // Servo is ready to receive commands.
      console.log("ServoController: Servo is Ready!");
      reconnectCount = 0;
      ServoReadyState = true;
   }
   if (data.endsWith("UNK")) {
      return console.log("Unknown command received", data);
   }
   if (data.startsWith("ACK")) {
      const splits = data.split(" ");
      if (splits.length !== 2) {
         return console.log("Invalid ACK received", data);
      }
      console.log("ServoController: ACK received");
      const identifier = splits[1];
      const index = ServoCallbacks.findIndex(cb => cb.identifier === identifier);
      if (index === -1) {
         return console.log("ACK received but no callbacks is registered matching this callback.", data);
      } else {
         console.log("ServoController: ACK received and callback is found. Resolving callback for", identifier)
         console.log("ServoController: Callback latency", Date.now() - ServoCallbacks[index].latency, "ms");
         ServoCallbacks[index].resolve();
         // remove the callback from the array.
         ServoCallbacks.splice(index, 1);
      }
   }
});
let reconnectCount = 0;
function tryReconnect() {
   reconnectCount += 1;
   if (reconnectCount > 5) {
      console.error("ServoController: Failed to reconnect after 5 attempts. Exiting.");
      console.log("Ideally, the program should restart itself using pm2 or systemd.")
      process.exit(1);
   } else {
      try {
         port.open();
      }
      catch (e) {
         console.error("ServoController: Failed to reconnect. Retrying in 5 seconds.");
         console.error(e);
         console.error("Reconnect count:", reconnectCount)
         setTimeout(() => {
            tryReconnect();
         }, 5000);
      }
   }
}

port.on("close", () => {
   console.warn("ServoController: Port closed.");
   ServoReadyState = false;
   tryReconnect();
});
/**
 * Writes to a servo.
 * @param servo Servo Type  - See {@link ServoTypes}
 * @param angle Angle. 0 to 180.
 * @returns {Promise<void>}
 */
export function write(servo: ServoTypes, angle: number): Promise<void>  {
   const CallbackIdentifier = Date.now().toString(36); 
   console.log("[ServoController Debug] Writing to servo:", servo, "with angle:",  angle, "and callback ID:", CallbackIdentifier)
   if (!ServoReadyState) {
      console.log("[ServoController Debug]: Servo is not ready to receive commands.");
      return Promise.reject();
   }
   return new Promise((resolve, reject) => {

      port.write(`${servo} ${angle} ${CallbackIdentifier}\r\n`, (err) => {
         if (err) reject();
         port.drain((drainErr) => {
            if (drainErr) reject();
            console.log("[ServoController Debug]: Written and drained. Callback registered for", CallbackIdentifier)
            ServoCallbacks.push({ identifier: CallbackIdentifier, resolve, latency: Date.now() });
         })
      });
   });
}
export function writeDelayReturn(servo: ServoTypes, angle: number, delay: number): Promise<void> {
   return write(servo, angle).then(() => {
      return new Promise((resolve) => {
         setTimeout(() => {
            resolve();
         }, delay);
      });
   });
}