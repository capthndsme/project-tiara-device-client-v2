import { addOutput } from "./ScheduledTask/Scheduler";
import { SharedEventBus } from "./Components/SharedEventBus";
import { createOutput, findToggle, releaseOutput, toggleOutput, tryLockOutput } from "./PersistedOutput";
import { ToggleEvent } from "./Types/ToggleEvent";
import { ToggleType } from "./Types/DeviceBaseToggle";
export function OutputToggleBase(outputName: string, outputDescription: string = "", toggleType: ToggleType, executeFunction: Function) {
	console.log(`[OutputToggleBase] Creating ToggleBase for ${outputName}`);

	createOutput(outputName, outputDescription, toggleType);
	addOutput(outputName);
	// ToggleEvent is emitted by our WebSocketClient when a user clicks a button.
	// ToggleEventSystemTriggered is emitted by our Scheduler when a scheduled task is triggered.
	// We dont want to allow multiple executions of the same output at the same time, so we use a lock.
	// Also, we use or SharedEventBus here becase listening on socket.io events
	SharedEventBus.on("ToggleEvent", (event: ToggleEvent) => {
		if (event.toggleName == outputName) {
			console.log("Toggle event");
			console.log(event);
			if (tryLockOutput(outputName)) {
				executeFunction(event).then((executeResult) => {
					console.log("Execute function ended");
					releaseOutput(outputName);
					//TODO: When we have a non-toggle output types (Like dispense), we need to change this.
					// Although it's not a big deal, since the toggle value is only used for the UI.
					toggleOutput(outputName, event.toggleValue);
					if (event.callback) {
						event.callback({
							hasError: false,
						});
					}
				});
			} else {
				if (event.callback) {
					event.callback({
						hasError: true,
						error: "ERR_OUTPUT_HAS_LOCK",
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
				SharedEventBus.emit("SystemTriggeredStart"); // signal our websocket client that a system-triggered event has started, so locks can be updated on the client.
				executeFunction(event).then((executeResult) => {
					console.log("Execute function ended");
					releaseOutput(outputName);
					// Looks like we forgot to mutate our local persisted state, so lets do that now.

					//TODO: When we have a non-toggle output types (Like dispense), we need to change this.
					// Although it's not a big deal, since the toggle value is only used for the UI.
					toggleOutput(outputName, event.toggleValue);
					if (event.callback) {
						event.callback({
							hasError: false,
						});
					}
				});
			} else {
				event.callback({
					hasError: true,
					error: "ERR_OUTPUT_HAS_LOCK",
				});
			}
		}
	});
}
