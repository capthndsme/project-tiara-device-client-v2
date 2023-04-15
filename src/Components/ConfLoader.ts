import fs from "node:fs";
type Config = {
      "syncUrl": string,
      "serverDeviceId": number,
      "deviceToken": string
}

// Load the config file
export const config: Config = JSON.parse(fs.readFileSync("/home/captainhandsome/project-tiara-persistent/config.json", "utf8")); 
