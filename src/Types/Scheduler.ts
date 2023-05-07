export interface ScheduledTask {
	outputName: string;
	every: SchedulerTime[] | null;
	tempRange: [number, number] | null;
	timeRange: {
		from: SchedulerTime;
		to: SchedulerTime;
	} | null; // null means no time range
}

export interface SchedulerTime {
   time: [number, number] | null;
	lastExecuted: number;
}

export interface SchedulerRange {
	from: SchedulerTime;
	to: SchedulerTime;
}
export interface TempTriggerArray {
	scheduledTaskName: string;
	triggerOffTemp: number;
	triggerOnTemp: number;
}


export const ScheduledTaskBase = {
	outputName: "",
	every: null,
	tempRange: null,
	timeRange: null,
}