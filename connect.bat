REM A simple batch file to connect to our raspberry pi.
REM This should be safe to commit to the repo, as it does not contain any sensitive information.
REM Make sure to configure this depending on your need.

REM Our setup consists of mounting the Raspberry Pi as a network drive, and then running this batch file.
REM and opening the network drive in VSCode. This allows us to edit the files on the Raspberry Pi directly.
REM and avoids overhead of VSCode's remote development extension. 

REM To start developing, simply run this batch file, and open the network drive in VSCode.
REM and run "npm start" to run TypeScript Compiler and run the dist/PTClient.js file.
REM If you have a strong SBC to run this on, then use "npm run dev" to run ts-node-dev instead.

@echo off
echo Make sure you are connected to the LightNode-Manila WireGuard VPN. 
ssh -t captainhandsome@10.54.86.4 "cd ~/project-tiara-device-client-v2 && exec bash -l"