const i2cBus = require("i2c-bus");
const Pca9685Driver = require("pca9685").Pca9685Driver;

const options = {
   i2c: i2cBus.openSync(1),
   address: 0x40,
   frequency: 50,
   debug: false
};

function angleToPulseWidth(angle) {
   const MIN_PULSE_WIDTH = 750; // microseconds
   const MAX_PULSE_WIDTH = 2250; // microseconds
   const MIN_ANGLE = 0; // degrees
   const MAX_ANGLE = 180; // degrees
   const ANGLE_RANGE = MAX_ANGLE - MIN_ANGLE;
   const PULSE_WIDTH_RANGE = MAX_PULSE_WIDTH - MIN_PULSE_WIDTH;

   // Calculate the pulse width based on the desired angle
   const pulseWidth = ((angle - MIN_ANGLE) / ANGLE_RANGE) * PULSE_WIDTH_RANGE + MIN_PULSE_WIDTH;
   console.log("Pulse width: " + pulseWidth, "Angle: " + angle)
   // Return the pulse width as an integer
   return Math.round(pulseWidth);
}



module.exports = function () {


   return new Promise((resolve, reject) => {
      function write(channel, angle) {
         return new Promise((resolve, reject) => { 
            pwm.channelOn(channel);
            pwm.setPulseLength(channel, angleToPulseWidth(angle), 0 , resolve) });
      }
      function stop(channel) {
         return new Promise((resolve, reject) => {
            pwm.channelOff(channel, resolve);
         });


      }
      let pwm = new Pca9685Driver(options, function (err) {
         if (err) {
            console.error("[ServoManager] PCA9685 Initialisation error:", err);
         } else {
            console.log("[ServoManager] PCA9685 Initialisation success.");
         }
         resolve({
            write: write,
            stop: stop
         })
      });

   });
}