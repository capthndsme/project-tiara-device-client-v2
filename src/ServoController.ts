import { SerialPort }  from 'serialport'
import { ReadlineParser } from '@serialport/parser-readline'
const port = new SerialPort({ path: "/dev/ttyUSB0", baudRate: 9600 });

const parser = port.pipe(new ReadlineParser({ delimiter: '\r\n' }));

let ServoReadyState: boolean = false;
type ServoCallback = {
   identifier: string,
   resolve: () => void
}
let ServoCallbacks: Array<ServoCallback> = [];

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
         ServoCallbacks[index].resolve();
         ServoCallbacks.splice(index, 1);
      }
   }
});

export function write(servo: ServoTypes, angle: number): Promise<void> {
   const CallbackIdentifier = Date.now().toString(36); 
   if (!ServoReadyState) {
      return Promise.reject();
   }
   return new Promise((resolve, reject) => {
      ServoCallbacks.push({
         identifier: CallbackIdentifier,
         resolve
      });
      port.write(`${servo} ${angle} ${CallbackIdentifier}\r\n`);
   });
}