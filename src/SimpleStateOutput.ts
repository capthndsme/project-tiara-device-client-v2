const OutputToggleBase = require("./OutputToggleBase.js");

/**
 * Simple Toggle Based Output 
 * @public
 * @param {object} app - The main app object.
 * @param {string} pin - PIN of the toggle.
 * @param {string} name - Name of output object. Must be unique.
 * @param {function} description - Description of the toggle.
 */

function SimpleStateOutput(app, pin, name, description) {
   console.log(`[SimpleStateOutput] Creating simple state output object for ${name}`);
   app.rpio.open(pin, app.rpio.OUTPUT, app.rpio.LOW);
   OutputToggleBase(app, name, description, (eventData) => {
      return new Promise((resolve) => {
         console.log("SimpleStateOutput", name, "toggling to", eventData.toggleValue);
         app.rpio.write(pin, eventData.toggleValue ? 1 : 0);
         resolve();
      });
   });
}

module.exports = SimpleStateOutput; 