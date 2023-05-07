import { config } from "../Components/ConfLoader";
import { HWID_STRING } from "../Components/HWIDLoader";
import { SharedEventBus } from "../Components/SharedEventBus";
import { StreamEvent } from "../Types/StreamEvent";
import { getSocket } from "../WebSockets/WSClient";

const { spawn } = require('node:child_process');

/*
    StreamController module 
    This module should run ffmpeg to stream our raspberry pi camera to our backend
    server, when it receives a "CameraStreamRequest" command over WebSockets.
    It must continuously receive this command every 60 seconds, because if it doesn't, 
    the stream will terminate, to save bandwidth.

    On the frontend side, the app should keep sending "CameraStreamRequest" to the backend
    every 30 or more seconds, to ensure dropped requests are accounted for
*/

    // -1 means no stream is running
    // TODO: Make this work with typescript.
    let currentTimeout: any = -1 ;
    let streamprocess = null;
    
    console.log("[StreamController] Start listening to CameraStreamRequest command")
    function resetStreamer() {
        if (streamprocess) streamprocess.kill("SIGKILL")
        streamprocess = null;
        
        clearTimeout(currentTimeout);
 
    }
    SharedEventBus.on("CameraStreamRequest", (data: StreamEvent) => {
        if (currentTimeout === -1) {
            console.log(data);
            console.log(`[StreamController] Stream is not running, start stream for STREAM_HASH: ${data.streamKey}`);
            // We could probably rewrite this to remove the need for a bash script.
            // but for now this works.
            streamprocess = spawn("bash", ["/home/captainhandsome/project-tiara-device-client-v2/Stream.sh", data.streamKey, HWID_STRING, config.deviceToken] );
            streamprocess.on("spawn", () => {
                console.log("FFMpeg spawned");
                currentTimeout = setTimeout(resetStreamer, 70000);
                data.callback({success: true})
            })
            // Debug 
            /*
            streamprocess.stdout.on("data", (data) => {
                console.log(data.toString());
            });
            streamprocess.stderr.on("data", (data) => {
                console.log(data.toString());
            });
            */
            streamprocess.on("close", (code) => {
                console.log("FFMpeg exited with code", code)
                streamprocess = null;
                clearTimeout(currentTimeout);
                currentTimeout = -1;
                getSocket().emit("DeadStreamEvent");
            });
            
        } else {
            data.callback({success: true})
            clearTimeout(currentTimeout);
            currentTimeout = setTimeout(resetStreamer, 70000);
        }
        
    });
