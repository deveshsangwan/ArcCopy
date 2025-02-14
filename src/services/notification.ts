import { CONFIG } from '../constants/config';

export class NotificationService {
    private truncateMessage(message: string): string {
        return message.length > CONFIG.URL_MAX_LENGTH
            ? `${message.substring(0, CONFIG.URL_MAX_LENGTH - 3)}...`
            : message;
    }

    public async show(message: string, isError: boolean = false): Promise<string> {
        try {
            const shortMessage = this.truncateMessage(message);
            const notificationId = Date.now().toString();

            chrome.notifications.create(notificationId, {
                type: 'basic',
                iconUrl: isError ? 'error.png' : 'success.png',
                title: isError ? 'Error!' : 'URL Copied!',
                message: shortMessage,
                priority: 0,
                silent: true
            });

            setTimeout(async () => {
                try {
                    chrome.notifications.clear(notificationId);
                } catch (err) {
                    console.error('Failed to clear notification:', err);
                }
            }, CONFIG.NOTIFICATION_DURATION);

            return notificationId;
        } catch (err) {
            console.error('Notification error:', err);
            return Date.now().toString();
        }
    }
}