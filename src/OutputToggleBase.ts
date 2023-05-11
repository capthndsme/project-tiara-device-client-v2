 
import { SharedEventBus } from "./Components/SharedEventBus";
import { createOutput, findToggle, releaseOutput, toggleOutput, tryLockOutput } from "./PersistedOutput";
import { ToggleEvent } from "./Types/ToggleEvent";
import { ToggleType } from "./Types/DeviceBaseToggle";
import { ToggleResult } from "./Types/ToggleResult";
 
 
export function OutputToggleBase(outputName: string, outputDescription: string = "", toggleType: ToggleType, executeFunction: (event: ToggleEvent) => Promise<ToggleResult>) {
	console.log(`[OutputToggleBase] Creating ToggleBase for ${outputName}`);

	createOutput(outputName, outputDescription, toggleType);
	 
	// ToggleEvent is emitted by our WebSocketClient when a user clicks a button.
	// ToggleEventSystemTriggered is emitted by our Scheduler when a scheduled task is triggered.
	// We dont want to allow multiple executions of the same output at the same time, so we use a lock.
	// Also, we use or SharedEventBus here becase listening on socket.io events
	SharedEventBus.on("ToggleEvent", (event: ToggleEvent) => {
		if (event.toggleName == outputName) {
			console.log("Toggle event");
			console.log(event);
 
			if (tryLockOutput(outputName)) {
				const executeTimeout = setTimeout(() => {
					console.warn("Timeout got stuck! Releasing lock forcefully.", outputName);
					releaseOutput(outputName);
					// A 70-second timeout is a bit excessive, but it's better than nothing.
				}, 70000)
				executeFunction(event).then((executeResult: ToggleResult) => {
					console.log("Execute function ended");
					clearTimeout(executeTimeout)
					releaseOutput(outputName);
					//TODO: When we have a non-toggle output types (Like dispense), we need to change this.
					// Although it's not a big deal, since the toggle value is only used for the UI.
					toggleOutput(outputName, event.toggleValue);
					if (event.callback) {
						// Passthrough the callback from the client.
						event.callback(executeResult);
					}
				});
			} else {
				if (event.callback) {
					
					event.callback({
						success: false,
						message: "Someone else is toggling this output.",
					});
				}
			}
		}
	});

	// ToggleEventSystemTriggered is emitted by our Scheduler when a scheduled task is triggered.

	SharedEventBus.on("ToggleEventSystemTriggered", (event: ToggleEvent) => {
		if (event.toggleName == outputName) {
			console.log("[OutputToggleBase %s] Toggle Event (System-Triggered) Received", outputName);
	 
			if (tryLockOutput(outputName)) {
				const executeTimeout = setTimeout(() => {
					console.warn("Timeout got stuck! Releasing lock forcefully.", outputName);
					releaseOutput(outputName);
					 
					// A 70-second timeout is a bit excessive, but it's better than nothing.
				}, 70000)
				executeFunction(event).then((executeResult: ToggleResult) => {
					console.log("Execute function ended");
					clearTimeout(executeTimeout)
					releaseOutput(outputName);
					//TODO: When we have a non-toggle output types (Like dispense), we need to change this.
					// Although it's not a big deal, since the toggle value is only used for the UI.
					toggleOutput(outputName, event.toggleValue);
					if (event.callback) {
						// Passthrough the callback from the client.
						event.callback(executeResult);
					}
				});
			} else {
				if (event.callback) {
					
					event.callback({
						success: false,
						message: "Someone else is toggling this output.",
					});
				}
			}
		}
	});
}
