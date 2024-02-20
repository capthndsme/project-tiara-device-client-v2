import fs from "node:fs";
type Config = {
      "syncUrl": string,
      "serverDeviceId": number,
      "deviceToken": string,
      "servoController": string
}

// Load the config file
export const config: Config = JSON.parse(fs.readFileSync("C:\\Users\\nieoy\\Projects\\project-tiara-persistent\\config.json", "utf8")); 
