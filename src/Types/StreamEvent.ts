import { GenericEventWithCallback } from "./GenericEventWithCallback";
import { GenericCallbackResult } from "./GenericCallbackResult";


export interface StreamEvent extends GenericEventWithCallback<GenericCallbackResult> { 
   streamHash: string,
}