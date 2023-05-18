import { DeviceBaseToggle } from "./DeviceBaseToggle";
import { ToggleResult } from "./ToggleResult";


export interface ToggleEvent<T = undefined> extends DeviceBaseToggle {
   callback: (result: ToggleResult) => void;
   optionalOpts?: T;
}