import { assertClipboardCopySucceeded } from './services/clipboard';
import { NotificationService } from './services/notification';
import { getURLCopyResult } from './services/url';
import { CopyResult } from './types/interfaces';
import { ClipboardCopyRequest, ClipboardCopyResponse } from './types/messages';

const OFFSCREEN_DOCUMENT_PATH = 'offscreen.html';

class URLCopier {
    private notificationService: NotificationService;
    private creatingOffscreenDocument?: Promise<void>;

    constructor() {
        this.notificationService = new NotificationService();
    }

    private async copyURL(): Promise<CopyResult> {
        try {
            const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            const activeTab = tabs[0];
            const result = getURLCopyResult(activeTab?.url);

            if (!result.success) {
                return result;
            }

            await this.copyToClipboard(result.message);
            return result;
        } catch (error) {
            console.error('Error in copyURL:', error);
            return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
        }
    }

    private async copyToClipboard(url: string): Promise<void> {
        await this.setupOffscreenDocument();

        const message: ClipboardCopyRequest = {
            target: 'offscreen',
            type: 'copy-to-clipboard',
            text: url
        };
        const response = await chrome.runtime.sendMessage<ClipboardCopyRequest, ClipboardCopyResponse>(message);

        assertClipboardCopySucceeded(response);
    }

    private async setupOffscreenDocument(): Promise<void> {
        const offscreenUrl = chrome.runtime.getURL(OFFSCREEN_DOCUMENT_PATH);
        const existingContexts = await chrome.runtime.getContexts({
            contextTypes: [chrome.runtime.ContextType.OFFSCREEN_DOCUMENT],
            documentUrls: [offscreenUrl]
        });

        if (existingContexts.length > 0) {
            return;
        }

        if (!this.creatingOffscreenDocument) {
            this.creatingOffscreenDocument = chrome.offscreen.createDocument({
                url: OFFSCREEN_DOCUMENT_PATH,
                reasons: [chrome.offscreen.Reason.CLIPBOARD],
                justification: 'Copy the current tab URL to the clipboard.'
            }).finally((): void => {
                this.creatingOffscreenDocument = undefined;
            });
        }

        await this.creatingOffscreenDocument;
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
