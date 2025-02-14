import { NotificationService } from './services/notification';
import { isRestrictedURL } from './utils/url-utils';
import { CopyResult } from './types/interfaces';

class URLCopier {
    private notificationService: NotificationService;

    constructor() {
        this.notificationService = new NotificationService();
    }

    private async copyURL(): Promise<CopyResult> {
        try {
            const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            const activeTab = tabs[0];

            if (!activeTab?.url) {
                return { success: false, message: 'No valid URL found' };
            }

            await this.copyToClipboard(activeTab.url, activeTab.id);
            return { success: true, message: activeTab.url };
        } catch (error) {
            console.error('Error in copyURL:', error);
            return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
        }
    }

    private async copyToClipboard(url: string, tabId?: number): Promise<void> {
        if (!tabId) {
            throw new Error('Invalid tab ID');
        }

        if (isRestrictedURL(url)) {
            throw new Error('Cannot copy restricted URLs');
        }

        try {
            await chrome.scripting.executeScript({
                target: { tabId },
                func: async (text: string): Promise<void> => {
                    try {
                        await navigator.clipboard.writeText(text);
                    } catch (error) {
                        console.error('Failed to copy to clipboard:', error);
                        throw new Error('Failed to copy to clipboard');
                    }
                },
                args: [url]
            });
        } catch (error) {
            console.error('Failed to copy URL:', error);
            throw new Error('Failed to copy to clipboard');
        }
    }

    public init(): void {
        chrome.commands.onCommand.addListener(async (command: string): Promise<void> => {
            if (command === 'copy-url') {
                const result = await this.copyURL();
                await this.notificationService.show(result.message, !result.success);
            }
        });
    }
}

// Initialize the extension
new URLCopier().init();