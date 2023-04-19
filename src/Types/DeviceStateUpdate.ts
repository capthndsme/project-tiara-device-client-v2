import { Device } from "./Device";
import { DeviceBaseToggle } from "./DeviceBaseToggle";
import { DeviceSensors } from "./DeviceSensors";

export interface DeviceStateUpdate { 
   deviceLastUpdate: number, // Unix timestamp.
   deviceIsOnline: boolean,
   deviceToggles: Array<DeviceBaseToggle> | Array<null>, // A null array means, for some reason, the device has no toggles.
   deviceSensors?: DeviceSensors
} 



export const DefaultDeviceStateUpdate: DeviceStateUpdate = {
   deviceLastUpdate: 0,
   deviceIsOnline: false,
   deviceToggles: []
}
