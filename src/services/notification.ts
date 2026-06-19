import { CONFIG } from '../constants/config';

export const NOTIFICATION_CLEANUP_ALARM_PREFIX = 'quickclip-notification-cleanup:';
export const NOTIFICATION_CLEANUP_FALLBACK_DELAY = 30_000;

const getCleanupAlarmName = (notificationId: string): string =>
    `${NOTIFICATION_CLEANUP_ALARM_PREFIX}${notificationId}`;

const getNotificationIdFromCleanupAlarm = (alarmName: string): string | undefined => {
    if (!alarmName.startsWith(NOTIFICATION_CLEANUP_ALARM_PREFIX)) {
        return undefined;
    }

    const notificationId = alarmName.slice(NOTIFICATION_CLEANUP_ALARM_PREFIX.length);
    return notificationId || undefined;
};

const clearNotification = (notificationId: string): Promise<boolean> =>
    new Promise((resolve, reject): void => {
        try {
            // @types/chrome still exposes the callback overload, while Chrome 116+ can also
            // return a Promise. Supporting both keeps cleanup quiet in either environment.
            const result = chrome.notifications.clear(notificationId, resolve) as unknown;

            if (result instanceof Promise) {
                void result.then(resolve, reject);
            }
        } catch (error) {
            reject(error);
        }
    });

const clearCleanupAlarm = async (notificationId: string): Promise<void> => {
    try {
        await chrome.alarms.clear(getCleanupAlarmName(notificationId));
    } catch {
        // The alarm is only a fallback, so cancellation failures are intentionally quiet.
    }
};

const clearNotificationAndFallbackAlarm = async (notificationId: string): Promise<void> => {
    try {
        if (await clearNotification(notificationId)) {
            await clearCleanupAlarm(notificationId);
        }
    } catch {
        // Notification cleanup is best-effort and must not disrupt future copy commands.
    }
};

export const clearNotificationForCleanupAlarm = (alarm: chrome.alarms.Alarm): void => {
    const notificationId = getNotificationIdFromCleanupAlarm(alarm.name);

    if (!notificationId) {
        return;
    }

    void clearNotification(notificationId).catch((): void => undefined);
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

            this.scheduleTimerCleanup(notificationId);
            await this.scheduleFallbackCleanup(notificationId);

            return notificationId;
        } catch (err) {
            console.error('Notification error:', err);
            return Date.now().toString();
        }
    }

    private scheduleTimerCleanup(notificationId: string): void {
        setTimeout((): void => {
            void clearNotificationAndFallbackAlarm(notificationId);
        }, CONFIG.NOTIFICATION_DURATION);
    }

    private async scheduleFallbackCleanup(notificationId: string): Promise<void> {
        try {
            await chrome.alarms.create(getCleanupAlarmName(notificationId), {
                when: Date.now() + Math.max(CONFIG.NOTIFICATION_DURATION, NOTIFICATION_CLEANUP_FALLBACK_DELAY)
            });
        } catch {
            // Timer cleanup is already scheduled; the alarm only covers a suspended worker.
        }
    }
}
