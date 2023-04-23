import { OutputToggleBase } from "../OutputToggleBase";
import { sleep } from "../Components/sleep";
import * as servoManager from "../Components/ServoManager";
import { ToggleType } from "../Types/DeviceBaseToggle";

fcb();

async function fcb() {
	try {
		// Ensures we register the output first so the system knows about it.
		OutputToggleBase("foodbowlClean", "Foodbowl Cleaning", ToggleType.ONEOFF, async (outputExecute) => {
			try {
				await servoManager.write(0, 90);
				await sleep(2000);
				await servoManager.write(1, 180);
				await sleep(2000);
				await servoManager.write(1, 0);
				await sleep(2000);
				await servoManager.write(0, 0);
				console.log("[FoodBowlCleaning] Reset position to sane values after clean done.");
			}
         catch (e) {
            console.warn("[FoodbowlCleaning] An error was thrown during the cleaning process.");
            
         }
		});
		await servoManager.write(0, 45);
		await servoManager.write(0, 0);
		console.log("[FoodBowlCleaning] Reset position to sane values done.");
	} catch (error) { 
		// handle error
		console.log("[FoodBowlCleaning] Error:", error);
	}
}

/*
module.exports = function (app) {
   app.servoManager.write(0, 45)
      .then(() => {
         app.servoManager.write(0, 0).then(() => {
            console.log("[FoodBowlCleaning] Reset position to sane values done.");
            OutputToggleBase(app, "foodbowlClean", "Cleans foodbowl", (outputExecute) => {
               
               return new Promise((resolve) => {
                  app.servoManager.write(0, 90).then(() => {
                     setTimeout(() => {
                        app.servoManager.write(1, 180).then(() => {
                           setTimeout(() => {
                              app.servoManager.write(1, 0).then(() => {
                                 setTimeout(() => {
                                    app.servoManager.write(0, 0).then(() => {
                                       console.log("[FoodBowlCleaning] Reset position to sane values after clean done.");
                                       resolve();
                                    });
                                 }, 2000);
                              });
                           }, 2000);
                        });
                     }, 2000);
                  })
               })
            }
            )
         });
      })

} 
*/
