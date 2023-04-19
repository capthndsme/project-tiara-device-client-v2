import { DeviceBaseToggle } from "./DeviceBaseToggle";

export interface ToggleResult {
   hasError?: boolean,
   error?: string,
}
export interface ToggleEvent extends DeviceBaseToggle {
   callback: (result: ToggleResult) => void;
}