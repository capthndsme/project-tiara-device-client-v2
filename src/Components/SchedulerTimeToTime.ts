import { SchedulerTime } from "../Types/Scheduler";

export function SchedulerTimeToTime(time: [number, number] | null) {
      if (time!==null && time[0]===null && time[1]===null) {
         return "";
      } else {
      return String(time?.[0]).padStart(2, "0") + ":" + String(time?.[1]).padStart(2, "0") ;
      }
     
}