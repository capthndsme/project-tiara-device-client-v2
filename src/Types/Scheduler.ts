export interface ScheduledTask {
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
	every: null,
	tempRange: null,
	timeRange: {
		from: {
			time: null,
			lastExecuted: 0,
		},
		to: {
			time: null,
			lastExecuted: 0,
		},
	},
}