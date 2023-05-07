import { Thermometer, ThermometerRegions } from "../Types/DeviceSensors";
 
import { SharedEventBus } from "./SharedEventBus";
let thermometerInside: Thermometer = {
	Temperature: -127, // -127 is the default value for the sensor, if it is -127, it is not connected.
	Humidity: -1, // We know for sure any sane humidity will be above 0, so we can use this to determine if the sensor is connected.
};
let thermometerOutside: Thermometer = {
	Temperature: -127, // -127 is the default value for the sensor, if it is -127, it is not connected.
	Humidity: -1, // We know for sure any sane humidity will be above 0, so we can use this to determine if the sensor is connected.
};

export let thermometerRegions: ThermometerRegions = {
	Inside: thermometerInside,
	Outside: thermometerOutside,
};

// When this file is imported, we should initialise or node-dht-sensor library.
// We should also set up a timer to update the values every 3 seconds.
// Additionally, we will emit an event when the values change (for Triggers System)

 
