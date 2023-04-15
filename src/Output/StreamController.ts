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

module.exports = function(app) {
    let currentTimeout = -1;
    let streamprocess = null;
    
    console.log("[StreamController] Start listening to CameraStreamRequest command")
    function resetStreamer() {
        if (streamprocess) streamprocess.kill("SIGKILL")
        streamprocess = null;
        clearTimeout(currentTimeout);
        currentTimeout = -1;
    }
    app.eventBus.on("CameraStreamRequest", (data) => {
        if (currentTimeout === -1) {
            console.log(data);
            console.log(`[StreamController] Stream is not running, start stream for STREAM_HASH: ${data.data}`);
            streamprocess = spawn("bash", ["./Stream.sh", data.data, app.HWID_STRING, app.deviceToken] );
            streamprocess.on("spawn", () => {
                app.eventBus.emit("AcknowledgeBackendAction", null, data.evHash);
                currentTimeout = setTimeout(resetStreamer, 70000);
            })
            streamprocess.stdout.on("data", (data) => {
                console.log(data.toString());
            });
            streamprocess.stderr.on("data", (data) => {
                console.log(data.toString());
            });
            streamprocess.on("close", (code) => {
                console.log("FFMpeg exited with code", code)
                streamprocess = null;
                clearTimeout(currentTimeout);
                currentTimeout = -1;
            });
            
        } else {
            app.eventBus.emit("AcknowledgeBackendAction", null, data.evHash);
            clearTimeout(currentTimeout);
            currentTimeout = setTimeout(resetStreamer, 70000);
        }
        
    });
}