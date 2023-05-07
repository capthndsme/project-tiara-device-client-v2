import { Thermometer, ThermometerRegions } from "./Types/DeviceSensors";
import sensor from "node-dht-sensor";
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

 
sensor.initialize(22, 4);
sensor.initialize(22, 22);
sensor.setMaxRetries(2);
/**
 * We are separating our DHT Reader from our main app.
 * The reason is that, for some reason, the DHT reader causes our ServoController to hangup.
 * It is not clear why this happens.
 * 
 */
console.log("THERMOMETERS_OK")
setInterval(() => {
	sensor.read(22, 4, function (err, temperature, humidity) {
		if (!err) {
         // Our inside thermometer has changed, so we should emit an event.
         thermometerInside.Temperature = temperature;
         thermometerInside.Humidity = humidity;
			let msg_str: string = "TEMP_INSIDE_READ " + String(temperature) + " " + String(humidity);
         console.log(msg_str)
        
		}  else {
			// console.log("ERR_READ TEMP_INSIDE") // This spams the console, so we should not do it.
		}
	});
	sensor.read(22, 22, function (err, temperature, humidity) {
		if (!err) {
         thermometerOutside.Temperature = temperature;
         thermometerOutside.Humidity = humidity;
			// Ensure we are not emitting a faulty value.
			let msg_str: string = "TEMP_OUTSIDE_READ " + String(temperature) + " " + String(humidity);
         console.log(msg_str)
		} else {
			// console.log("ERR_READ TEMP_INSIDE") // This spams the console, so we should not do it.
		}
	});
}, 4000);


 


