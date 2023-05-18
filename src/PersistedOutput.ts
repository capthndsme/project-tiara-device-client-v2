import fs from "node:fs";
import { DeviceBaseToggle, ToggleType, createToggleTemplate } from "./Types/DeviceBaseToggle";
const PersistedFile = "/home/captainhandsome/project-tiara-persistent/PersistedOutputs.json";
export let localData: DeviceBaseToggle[] = [];

// Load our existing data from file if it exists
if (fs.existsSync(PersistedFile)) {
   try {
      const loadData = fs.readFileSync(PersistedFile, "utf8");
      localData = JSON.parse(loadData) as Array<DeviceBaseToggle>;
      console.log("Persists loaded", localData)
      for (const key in localData) {
         if (localData[key].hasLock) {
         console.warn(`Output ${key} has lock. Unclean shutdown? Unlocking`);
         localData[key].hasLock = false;
         }
         if (localData[key].toggleValue) {
            console.log("Turning off.", localData[key].toggleName);
            localData[key].toggleValue = false;
         }
      }
   } catch (e) {
      console.warn("Invalid OutputPersists, re-creating.", e);
   }
}

export function findToggle(toggleName: string): DeviceBaseToggle | undefined {
 
   return localData.find(toggle => toggle.toggleName === toggleName);
}


export function saveDataSync(): void {
   fs.writeFileSync(PersistedFile, JSON.stringify(localData));
}

export function createOutput(toggleName: string, toggleDescription: string, toggleType: ToggleType): void {
   if (findToggle(toggleName)) {
      console.log(`Output ${toggleName} already registered.`);
      return;
   }
   console.log(`Registering output ${toggleName}: ${toggleDescription}`);
   let toggle = createToggleTemplate(toggleName, toggleDescription, toggleType);
   localData.push(toggle);
   saveDataSync();
}

export function tryLockOutput(toggleName: string): boolean {
   const toggle = findToggle(toggleName);
   if (toggle && !toggle.hasLock) {
      console.trace("LOCK TOGGLE TRACE: ", toggleName)
      toggle.hasLock = true;
      toggle.lastChanged = Date.now();
 
     
      return true;
   } else {
      console.log("Failed to lock", toggleName);
      console.log("It may be in use");
      console.log("VARS", toggle, toggleName, localData)
      return false;
   }

}

export function releaseOutput(toggleName: string): void {
   console.trace("RELEASE TOGGLE TRACE: ", toggleName)
   const toggle = findToggle(toggleName);
   if (toggle) {
      toggle.hasLock = false;
   }
   saveDataSync();
 
}

export function getPersistedOutputs(): DeviceBaseToggle[] {
   return localData;
}
 
export function toggleOutput(toggleName: string, toggleValue: boolean): void {
   const toggle = findToggle(toggleName);
   if (toggle) {
      toggle.toggleValue = toggleValue;
   }
 
}


export function getToggleTypeFromOutputName(toggleName: string): ToggleType | undefined {
   const toggle = findToggle(toggleName);
   if (toggle) {
      return toggle.toggleType;
   }
 
}