import { CONFIG } from '../constants/config';

export class NotificationService {
    private truncateMessage(message: string): string {
        return message.length > CONFIG.URL_MAX_LENGTH
            ? `${message.substring(0, CONFIG.URL_MAX_LENGTH - 3)}...`
            : message;
    }

    public async show(message: string, isError: boolean = false): Promise<string> {
        const shortMessage = this.truncateMessage(message);
        const notificationId = Date.now().toString();

        await chrome.notifications.create(notificationId, {
            type: 'basic',
            iconUrl: isError ? 'error.png' : 'success.png',
            title: isError ? 'Error!' : 'URL Copied!',
            message: shortMessage,
            priority: 0,
            silent: true
        });

        setTimeout(async () => {
            await chrome.notifications.clear(notificationId);
        }, CONFIG.NOTIFICATION_DURATION);

        return notificationId;
    }
}