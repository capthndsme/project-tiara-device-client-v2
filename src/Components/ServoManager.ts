import i2cBus from "i2c-bus";
import { Pca9685Driver } from "pca9685";

const options = {
	i2c: i2cBus.openSync(1),
	address: 0x40,
	frequency: 50,
	debug: false,
};

export function angleToPulseWidth(angle) {
	const MIN_PULSE_WIDTH = 750; // microseconds
	const MAX_PULSE_WIDTH = 2250; // microseconds
	const MIN_ANGLE = 0; // degrees
	const MAX_ANGLE = 180; // degrees
	const ANGLE_RANGE = MAX_ANGLE - MIN_ANGLE;
	const PULSE_WIDTH_RANGE = MAX_PULSE_WIDTH - MIN_PULSE_WIDTH;

	// Calculate the pulse width based on the desired angle
	const pulseWidth = ((angle - MIN_ANGLE) / ANGLE_RANGE) * PULSE_WIDTH_RANGE + MIN_PULSE_WIDTH;
	console.log("[ServoManager Debug] Pulse width: " + pulseWidth, "Angle: " + angle);
	// Return the pulse width as an integer
	return Math.round(pulseWidth);
}

export let pwm: Pca9685Driver;

// Check if the PWM driver is initialised


function initialisePWMDriver() {
   
   return new Promise((resolve, reject) => {
      if (!pwm || pwm == null) {
         pwm = new Pca9685Driver(options, function (err) {
            if (err) {
               console.error("[ServoManager] PCA9685 Initialisation error:", err);
               resolve(false);
            } else {
               console.log("[ServoManager] PCA9685 Initialisation success.");
               resolve(true);
            }
         });
      } else {
         resolve(true);
      }
      
   });
}

initialisePWMDriver();

export function write(channel, angle) {
	return new Promise((resolve, reject) => {
      initialisePWMDriver().then((result) => {
         if (!result) {
            console.log("[ServoManager] PCA9685 Initialisation failed. Cannot write to servo.");
            return;
         };
         pwm.channelOn(channel);
		   pwm.setPulseLength(channel, angleToPulseWidth(angle), 0, resolve);
      });
	});
}
export function off(channel) {
	return new Promise((resolve, reject) => {
      initialisePWMDriver().then((result) => {
         if (!result) {
            console.log("[ServoManager] PCA9685 Initialisation failed. Cannot write to servo.");
            return;
         };
         pwm.channelOff(channel);
		 
      });
	});
}