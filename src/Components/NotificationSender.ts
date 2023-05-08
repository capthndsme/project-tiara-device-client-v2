import fs from "node:fs";
import { NotificationType } from "../Types/NotificationType";
import { NotificationEntity } from "../Types/NotificationEntity";
import { getSocket } from "../WebSockets/WSClient";
// Create a local persist file if it doesn't exist
const fileLocation = "/home/captainhandsome/project-tiara-persistent/OutstandingNotifications.json";

let notificationQueue: NotificationQueue[] = [];

// Load the file if it exists
if (fs.existsSync(fileLocation)) {
   try {
      notificationQueue = JSON.parse(fs.readFileSync(fileLocation, "utf8")) as NotificationQueue[];
   } catch(e) {
      console.log("[NotificationSender] Error loading notification queue:", e);
      console.log("[NotificationSender] Discarding notification queue and starting fresh.");
   }
	
}

type NotificationQueue = {
	notification: NotificationEntity;
	sent: boolean;
	sentTimestamp: number;
};

/**
 * Notification Sender System
 * It is semi-guaranteed that the notification will be sent, as it will be retried every 10 seconds
 * and it is saved to a local file.
 *
 * @param title Notification Title
 * @param message Notification Message Content
 * @param type Notification Type (see {@link NotificationType})
 */
export function createNotification(title: string, message: string, type: NotificationType, date?: number): void {
	const notification: NotificationEntity = {
		title,
		message,
		sentTimestamp: date ?? Date.now(),
		type,
	};
	notificationQueue.push({
		notification,
		sent: false,
		sentTimestamp: 0,
	});
	fs.writeFileSync(fileLocation, JSON.stringify(notificationQueue));
	QueueWorker(true);
}

function QueueWorker(manualTrigger = false): void {
	for (const notification of notificationQueue) {
		if (!notification.sent) {
			// Send notification
			if (getSocket && typeof getSocket === "function") {
				getSocket()
					.timeout(60000)
					.emit("PushNotification", notification.notification, (error: boolean, data: { success: boolean }) => {
						if (data.success && !error) {
							notification.sent = true;
							notification.sentTimestamp = Date.now();
							console.log(`[Notification] Successfully sent notification ${notification.notification.title}`);
							// Remove the notification from the queue
							notificationQueue.splice(
								notificationQueue.findIndex((n) => n.notification === notification.notification),
								1
							);
							fs.writeFile(fileLocation, JSON.stringify(notificationQueue), (err) => {
								if (err) {
									console.error(`[Notification] Failed to write notification persists file ${fileLocation}`, err);
								}
							});
						} else {
							console.error(`[Notification] Failed to send notification ${notification.notification.title}`);
						}
					});
			} else {
				console.error("Socket seems uninitialised, cannot send notification");
				// Force retry
				setTimeout(() => {
					QueueWorker(true);
				}, 3000);
			}
		}
	}
	if (!manualTrigger) {
		setTimeout(QueueWorker, 10000);
	}
}
console.log("Starting Notification Sender");
QueueWorker();
