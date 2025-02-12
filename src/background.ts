class URLCopier {
    private static readonly NOTIFICATION_DURATION = 1000;
    private static readonly URL_MAX_LENGTH = 50;

    private async copyURL(): Promise<void> {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        const activeTab = tabs[0];
        const url = activeTab?.url;

        if (!activeTab?.id || !url) {
            throw new Error('No active tab or URL found');
        }

        if (this.isRestrictedURL(url)) {
            await this.copyToClipboardFallback(url);
        } else {
            await chrome.scripting.executeScript({
                target: { tabId: activeTab.id },
                func: (text: string) => {
                    const textarea = document.createElement('textarea');
                    textarea.value = text;
                    textarea.style.position = 'fixed';
                    textarea.style.top = '0';
                    textarea.style.left = '0';
                    textarea.style.opacity = '0';

                    document.body.appendChild(textarea);
                    textarea.focus();
                    textarea.select();

                    try {
                        document.execCommand('copy');
                    } finally {
                        document.body.removeChild(textarea);
                    }
                },
                args: [url]
            });
        }

        await this.showNotification(url);
    }

    private isRestrictedURL(url: string): boolean {
        return url.startsWith('chrome://') ||
            url.startsWith('edge://') ||
            url.startsWith('about:');
    }

    private async showNotification(message: string, isError: boolean = false): Promise<string> {
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
        }, URLCopier.NOTIFICATION_DURATION);

        return notificationId;
    }

    private truncateMessage(message: string): string {
        return message.length > URLCopier.URL_MAX_LENGTH
            ? `${message.substring(0, URLCopier.URL_MAX_LENGTH - 3)}...`
            : message;
    }

    private async copyToClipboardFallback(text: string): Promise<void> {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.top = '0';
        textarea.style.left = '0';
        textarea.style.opacity = '0';

        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();

        try {
            document.execCommand('copy');
        } catch (error) {
            console.error('Fallback copy failed:', error);
            throw new Error('Failed to copy to clipboard');
        } finally {
            document.body.removeChild(textarea);
        }
    }

    public init(): void {
        chrome.commands.onCommand.addListener(async (command: string): Promise<void> => {
            if (command === 'copy-url') {
                try {
                    await this.copyURL();
                } catch (error) {
                    console.error('Failed to copy URL:', error);
                    await this.showNotification('Failed to copy URL', true);
                }
            }
        });
    }
}

// Initialize the extension
const urlCopier = new URLCopier();
urlCopier.init();