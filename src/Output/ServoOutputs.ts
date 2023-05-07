import { OutputToggleBase } from "../OutputToggleBase";
import { ServoTypes, write, writeDelayReturn } from "../ServoController";
import { ToggleType } from "../Types/DeviceBaseToggle";
import { ExecuteResult } from "../Types/ExecuteResult";
import { ToggleEvent } from "../Types/ToggleEvent";

/**
 * Because FoodDispense and FoodbowlClean both rely on the swing mechanism (FoodBowl1),
 * we need to have a FoodSwingLock to prevent both from being used at the same time.
 */

let FoodSwingLock = false;

// Utility functions

function FoodDispenseAction(repeat: number = 3): Promise<void> {
	if (repeat <= 0) {
		return Promise.resolve();
	} else {
      return new Promise((resolve) => {
         setTimeout(() => {
            // Dispense Open 
            write(ServoTypes.FoodDispenser, 90).then(() => {
               // Dispense Close
               setTimeout(() => {
                  write(ServoTypes.FoodDispenser, 0).then(() => {
                     return FoodDispenseAction(repeat - 1).then(resolve); // Add this line
                  });
               }, 400);
            });
         }, 300);
      });
      // Delay start
	}
}


/**
 *
 * @param servo Servo Type
 * @param angleStart Angle to Write - Start
 * @param angleEnd End angle.
 * @param delayStart Delay in ms before writing.
 * @param duration Duration in ms before writing to end angle.
 * @param repeat Repeat count. Default 3
 * @returns {Promise<void>}
 */
function GenericServoRepeating(
	servo: ServoTypes,
	angleStart: number,
	angleEnd: number,
	delayStart: number,
	duration: number,
	repeat: number = 3
): Promise<void> {
	if (repeat <= 0) {
		return Promise.resolve();
	} else {
      return new Promise(resolve => {
         setTimeout(() => {
            write(servo, angleStart).then(() => {
               setTimeout(() => {
                  write(servo, angleEnd).then(() => {
                     return GenericServoRepeating(servo, angleStart, angleEnd, delayStart, duration, repeat - 1);
                  });
               }, duration);
            });
         }, delayStart);
      })
	
	}
}

function FoodBowlDispense(event: ToggleEvent): Promise<ExecuteResult>  {
	if (FoodSwingLock) return Promise.resolve({
      success: false,
      message: "FOOD_SWING_LOCKED"
   });
	return new Promise((resolve) => {
		FoodSwingLock = true;
		// Open foodbowl1
		write(ServoTypes.FoodBowl1, 0)
			.then(() => {
				// Wait for foodbowl swing to open.
				setTimeout(() => {
					// Open our food dispenser
					FoodDispenseAction(2).then(() => {
                  // Close foodbowl1
                  console.log("FoodDispenseAction End")
                  write(ServoTypes.FoodBowl1, 90).then(() => {
                     FoodSwingLock = false;
                     
                     resolve({success: true});
                  });
               });
				}, 1000);
			})
			.catch((e) => {
				FoodSwingLock = false;
				console.warn("Servo writing failed.");
            console.trace(e);
            resolve({success: false, message: "ERROR_IN_SERVO"});
			});
	});
}



function FoodBowlClean(event: ToggleEvent): Promise<ExecuteResult>  {
   if (FoodSwingLock) return Promise.resolve({
      success: false,
      message: "FOOD_SWING_LOCKED"
   });
   return new Promise((resolve) => {
      FoodSwingLock = true;
      // Open foodbowl1
      writeDelayReturn(ServoTypes.FoodBowl1, 90, 1000)
      .then(() => {
         // Foodbowl1 is now open, now we can flip the foodbowl2
         writeDelayReturn(ServoTypes.FoodBowl2, 180, 1000)
         .then(() => {
            // Foodbowl2 is now open, now we can return to our original position
            // Close foodbowl2
            writeDelayReturn(ServoTypes.FoodBowl2, 0, 1000)
            .then(() => {
               // Close foodbowl1
               writeDelayReturn(ServoTypes.FoodBowl1, 0, 1000)
               .then(() => {
                  FoodSwingLock = false;
                  resolve({success: true});
               });
            });
         });
      })
      .catch(e=> {
         FoodSwingLock = false;
         console.warn("Servo writing failed.");
         console.trace(e);
         resolve({success: false, message: "ERROR_IN_SERVO"});
      })
   });
}

function PoopPadFrontCleaning(): Promise<ExecuteResult>  {
   return new Promise((resolve) => {
      GenericServoRepeating(
         ServoTypes.PoopPad1,
         135, // 135 degrees means a slower clockwise rotation in an continuous servo. 
         90,  // 90 degrees means stop .
         400, // 400ms start
         400, // 400ms duration (time to reach 90 degrees)
         2    // 2 repeats
      )
      .then(() => {
         resolve({success: true});
      })
      .catch(() => {
         resolve({success: false, message: "ERROR_IN_SERVO"});
      })
   });
}
function PoopPadBackCleaning(): Promise<ExecuteResult> {
   return new Promise((resolve) => {
      GenericServoRepeating(
         ServoTypes.PoopPad1,
         45, // 45 degrees means a slower counter-clockwise rotation in an continuous servo. 
         90, // 90 degrees means stop .
         400,
         400,
         2
      )
      .then(() => {
         resolve({success: true});
      })
      .catch(() => {
         resolve({success: false, message: "ERROR_IN_SERVO"});
      })
   });
}


OutputToggleBase("foodDispense", "Dispense Food", ToggleType.ONEOFF, FoodBowlDispense);
OutputToggleBase("foodbowlClean", "Clean foodbowl", ToggleType.ONEOFF, FoodBowlClean);
OutputToggleBase("poopPadFront", "Poop Pad Cleaning (front)", ToggleType.ONEOFF, PoopPadFrontCleaning);
OutputToggleBase("poopPadBack", "Poop Pad Cleaning (back)", ToggleType.ONEOFF, PoopPadBackCleaning);
// Door lock: Not implemented yet. Waiting for servo to arrive.
OutputToggleBase("doorLock", "Door Lock", ToggleType.SWITCH, (event) => Promise.resolve(true));
   