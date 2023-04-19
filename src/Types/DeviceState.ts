import { Device } from "./Device";
import { DeviceBaseToggle } from "./DeviceBaseToggle";
import { DeviceSensors } from "./DeviceSensors";

export interface DeviceState { 
   deviceDetails: Device,
   deviceLastUpdate: number, // Unix timestamp.
   deviceIsOnline: boolean,
   deviceToggles: Array<DeviceBaseToggle> | Array<null>, // A null array means, for some reason, the device has no toggles.
   deviceSensors?: DeviceSensors
} 



export const DefaultDeviceState: DeviceState = {
   deviceDetails: {
      DeviceDescription: "",
      DeviceHWID: "",
      DeviceID: 0,
      DeviceName: "",
      AccessType: "",
   },
   deviceLastUpdate: 0,
   deviceIsOnline: false,
   deviceToggles: []
}
