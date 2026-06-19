import { CONFIG } from '../constants/config';

export const NOTIFICATION_CLEANUP_ALARM_PREFIX = 'quickclip-notification-cleanup:';

const getCleanupAlarmName = (notificationId: string): string =>
    `${NOTIFICATION_CLEANUP_ALARM_PREFIX}${notificationId}`;

const getNotificationIdFromCleanupAlarm = (alarmName: string): string | undefined => {
    if (!alarmName.startsWith(NOTIFICATION_CLEANUP_ALARM_PREFIX)) {
        return undefined;
    }

    const notificationId = alarmName.slice(NOTIFICATION_CLEANUP_ALARM_PREFIX.length);
    return notificationId || undefined;
};

export const clearNotificationForCleanupAlarm = (alarm: chrome.alarms.Alarm): void => {
    const notificationId = getNotificationIdFromCleanupAlarm(alarm.name);

    if (!notificationId) {
        return;
    }

    try {
        // Chrome's callback API returns void, while modern MV3 Chrome may return a Promise.
        // Handle either form without allowing cleanup failures to escape the alarm listener.
        void Promise.resolve(chrome.notifications.clear(notificationId)).catch((): void => undefined);
    } catch {
        // Notification cleanup is best-effort and must not disrupt future copy commands.
    }
};

// Register while the service worker module is evaluated so alarm delivery can wake a new worker.
chrome.alarms.onAlarm.addListener(clearNotificationForCleanupAlarm);

export class NotificationService {
    private truncateMessage(message: string): string {
        return message.length > CONFIG.URL_MAX_LENGTH
            ? `${message.substring(0, CONFIG.URL_MAX_LENGTH - 3)}...`
            : message;
    }

    public async show(message: string, isError: boolean = false): Promise<string> {
        try {
            const shortMessage = this.truncateMessage(message);
            const notificationId = crypto.randomUUID();

            chrome.notifications.create(notificationId, {
                type: 'basic',
                iconUrl: isError ? 'error.png' : 'success.png',
                title: isError ? 'Error!' : 'URL Copied!',
                message: shortMessage,
                priority: 0,
                silent: true
            });

            await this.scheduleCleanup(notificationId);

            return notificationId;
        } catch (err) {
            console.error('Notification error:', err);
            return Date.now().toString();
        }
    }

    private async scheduleCleanup(notificationId: string): Promise<void> {
        try {
            await chrome.alarms.create(getCleanupAlarmName(notificationId), {
                when: Date.now() + CONFIG.NOTIFICATION_DURATION
            });
        } catch {
            // Alarms are best-effort; a notification still communicates the copy result without one.
        }
    }
}
