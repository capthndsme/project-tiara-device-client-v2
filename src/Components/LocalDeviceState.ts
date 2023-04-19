import { localData } from "../PersistedOutput"
import { DeviceStateUpdate } from "../Types/DeviceStateUpdate"
import { sensorBase } from "./SensorBase"




export let localDeviceState: DeviceStateUpdate = {
  
   deviceLastUpdate: 0, // Server side one, but we are reusing this to determine last server message.
   deviceIsOnline: false, // Server side one, but we are reusing this to determine if the socket is connected.
   deviceToggles: localData,
   deviceSensors: sensorBase
}