import fs from "node:fs";
import { SharedEventBus as eventBus } from "../Components/SharedEventBus";
import { ScheduledTask, SchedulerTime, TempTriggerArray } from "../Types/Scheduler";
import { Thermometer } from "../Types/DeviceSensors";
import { createNotification } from "../Components/NotificationSender";
import { NotificationType } from "../Types/NotificationType";
import { getToggleTypeFromOutputName, findToggle } from "../PersistedOutput";
import { ToggleType } from "../Types/DeviceBaseToggle";
import { ToggleResult } from "../Types/ToggleResult";
import { SchedulerTimeToTime } from "../Components/SchedulerTimeToTime";
import { ToggleEvent } from "../Types/ToggleEvent";
let scheduler: Array<ScheduledTask> = [];

export function getScheduledTasks(): Array<ScheduledTask> {
	return scheduler;
}
/**
 * @todo: There is a bug where if the device is not in the same 
 * timezone as the user's browser, the scheduler will not work correctly.
 * Find a solution for this, but its a low priority issue. 
 * Could be worked around by having the client send in their timezone.
 */
function getSecondsUntilTargetTime(timeArr) {
	const now = new Date(); // get current date and time
	const targetTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), timeArr[0], timeArr[1]); // create a new date object with the target time today
	const secondsUntilTargetTime = (targetTime.getTime() - now.getTime()) / 1000; // calculate the number of seconds until the target time
	console.log("Time debug", secondsUntilTargetTime, now.toLocaleString(), targetTime.toLocaleString(), timeArr);
	if (secondsUntilTargetTime < 0) {
		// if the target time has already passed today
		return false; // return false
	}
	return secondsUntilTargetTime; // return the number of seconds until the target time
}

// timeoutArray and intervalArray is an array of all the timeouts that are currently running.
// We will use this to clear all pending tasks when the user changes the schedules.
let timeoutArray: Array<NodeJS.Timeout> = [];
let intervalArray: Array<NodeJS.Timer> = [];
let tempTriggerArrays: Array<TempTriggerArray> = [];
// Override array means the user has manually turned on/off the output.
// Applicable for "TempRange" and "TimeRange" triggers.
// Right now only TempRange is implemented, and realistiaclly it is the only one that needs to be implemented.
let overrideArray: Array<boolean> = [];
function checkOverride(scheduledTaskName: string) {
	 return overrideArray[scheduledTaskName];
} 

export function setOverride(scheduledTaskName: string, value: boolean) {
	overrideArray[scheduledTaskName] = value;
}

const format = {
	scheduledTaskName: {
		outputName: "",
		every: [
			{
				time: [10, 30],
				lastExecuted: -1,
			},
			{
				time: [17, 30],
				lastExecuted: -1, 
			},
		],
		tempRange: [28, 31],
		timeRange: {
			from: {
				time: [20, 0],
				lastExecuted: -1,
			},
			to: {
				time: [5, 0],
				lastExecuted: -1,
			},
		},
	},
};
// Copied from BingGPT. This is a function that will throttle the execution of a function.
//
function throttle(callback: { apply: (arg0: any, arg1: IArguments) => void }, interval: number) {
	// Initialize a timer variable
	let timer: NodeJS.Timer | null = null;
	// Return a function that will be called when the event occurs
	return function () {
		// If the timer is null, it means we can run the callback function
		if (timer === null) {
			// Run the callback function
			callback.apply(this, arguments);
			// Set the timer to wait for the interval before setting it back to null
			timer = setTimeout(function () {
				timer = null;
			}, interval);
		}
	};
}
function tempReceiver(data: Thermometer) {
	for (let i = 0; i < tempTriggerArrays.length; i++) {
		// Sanity Check first.
		// If the temp sensor is messed up (data.temperature) is below -50 or above 100, it means something is wrong within the sensor.
		// BESIDES, raspberry pi is not meant to be used in extreme temperatures.
		if (data.Temperature < -50 || data.Temperature > 100) {
			console.error("[Scheduler] Temperature sensor seems to be malfunctioning. Skipping temperature triggers.");
		} else {
			const trigger = tempTriggerArrays[i];
			// If current temperature is within the range, turn on the output.
			// If current tempearture is lower than the lower bound, turn off the output.
			// If current temperature is higher than the upper bound, the output should remain on.
			if (checkOverride(trigger.scheduledTaskName)) {
				// currentToggleState allows us to check if the output is already on or off, so we don't send duplicate commands.
				const localToggle = findToggle(trigger.scheduledTaskName);
				if (!localToggle) console.warn("Can not find toggle for some reason. Trigger object" + trigger)
				const currentToggleState = localToggle?.toggleValue || false; // If the toggle is not found, assume it is off.
				if (data.Temperature >= trigger.triggerOnTemp && data.Temperature <= trigger.triggerOnTemp && !currentToggleState ) {
					executeTemp(trigger.scheduledTaskName, trigger, "temp", true);
				} else if (data.Temperature < trigger.triggerOffTemp && !currentToggleState) {
					executeTemp(trigger.scheduledTaskName, trigger, "temp", false);
				} else if (data.Temperature > trigger.triggerOnTemp && !currentToggleState) {
					// The current temperature is higher than the upper bound, but the output should remain on.
					executeTemp(trigger.scheduledTaskName, trigger, "temp", true);
				}  
			} else {
				console.log("Skipping temp trigger because of override.");
			}
			
		}
	}
}
export function initScheduler() {
	console.log("[Scheduler] Starting scheduler...");
	if (fs.existsSync("/home/captainhandsome/project-tiara-persistent/scheduler.json")) {
		console.log("[Scheduler] Schedules loaded...");
		scheduler = JSON.parse(fs.readFileSync("/home/captainhandsome/project-tiara-persistent/scheduler.json", "utf8"));
	} else {
		// Schedules default layout
		// Temperature unit is in Celsius.
		// Time unit is in 24 hour format.
		// Time is in array format [hour, minute]
		// Does not account for Daylight Savings Time. (Researchers do not use DST, and therefore we do not know how to deal with it.)

		scheduler = [];

		fs.writeFileSync("/home/captainhandsome/project-tiara-persistent/scheduler.json", JSON.stringify(scheduler));
		console.log("[Scheduler] No schedules - generating default...");
	}

	eventBus.emit("scheduler.ready", null, scheduler);
	// Our tempearture sensor sends data every 2 seconds.
	// We should have a mechanism to reduce the rate to about every 3/4 of a minute.
	// This is to prevent the scheduler from being overwhelmed with data.
	// TODO: Implement a mechanism to reduce the rate of data.
	eventBus.on("sensors.temp.inside", throttle(tempReceiver, 45000));
	ParseSchedulesAndTriggers();
}

// utilities
function execute(key: string, eventHandle: SchedulerTime, triggerType: string, toggleValue: boolean) {
 
	console.log(`Executing ${key}'s ${triggerType}-type schedulable...`);
	/**
	 * TODO: A POST request to the server to update the toggle value, so the web server will also know our Local State.
	 *
	 */
	let callbackNoter;
	createNotification(
		key + " automation started",
		`Automation for "${key}" has started.`,
		NotificationType.AUTOMATION_STARTED,
		Date.now()
	)
	const emit: ToggleEvent = {
		toggleName: key,
		toggleValue: toggleValue,
		toggleType: ToggleType.ONEOFF, // We don't care about this when triggering.
		callback: (data: ToggleResult) => {
			// Update lastExecuted
			if (!data.success) {
				console.warn(`[Scheduler] Executed scheduled task ${key} but the callback returned an error: ${data.message}`);
				createNotification(
					key + " automation execution failure",
					`Automation for "${key}" failed with error: ${data.message}`,
					NotificationType.AUTOMATION_ERROR,
					Date.now()
				)
				return;
			} 
			createNotification(
				key + " automation finished" ,
				`Automation for "${key}" succeeded!`,
				NotificationType.AUTOMATION_FINISHED,
				Date.now()
			)
			eventHandle.lastExecuted = Date.now();
			
			fs.writeFileSync("/home/captainhandsome/project-tiara-persistent/scheduler.json", JSON.stringify(scheduler));
			clearTimeout(callbackNoter);
		},
	}
	eventBus.emit("ToggleEventSystemTriggered", null, emit);
	callbackNoter = setTimeout(() => {
		console.warn(`[Scheduler] Executed scheduled task ${key} but the callback was not called within 2 minutes.`);
		
	}, 120000);
}
function executeTemp(key: string, eventHandle: TempTriggerArray, triggerType: string, toggleValue: boolean) {
	console.log(`Executing ${key}'s ${triggerType}-type schedulable...`);
	/**
	 * TODO: A POST request to the server to update the toggle value, so the web server will also know our Local State.
	 *
	 */
	let callbackNoter;

	eventBus.emit("ToggleEventSystemTriggered", null, {
		toggleName: key,
		toggleValue: toggleValue,
		callback: (data) => {
			// Update lastExecuted
			if (data.hasError) {
				console.warn(`[Scheduler] Executed scheduled task ${key} but the callback returned an error: ${data.error}`);
			}

			fs.writeFileSync("/home/captainhandsome/project-tiara-persistent/scheduler.json", JSON.stringify(scheduler));
			clearTimeout(callbackNoter);
		},
	});
	callbackNoter = setTimeout(() => {
		console.warn(`[Scheduler] Executed scheduled task ${key} but the callback was not called within 2 minutes.`);
	}, 120000);
}

/*
   Thesis side notes (Scopes and Limitations) 
   What if the end user manually triggered the function before the target time?
   Well, the end user can manually trigger the function before the target time, 
   but when the target time is reached, the function will be executed again.
   There are two approaches to this problem:
   1: We can tell the frontend to actively warn if the end user manually triggers the function 30 minutes before
   the trigger time, similar warning when they manually trigger a function within 30 minutes of the past trigger time.

   2: Let them be. The function will be executed again when the target time is reached. This is the Unix way.

   3: A blend of both. We can tell the frontend to warn the end user if they manually trigger the function within 30 minutes of the past trigger time
   and let them either continue or cancel the manual trigger. If they continue, the function will be executed again when the target time is reached.
*/
function ParseSchedulesAndTriggers() {
	// Since this function is called every time the schedules are reloaded, or the system is started, we will clear all pending timeouts and intervals.
	timeoutArray = [];
	intervalArray = [];
	tempTriggerArrays = [];
	for (let i = 0; i < scheduler.length; i++) {
		const localScheduler: ScheduledTask = scheduler[i];
		if (localScheduler.every) {
			console.log("[Scheduler] Output %s has EVERY", localScheduler.outputName, localScheduler.every);
			let everyArray = localScheduler.every;

			for (let i = 0; i < everyArray.length; i++) {
				if (everyArray[i].time === null) {
					console.warn("[Scheduler] Output %s has an unset time. Skipping...", localScheduler.outputName);
				} else {
					/* 
               How do we determine that a Every-type of Schedulable has been executed?
          
               1: We will compute the seconds until the target time. If it is false, we know that the target time has already passed today
               2: If the target time has not passed today, we will set a timeout to execute the function at the target time, then we will set a daily setInterval to execute the function every day at the target time.
               3: If the target time has passed today, we will set a timeout to execute the function at the target time tomorrow, then we will set a daily setInterval to execute the function every day at the target time.
            */

					const secondsUntilTargetTime = getSecondsUntilTargetTime(everyArray[i].time);
					if (secondsUntilTargetTime) {
						// The target time has not passed yet today. We will set a timeout to execute the function at the target time.
						console.log(
							"[Scheduler] Target time is still good for today (%ss away). Scheduling execution for %s's every-type schedulable...",
							secondsUntilTargetTime,
							localScheduler.outputName
						);
						// Lets make a timeout to execute the function at the target time.
						const timeout = setTimeout(() => {
							// Two things in the timeout when the target time is reached.
							// 1: Execute the function.
							// 2: Set a daily setInterval to execute the function every day at the target time.
							execute(localScheduler.outputName, everyArray[i], "every", true);
							const interval = setInterval(() => {
								// Execute function
								// Note that in Every-triggers, toggleValue is always true.
								console.log("[Scheduler] Executing %s's every-type schedulable...", localScheduler.outputName);
								execute(localScheduler.outputName, everyArray[i], "every", true);
							}, 86400 * 1000);
							intervalArray.push(interval);
						}, secondsUntilTargetTime * 1000);
						timeoutArray.push(timeout);
					} else {
						// The target time has already passed today. We will set a timeout to execute the function at the target time tomorrow.
						// Additionally, TODO, we will send a message to the server to let the user know that the function is not executed today.
						const now = new Date();
						const tomorrowTimeout =
							new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, everyArray[i][0], everyArray[i][1]).getTime() -
							now.getTime();
						console.log("Target time has already passed today. Scheduling execution for tomorrow...");
						createNotification(
							localScheduler.outputName + " automation skipped",
							`Automation for "${localScheduler.outputName}" every skipped because the target time (${SchedulerTimeToTime(everyArray[i].time)}) has already passed today. It will be executed tomorrow, or you may manually execute it now.`,
							NotificationType.AUTOMATION_ERROR,
							Date.now()
						)
						const timeout = setTimeout(() => {
							// Once we got our timeout executed for tomorrow, we will now set
							// a daily setInterval to execute the function every day at the target time.
							const interval = setInterval(() => {
								// Execute function
								// Note that in Every-triggers, toggleValue is always true.
								execute(localScheduler.outputName, everyArray[i], "every", true);
							}, 86400 * 1000);
							intervalArray.push(interval);
						}, tomorrowTimeout);
						timeoutArray.push(timeout);
					}
				}
			}
		}
		const tempRange = localScheduler.tempRange;
		if (tempRange && tempRange !== null) {
			console.log(
				"Output %s has TEMPRANGE. Trigger off temp: %s. Trigger on temp: %s",
				localScheduler.outputName,
				tempRange[0],
				tempRange[1]
			);
			// TempRange Trigger is simple. We just need to check if the current temperature is within the range.
			tempTriggerArrays.push({
				scheduledTaskName: localScheduler.outputName,
				triggerOffTemp: tempRange[0],
				triggerOnTemp: tempRange[1],
			});
		}
		const timeRange = localScheduler.timeRange;
		if (timeRange) {
			console.log("Output %s has TIMERANGE", localScheduler.outputName);
			
			const from = timeRange.from.time;
			const to = timeRange.to.time;
			console.log("times:", from, to)
			if (from && to) {
				// TimeRange trigger is a bit more and less complicated than Every trigger, somehow.

				// 1: Determine seconds until trigger start | end
				const secondsUntilTriggerStart = getSecondsUntilTargetTime(timeRange.from.time);
				const secondsUntilTriggerEnd = getSecondsUntilTargetTime(timeRange.to.time);

				// 2: Check if the trigger start time has passed today.
				// If it has passed, let's check if the trigger end is also passed today.
				// If the trigger end is passed today, it means that we should not execute the function today.
				// If the trigger end is not passed today, it means that we are still within the trigger time range.
				// It means that we should turn on the output.
				// If the trigger start has not passed today, it means that we are still outside the trigger time range.
				// It means that we should schedule a timeout to execute the function at the trigger start time.
				if (secondsUntilTriggerStart && secondsUntilTriggerEnd) {
					// Trigger start has not passed today. We will set a timeout to execute the function at the trigger start time.
					console.log(
						"[Scheduler] Trigger start time has not passed today. Scheduling execution for %s's timeRange-type schedulable...",
						localScheduler.outputName
					);
					const timeout = setTimeout(() => {
						// Once we got our timeout executed for later, we will now set
						// a daily setInterval to execute the function every day at the target time.
						execute(localScheduler.outputName, timeRange.from, "timeRange", true);
						const interval = setInterval(() => {
							// Execute function.
							// Note that in triggerStart timeRange type schedulable, toggleValue is always true.
							execute(localScheduler.outputName, timeRange.from, "timeRange", true);
						}, 86400 * 1000);
						intervalArray.push(interval);
					}, secondsUntilTriggerStart * 1000);
					timeoutArray.push(timeout);
					const endTimeTimeout = setTimeout(() => {
						// Create a timeout to execute the function at the trigger end time.
						// This timeout will be used to turn off the output.
						const endTimeInterval = setInterval(() => {
							// Execute function.
							// Note that in triggerEnd timeRange type schedulable, toggleValue is always false.
							execute(localScheduler.outputName, timeRange.to, "timeRange", false);
						}, 86400 * 1000);
						intervalArray.push(endTimeInterval);
					}, secondsUntilTriggerEnd * 1000);
					timeoutArray.push(endTimeTimeout);
				} else {
					// Trigger start has passed today. We will check if the trigger end has passed today
					if (secondsUntilTriggerEnd) {
						// Trigger end has not passed today.
						// It means that we are still within the trigger time range.
						// It means that we should turn on the output.
						execute(localScheduler.outputName, timeRange.from, "timeRange", true);

						// Here we schedule a triggerEnd timeout and interval because we are still within the trigger time range..
						const endTimeTimeout = setTimeout(() => {
							// Create a timeout to execute the function at the trigger end time.
							// This timeout will be used to turn off the output.
							execute(localScheduler.outputName, timeRange.to, "timeRange", false);
							const endTimeInterval = setInterval(() => {
								// Execute function.
								// Note that in triggerEnd timeRange type schedulable, toggleValue is always false.
								execute(localScheduler.outputName, timeRange.to, "timeRange", false);
							}, 86400 * 1000);
							intervalArray.push(endTimeInterval);
						}, secondsUntilTriggerEnd * 1000);
						timeoutArray.push(endTimeTimeout);
					} else {
						// Trigger end has passed today.
						// It means we are past the trigger time range.
						// Schedule both start and end timeouts and intervals for tomorrow.
						const now = new Date();
						const tomorrowFrom =
							new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, from[0], from[1]).getTime() - now.getTime();
						const tomorrowTo = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, to[0], to[1]).getTime() - now.getTime();
						console.log(
							"[Scheduler] Time-range target time has already passed today. Scheduling %s's execution for tomorrow...",
							localScheduler.outputName
						);
						createNotification(
							localScheduler.outputName + " Automation skipped",
							`Automation for "${localScheduler.outputName}" Time-Range skipped because the target time (${SchedulerTimeToTime(timeRange?.from.time)} - ${SchedulerTimeToTime(timeRange?.to.time)}) has already passed today. It will be executed tomorrow, or you may manually execute it now.`,
							NotificationType.AUTOMATION_ERROR,
							Date.now()
						)
						const fromTimeout = setTimeout(() => {
							// Once we got our timeout executed for tomorrow, we will now set
							// a daily setInterval to execute the function every day at the target time.
							execute(localScheduler.outputName, timeRange.from, "timeRange", true);
							const interval = setInterval(() => {
								// Execute function.
								// Note that in triggerStart timeRange type schedulable, toggleValue is always true.
								execute(localScheduler.outputName, timeRange.from, "timeRange", true);
							}, 86400 * 1000);
							intervalArray.push(interval);
						}, tomorrowFrom);
						timeoutArray.push(fromTimeout);
						const toTimeout = setTimeout(() => {
							// Once we got our timeout executed for tomorrow, we will now set
							// a daily setInterval to execute the function every day at the target time.
							execute(localScheduler.outputName, timeRange.to, "timeRange", false);
							const interval = setInterval(() => {
								// Execute function.
								// Note that in triggerEnd timeRange type schedulable, toggleValue is always false.
								execute(localScheduler.outputName, timeRange.to, "timeRange", false);
							}, 86400 * 1000);
							intervalArray.push(interval);
						}, tomorrowTo);

						timeoutArray.push(toTimeout);
					}
				}
			} else {
				console.log("Output %s has TIMERANGE but no from or to", localScheduler.outputName);
			}
		}
	}
}
export function reloadSchedules() {
	// Clear all pending timeouts and intervals
	for (let i = 0; i < timeoutArray.length; i++) {
		clearTimeout(timeoutArray[i]);
	}
	for (let i = 0; i < intervalArray.length; i++) {
		clearInterval(intervalArray[i]);
	}
	// Reload schedules

	scheduler = JSON.parse(fs.readFileSync("/home/captainhandsome/project-tiara-persistent/scheduler.json", "utf-8"));

	ParseSchedulesAndTriggers();
}

export function applyNewSchedules(schedules: Array<ScheduledTask>) {
	// Clear all pending timeouts and intervals
	for (let i = 0; i < timeoutArray.length; i++) {
		clearTimeout(timeoutArray[i]);
	}
	for (let i = 0; i < intervalArray.length; i++) {
		clearInterval(intervalArray[i]);
	}
	// Apply new schedules, and save our received schedules to the file
	scheduler = schedules;
	fs.writeFileSync("/home/captainhandsome/project-tiara-persistent/scheduler.json", JSON.stringify(scheduler));
	ParseSchedulesAndTriggers();
}

export function insertScheduledTask(scheduledTask: ScheduledTask): boolean {
	// Insert a new scheduled task to our scheduler.
	// This will also save the new schedule to the file.
	// Clear all pending timeouts and intervals

	// Duplicate checking
	let hasAnyDuplicate = false;
	for (let i = 0; i < scheduler.length; i++) {
		if (scheduler[i].outputName === scheduledTask.outputName) {
			console.log("[Scheduler] Output already registered. Replacing existing schedule...");
			scheduler[i] = scheduledTask;
			hasAnyDuplicate = true;
		}
	}

	// Data cleanup in accordance to selected toggles toggletype.
	const type = getToggleTypeFromOutputName(scheduledTask.outputName);
	if (type) {
		console.log("Running data cleanup for %s", scheduledTask.outputName);

		if (type === ToggleType.ONEOFF) {
			if (scheduledTask.timeRange) {
				console.log("Removing timeRange from %s", scheduledTask.outputName);
				scheduledTask.timeRange = null;
			}
			if (scheduledTask.tempRange) {
				console.log("Removing tempRange from %s", scheduledTask.outputName);
				scheduledTask.tempRange = null;
			}
		} else if (type === ToggleType.SWITCH) {
			if (scheduledTask.every) {
				console.log("Removing every from %s", scheduledTask.outputName);
				scheduledTask.every = null;
			}
		}
	} else {
		console.log("No toggle type found for %s", scheduledTask.outputName);
	}
	for (let i = 0; i < timeoutArray.length; i++) {
		clearTimeout(timeoutArray[i]);
	}
	for (let i = 0; i < intervalArray.length; i++) {
		clearInterval(intervalArray[i]);
	}
	// Prevent duplicate schedules
	if (!hasAnyDuplicate) scheduler.push(scheduledTask);
	fs.writeFileSync("/home/captainhandsome/project-tiara-persistent/scheduler.json", JSON.stringify(scheduler));
	ParseSchedulesAndTriggers();
	return true;
}
 
/**
* @deprecated We dont need to register outputs anymore. The user should manually add any trigger to the scheduler.
*/
export function addOutput(outputName) {
	console.trace("DEPRECATED CALL: addOutput", outputName)
	// Creates an output.
	// We will also register this to our DeviceState.
/* 
	for (let i = 0; i < scheduler.length; i++) {
		if (scheduler[i].outputName === outputName) {
			console.log("[Scheduler] Output %s already registered.", outputName);
			return;
		}
	}

	console.log("[Scheduler] Created empty schedule for %s.", outputName);
	// Create an empty schedule for the output.
	// This is to prevent the scheduler from crashing when the user tries to add a schedule for an output that does not exist.
	// Also: 0, 0 is a valid time, so we can't use that as a placeholder.

	scheduler.push({
		...ScheduledTaskBase,
		outputName: outputName
	});

	// Clear all pending timeouts and intervals
	for (let i = 0; i < timeoutArray.length; i++) {
		clearTimeout(timeoutArray[i]);
	}
	for (let i = 0; i < intervalArray.length; i++) {
		clearInterval(intervalArray[i]);
	}

	fs.writeFileSync("/home/captainhandsome/project-tiara-persistent/scheduler.json", JSON.stringify(scheduler));
	ParseSchedulesAndTriggers(); */
}
