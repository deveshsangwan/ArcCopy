import { NotificationService } from './services/notification';
import { CopyResult } from './types/interfaces';
import { ClipboardCopyRequest, ClipboardCopyResponse } from './types/messages';
import { isRestrictedURL } from './utils/url-utils';

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

    private canUseScripting(): boolean {
        return typeof chrome.scripting?.executeScript === 'function';
    }

    private async copyToClipboard(url: string, tabId?: number): Promise<void> {
        if (isRestrictedURL(url)) {
            await this.copyViaOffscreenDocument(url);
            return;
        }

        if (!this.canUseScripting()) {
            await this.copyViaOffscreenDocument(url);
            return;
        }

        if (!tabId) {
            await this.copyViaOffscreenDocument(url);
            return;
        }

        try {
            await this.copyViaActiveTab(tabId, url);
        } catch {
            await this.copyViaOffscreenDocument(url);
        }
    }

    private async copyViaActiveTab(tabId: number, url: string): Promise<void> {
        await chrome.scripting.executeScript({
            target: { tabId },
            func: async (text: string): Promise<void> => {
                await navigator.clipboard.writeText(text);
            },
            args: [url]
        });
    }

    private async copyViaOffscreenDocument(url: string): Promise<void> {
        await this.setupOffscreenDocument();

        const message: ClipboardCopyRequest = {
            target: 'offscreen',
            type: 'copy-to-clipboard',
            text: url
        };
        const response = await chrome.runtime.sendMessage<ClipboardCopyRequest, ClipboardCopyResponse>(message);

        if (!response?.success) {
            throw new Error(response?.error ?? 'Failed to copy to clipboard');
        }
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
