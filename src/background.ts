import { ClipboardService } from './services/clipboard';
import { NotificationService } from './services/notification';
import { CopyResult } from './types/interfaces';

class URLCopier {
    private notificationService: NotificationService;
    private clipboardService: ClipboardService;

    constructor() {
        this.notificationService = new NotificationService();
        this.clipboardService = new ClipboardService();
    }

    private async copyURL(): Promise<CopyResult> {
        try {
            const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            const activeTab = tabs[0];

            if (!activeTab?.url) {
                return { success: false, message: 'No valid URL found' };
            }

            await this.clipboardService.copy(activeTab.url, activeTab.id);
            return { success: true, message: activeTab.url };
        } catch (error) {
            console.error('Error in copyURL:', error);
            return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
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
