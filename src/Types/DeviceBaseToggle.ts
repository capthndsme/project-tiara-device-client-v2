export interface DeviceBaseToggle {
   toggleName: string,
   toggleDescription: string,
   toggleValue: boolean,
   lastChanged: number | undefined, // Null means the toggle has never been changed.
   hasLock: boolean | undefined, // Null means the toggle has never been changed.
}

export function createToggleTemplate(toggleName: string, toggleDescription: string): DeviceBaseToggle {
   return {
      toggleName: toggleName,
      toggleDescription: toggleDescription,
      toggleValue: false,
      lastChanged: undefined,
      hasLock: undefined,
   }
}