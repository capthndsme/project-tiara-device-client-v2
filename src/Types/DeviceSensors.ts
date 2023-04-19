export type DeviceSensors = {
   Thermometers: ThermometerRegions | null;
}

export type ThermometerRegions = {
   Inside: Thermometer | null,
   Outside: Thermometer | null
}
 
export type Thermometer = {
   Temperature: number,
   Humidity: number
}