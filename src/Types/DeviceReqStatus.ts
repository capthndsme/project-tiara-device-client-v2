export type DeviceReqStatus<T> = {
   success: boolean, 
   data?: T // If success is false, data is undefined.  
   
}