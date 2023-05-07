import { DeviceBaseToggle } from "./DeviceBaseToggle";
import { ToggleResult } from "./ToggleResult";


export interface ToggleEvent extends DeviceBaseToggle {
   callback: (result: ToggleResult) => void;
 
}