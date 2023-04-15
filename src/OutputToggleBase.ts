import { addOutput } from "./ScheduledTask/Scheduler";

function OutputToggleBase(app, outputName, outputDescription = "", executeFunction) {
   console.log(`[OutputToggleBase] Creating ToggleBase for ${outputName}`);
   
   app.outputPersist.registerOutputName(outputName, outputDescription);
   addOutput(outputName)
   app.eventBus.on("ToggleEvent", (event) => {
      console.log(`[OutputToggleBase for ${outputName}] Toggle Event Received (Event is ${event.toggleName})`)
      if (event.toggleName == outputName) {
         if (app.outputPersist.startExecuteWithLock(outputName)) {
            executeFunction(event).then((executeData) => {
               console.log("Execute function ended");
               app.outputPersist.endExecuteWithLock(outputName).then(() => {
                  app.eventBus.emit("AcknowledgeBackendAction", null, event.eventHash);
               })
            });
         } else {
            app.eventBus.emit("AcknowledgeBackendAction", null, event.eventHash, {
               hasError: true,
               error: "ERR_OUTPUT_HAS_LOCK"
            });
         }
      }
   });
   app.eventBus.on("ToggleEventSystemTriggered", (event) => {
      if (event.toggleName == outputName) {
         console.log("[OutputToggleBase %s] Toggle Event (System-Triggered) Received", outputName);
         if (app.outputPersist.startExecuteWithLock(outputName)) {
            executeFunction(event).then((executeData) => {
               app.outputPersist.endExecuteWithLock(outputName).then(() => {
                  executeData.callback({
                     hasError: false
                  });
               })
            });
         } else {
            event.callback({
               hasError: true,
               error: "ERR_OUTPUT_HAS_LOCK"
            });
         }
      }
   });
}
module.exports = OutputToggleBase