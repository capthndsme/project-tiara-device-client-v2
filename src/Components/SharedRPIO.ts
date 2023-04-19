import rpio from "rpio";

console.log("Initialising RPIO...")
rpio.init({
   gpiomem: true, // we dont need to run as root
   mapping: "physical",
})

export const SharedRPIO: Rpio = rpio;