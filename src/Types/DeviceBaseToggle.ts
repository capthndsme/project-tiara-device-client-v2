export enum ToggleType {
   SWITCH = "SWITCH", // Simple on/off toggle.
   ONEOFF = "ONEOFF", // One-off toggle. (Toggles back to off after it finishes executing, like cleaning).
}

export interface DeviceBaseToggle {
   toggleName: string,
   toggleDescription?: string,
   toggleType: ToggleType,
   toggleValue: boolean,
   lastChanged?: number | undefined, // Null means the toggle has never been changed.
   hasLock?: boolean | undefined, // Null means the toggle has never been changed.
}

export function createToggleTemplate(toggleName: string, toggleDescription: string, toggleType: ToggleType): DeviceBaseToggle {
   return {
      toggleName: toggleName,
      toggleDescription: toggleDescription,
      toggleValue: false,
      lastChanged: undefined,
      hasLock: undefined,
      toggleType: toggleType
   }
}