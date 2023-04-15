const OutputToggleBase = require('../OutputToggleBase.js');
const sleep = require('../sleep.js');


module.exports = function (app) {
   fcb(app);
}

async function fcb(app) {
   try {
      await app.servoManager.write(0, 45);
      await app.servoManager.write(0, 0);
      console.log("[FoodBowlCleaning] Reset position to sane values done.");
      OutputToggleBase(app, "foodbowlClean", "Cleans foodbowl", async (outputExecute) => {
        await app.servoManager.write(0, 90);
        await sleep(2000);
        await app.servoManager.write(1, 180);
        await sleep(2000);
        await app.servoManager.write(1, 0);
        await sleep(2000);
        await app.servoManager.write(0, 0);
        console.log("[FoodBowlCleaning] Reset position to sane values after clean done.");
        
      });
    } catch (error) {
      // handle error
      console.log("[FoodBowlCleaning] Error:" , error)
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