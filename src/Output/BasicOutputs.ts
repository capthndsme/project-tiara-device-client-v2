import { SimpleStateOutput } from "../SimpleStateOutput";
import { ToggleType } from "../Types/DeviceBaseToggle";


// Basic outputs are simple on-or-off outputs that are not tied to a sensor.
SimpleStateOutput(11, "ventOpen", "Exhaust Fan", ToggleType.SWITCH);
SimpleStateOutput(13, "lighting", "Interior Lights", ToggleType.SWITCH);
