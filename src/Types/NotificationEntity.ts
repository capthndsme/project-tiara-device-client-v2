import { NotificationType } from "./NotificationType";

export type NotificationEntity = {
   title: string,
   message: string,
   sentTimestamp: number,
   type: NotificationType,
}