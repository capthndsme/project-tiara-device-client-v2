export interface GenericEventWithCallback<EventResult>  {
  callback: (result: EventResult) => void
   
}