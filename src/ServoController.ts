import { SerialPort } from "serialport";
import { ReadlineParser } from "@serialport/parser-readline";
import { config } from "./Components/ConfLoader";
import { SharedEventBus } from "./Components/SharedEventBus";
export const port = new SerialPort({
  path: config.servoController,
  lock: false,
  baudRate: 9600,
});

const parser = port.pipe(new ReadlineParser({ delimiter: "\r\n" }));
console.log("ServoController Started");

let ServoReadyState: boolean = false;
export function getReadyState(): boolean {
  return ServoReadyState;
}
type ServoCallback = {
  identifier: string;
  resolve: () => void;
  latency: number;
};
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
  PoopPad2 = "PoopPad2",
  FDispFlip = "FDispFlip", // Food Dispenser Quick Flip action (avoids callback delay, BUT blocks other actions)
}

port.on("open", () => {
  parser.on("data", (data: string) => {
    data = data.trim(); // remove trailing data.
    let start = Date.now();
    if (data === "Servo Ready!") {
      // Servo is ready to receive commands.
      console.log("ServoController: Servo is Ready!");
      port.flush();
      ServoReadyState = true;
      SharedEventBus.emit("ServoReady");
    } else if (data.endsWith("UNK")) {
      console.log("Unknown command received", data);
      return port.flush();
    } else if (data.startsWith("ACK")) {
      const splits = data.split(" ");
      if (splits.length !== 2) {
        console.log("Invalid ACK received", data);
        return port.flush();
      }
      console.log("ServoController: ACK received");
      const identifier = splits[1];
      const index = ServoCallbacks.findIndex(
        (cb) => cb.identifier === identifier
      );
      if (index === -1) {
        console.log(
          "ACK received but no callbacks is registered matching this callback.",
          data
        );
        return port.flush();
      } else {
        console.log(
          "ServoController: ACK received and callback is found. Resolving callback for",
          identifier
        );
        console.log(
          "ServoController: Callback latency",
          Date.now() - ServoCallbacks[index].latency,
          "ms"
        );
        ServoCallbacks[index].resolve();
        // remove the callback from the array.
        ServoCallbacks.splice(index, 1);
      }
    } else {
      console.log("ServoController: Unknown data received", data);
      return port.flush();
    }
    console.log("ServoController: Latency", Date.now() - start, "ms");
  });
});
port.on("close", () => {
  console.warn("ServoController: Port closed.");
  ServoReadyState = false;
  process.exit(1);
});
/**
 * Writes to a servo.
 * @param servo Servo Type  - See {@link ServoTypes}
 * @param angle Angle. 0 to 180.
 * @returns {Promise<void>}
 */
export function write(servo: ServoTypes, angle: number): Promise<void> {
  const CallbackIdentifier = Date.now().toString(36);
  console.log(
    "[ServoController Debug] Writing to servo:",
    servo,
    "with angle:",
    angle,
    "and callback ID:",
    CallbackIdentifier
  );
  if (!ServoReadyState) {
    console.log(
      "[ServoController Debug]: Servo is not ready to receive commands."
    );
    return Promise.reject();
  }
  return new Promise((resolve, reject) => {
    port.write(servo + " " + angle + " " + CallbackIdentifier + "\r\n", () => {
      port.drain();
      console.log(
        "[ServoController Debug]: Written. Callback registered for",
        CallbackIdentifier
      );
      ServoCallbacks.push({
        identifier: CallbackIdentifier,
        resolve,
        latency: Date.now(),
      });
    });
  });
}
export function writeDelayReturn(
  servo: ServoTypes,
  angle: number,
  delay: number
): Promise<void> {
  return write(servo, angle).then(() => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve();
      }, delay);
    });
  });
}
