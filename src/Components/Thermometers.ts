import { Thermometer, ThermometerRegions } from "../Types/DeviceSensors";
import { SharedEventBus } from "./SharedEventBus";
import * as rl from "node:readline";
import * as fs from "node:fs";
import childprocess from "child_process";
let thermometerInside: Thermometer = {
	Temperature: -127, // -127 is the default value for the sensor, if it is -127, it is not connected.
	Humidity: -1, // We know for sure any sane humidity will be above 0, so we can use this to determine if the sensor is connected.
};
let thermometerOutside: Thermometer = {
	Temperature: -127, // -127 is the default value for the sensor, if it is -127, it is not connected.
	Humidity: -1, // We know for sure any sane humidity will be above 0, so we can use this to determine if the sensor is connected.
};
let thermometerCPU: Thermometer = {
	Temperature: -127, // -127 is the default value for the sensor, if it is -127, it is not connected.
	Humidity: -1, // There is, of course, no humidity sensor on the CPU.
};


export let thermometerRegions: ThermometerRegions = {
	Inside: thermometerInside,
	Outside: thermometerOutside,
	CPU: thermometerCPU
};

// When this file is imported, we should initialise or node-dht-sensor library.
// We should also set up a timer to update the values every 3 seconds.
// Additionally, we will emit an event when the values change (for Triggers System)

/**
 * MAJOR WARNING TO THERMOMETERS CODE:
 * Apparently, a failed read will cause our ServoController to hangup.
 * It is not clear why this happens.
 * We will now try to execute a node script that only reads the thermometers.
 */

// The TypeScript Compiler should take care of our IsolatedDHTReader.ts file
// being emitted to the correct location as a JavaScript file.

console.log("[Thermometers] Attempting to run IsolatedDHTReader...");
if (!fs.existsSync("./dist/IsolatedDHTReader.js")) {
	//
	console.log("[Thermometers] IsolatedDHTReader.js does not exist. Force-running the TypeScript compiler.");
	childprocess.execSync("npx tsc");
}
let proc = childprocess.spawn("node", ["./dist/IsolatedDHTReader.js"], {shell: true});
proc.on("spawn", () => {
	console.log("[Thermometers] IsolatedDHTReader spawned.");
	let linereader = rl.createInterface(proc.stdout, proc.stdin);
	linereader.on("line", (lineMsg) => {
		 

		const Message: string = lineMsg.toString().trim();
		const MessageSplits: string[] = Message.split(" ");
		if (MessageSplits.length !== 3) {
			return console.log("[Thermometers] IsolatedDHTReader sent an invalid message: " + Message);
		}
		const Command: string = MessageSplits[0];
		const Temperature: string = MessageSplits[1];
		const Humidity: string = MessageSplits[2];
		if (Command === "TEMP_INSIDE_READ") {
 
			thermometerInside.Temperature = Number(Temperature);
			thermometerInside.Humidity = Number(Humidity);
			SharedEventBus.emit("sensors.temp.inside", null, thermometerInside);
		} else if (Command === "TEMP_OUTSIDE_READ") {
		 
			thermometerOutside.Temperature = Number(Temperature);
			thermometerOutside.Humidity = Number(Humidity);

			SharedEventBus.emit("sensors.temp.outside", null, thermometerOutside);
		} else if (Command === "THERMOMETERS_OK") {
			console.log("IsolatedDHTReader started successfully.");
		} else {
			console.log("Unknown message from IsolatedDHTReader: " + Message);
		}
	});
});

proc.on("exit", (code, signal) => {
	console.log("[Thermometers] IsolatedDHTReader exited with code " + code + " and signal " + signal);
});
proc.on("close", (code, signal) => {
	console.log("[Thermometers] IsolatedDHTReader closed with code " + code + " and signal " + signal);
});


function readProcTemp() {
	fs.readFile("/sys/class/thermal/thermal_zone0/temp", (err, data) => {
		if (err) {
			console.log("[Thermometers] Failed to read CPU temperature: " + err);
			setTimeout(readProcTemp, 1000); // Try again in 1 second.
			return;
		}
		// Linux stores the temperature in millidegrees Celsius.
		const temp = Number(data.toString().trim()) / 1000;
		thermometerCPU.Temperature = temp;
		SharedEventBus.emit("sensors.temp.cpu", null, thermometerCPU);
	 
		setTimeout(readProcTemp, 3000); // Another read in 3 seconds.
	});
}

// Start the CPU temperature reader.
readProcTemp();