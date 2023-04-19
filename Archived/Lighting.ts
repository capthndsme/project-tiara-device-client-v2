const SimpleStateOutput = require("../SimpleStateOutput.js")
module.exports = function (app) {
   console.log("Lighting: Registering lighting output")
   SimpleStateOutput(app, 13, "lighting", "Interior Lights")
}