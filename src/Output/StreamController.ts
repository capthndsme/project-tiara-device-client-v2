import axios from "axios";
import FormData from 'form-data';
import { config } from "../Components/ConfLoader";
import { HWID_STRING } from "../Components/HWIDLoader";
import { SharedEventBus } from "../Components/SharedEventBus";
import { StreamEvent } from "../Types/StreamEvent";
import { getSocket } from "../WebSockets/WSClient";
import fs from "node:fs";
import { spawn } from "child_process";
import { exec } from "node:child_process";

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

SharedEventBus.on("WSClientDisonnected", () => {
	console.log("[StreamController] WSClient disconnected, kill stream");
	resetStreamer();
})

function resetStreamer() {
	console.log("[StreamController] Stream keepalive not received, kill stream");
 
	if (streamprocess) {
		// A hack to kill the process and all its children
		exec("killall ffmpeg"); // Kill all ffmpeg processes
		process.kill(-streamprocess.pid, "SIGKILL")
		streamprocess.kill("SIGKILL");
		console.log("Killed stream process")
	}
	streamprocess = null;

	clearTimeout(currentTimeout);
	currentTimeout = -1; // Signifies no stream is running
}

// Register an exit handler to kill the stream process
// when the program exits.
process.on("exit", () => {
	console.log("[StreamController] Exit received, kill stream");
	if (streamprocess) {
		exec("killall ffmpeg"); // Kill all ffmpeg processes
		process.kill(-streamprocess.pid, "SIGKILL")
		streamprocess.kill("SIGKILL");

	}
	
});

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
		// Lock our timeout as early as possible
		// Clear if we have any existing timeouts
		clearTimeout(currentTimeout);
		currentTimeout = 5; // Any number other than -1
		// We could probably rewrite this to remove the need for a bash script.
		// but for now this works.
		streamprocess = spawn("/home/captainhandsome/project-tiara-device-client-v2/Stream.sh", [
			data.streamKey,
			HWID_STRING,
			config.deviceToken,
		],{
			detached: true 
		});
		streamprocess.on("error", (err) => {
			if (err.code === "EACCES") {
				console.log("Please chmod +x the Stream.sh file")
			}
		});
		streamprocess.on("spawn", () => {
			console.log("FFMpeg spawned");
			// just in case
			clearTimeout(currentTimeout);
			currentTimeout = setTimeout(resetStreamer, 70000);
			if (data.callback) data.callback({ success: true });
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
		console.log("Stream keepalive received, reset timeout")
		clearTimeout(currentTimeout);
		if (data.callback) data.callback({ success: true });
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
 
    if (currentTimeout === -1) {
        // Stream is not running, take a snapshot
        // This variable allows the stream request to go through by killing our screenshot process
        streamStartedDueToScreenshot = true;

        console.log("[StreamController] Stream is not running, take a snapshot");
			// Set high quality because the backend will process it
        const stream = spawn("libcamera-jpeg", ["--output", "/tmp/snapshot.jpg", "-q", "96"]);
        stream.on("exit", (code) => {
				console.log("Snapshot exit code", code)
            if (code !== 0) {
                return console.log("[StreamController] Failed to take snapshot");
            }
            // Send the image to the backend server
            const file = fs.createReadStream("/tmp/snapshot.jpg");
				if (!file) {
					console.log("[StreamController] Failed to read snapshot file")
					return setTimeout(SnapshotService, 30000);
				}
				const form = new FormData();
				form.append("file", file, {filename: "snapshot.jpg", contentType: "image/jpeg"});
				console.log(form);
            axios.post(config.syncUrl + "/v1/cameraPreviews/push", 
				form
				, {timeout: 45000, headers: {
					...form.getHeaders(),
					"x-device-hwid": HWID_STRING,
					"x-device-session": config.deviceToken,
            }}).then(() => {
				console.log("[StreamController] Snapshot success")
					// Our usual image sizes are around 1 MB
					// Because of this, let's send images every
					// 2 and a half minute to save bandwidth
					// and save backend storage space, which is a premium

               setTimeout(SnapshotService, 150000);
            }).catch(err=>{
                console.log("[StreamController] Failed to send snapshot to backend server", err);
                setTimeout(SnapshotService, 30000);
            }); 
        })
 
        
	} else {
		console.log("[StreamController] Stream is running, skip snapshot", currentTimeout)
		// Aggressively retry
		setTimeout(SnapshotService, 2000);

	}
}
console.log("[StreamController] Start snapshot service")
SnapshotService();
