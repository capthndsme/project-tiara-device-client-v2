import axios from "axios";
import { config } from "../Components/ConfLoader";
import { HWID_STRING } from "../Components/HWIDLoader";
import { SharedEventBus } from "../Components/SharedEventBus";
import { StreamEvent } from "../Types/StreamEvent";
import { getSocket } from "../WebSockets/WSClient";
import fs from "node:fs";
import { spawn } from "child_process";

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
let currentTimeout: any = -1;
let streamprocess = null;
let streamStartedDueToScreenshot = false;
console.log("[StreamController] Start listening to CameraStreamRequest command");
function resetStreamer() {
	if (streamprocess) streamprocess.kill("SIGKILL");
	streamprocess = null;

	clearTimeout(currentTimeout);
}
SharedEventBus.on("CameraStreamRequest", (data: StreamEvent) => {
	/* Debate whether we should kill the stream if it's running 
       or let it finish.
        if (streamprocess && streamStartedDueToScreenshot) {
		console.log("Stream process is running, kill it.");
		streamprocess.kill("SIGKILL");
	} */
	if (currentTimeout === -1) {
		console.log(data);
		console.log(`[StreamController] Stream is not running, start stream for STREAM_HASH: ${data.streamKey}`);
		// We could probably rewrite this to remove the need for a bash script.
		// but for now this works.
		streamprocess = spawn("bash", [
			"/home/captainhandsome/project-tiara-device-client-v2/Stream.sh",
			data.streamKey,
			HWID_STRING,
			config.deviceToken,
		]);
		streamprocess.on("spawn", () => {
			console.log("FFMpeg spawned");
			currentTimeout = setTimeout(resetStreamer, 70000);
			data.callback({ success: true });
		});
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
			console.log("FFMpeg exited with code", code);
			streamprocess = null;
			clearTimeout(currentTimeout);
			currentTimeout = -1;
			getSocket().emit("DeadStreamEvent");
		});
	} else {
		data.callback({ success: true });
		clearTimeout(currentTimeout);
		currentTimeout = setTimeout(resetStreamer, 70000);
	}
});

function SnapshotService() {
	// This function should run every 60 seconds
	// and take a jpg picture of the stream
	// and send it to the backend server.
	// This is so the backend server can display
	// a preview of the stream on the dashboard.

	// Additionally, images could be taken periodically
	// as some sort of "CCTV" feature.
	console.log("SnapshotService triggered")
    if (currentTimeout !== -1) {
        // Stream is not running, take a snapshot
        // This variable allows the stream request to go through by killing our screenshot process
        streamStartedDueToScreenshot = true;
        console.log("[StreamController] Stream is not running, take a snapshot");
        const COMMAND = "libcamera-jpeg --width 2048 --height 1536 --output /tmp/snapshot.jpg";
        const stream = spawn("bash", ["-c", COMMAND]);
        stream.on("exit", (code) => {
            if (code !== 0) {
                return console.log("[StreamController] Failed to take snapshot");
            }
            // Send the image to the backend server
            const file = fs.readFileSync("/tmp/snapshot.jpg");
            axios.post(config.syncUrl + "/v1/cameraPreviews/push", file, {timeout: 45000, headers: {
                "Content-Type": "image/jpeg",
            }}).then(() => {
				console.log("[StreamController] Snapshot success")
                setTimeout(SnapshotService, 60000);
            }).catch(err=>{
                console.log("[StreamController] Failed to send snapshot to backend server", err);
                setTimeout(SnapshotService, 30000);
            });
        })
 
        
	}  
}
console.log("[StreamController] Start snapshot service")
SnapshotService();
