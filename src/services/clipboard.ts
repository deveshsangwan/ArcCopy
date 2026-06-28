import { ClipboardCopyRequest, ClipboardCopyResponse } from '../types/messages';
import { isRestrictedURL } from '../utils/url-utils';

const OFFSCREEN_DOCUMENT_PATH = 'offscreen.html';

export class ClipboardService {
    private creatingOffscreenDocument?: Promise<void>;

    public async copy(text: string, tabId?: number): Promise<void> {
        const canUseTabScript = tabId !== undefined && !isRestrictedURL(text);
        let tabScriptError: unknown;

        if (canUseTabScript) {
            try {
                await this.copyViaActiveTab(tabId, text);
                return;
            } catch (error) {
                tabScriptError = error;
                console.warn('Tab scripting copy failed, falling back to offscreen:', error);
            }
        }

        try {
            await this.copyViaOffscreenDocument(text);
        } catch (error) {
            if (tabScriptError !== undefined) {
                throw new Error(
                    error instanceof Error ? error.message : 'Failed to copy to clipboard',
                    { cause: tabScriptError }
                );
            }
            throw error;
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
            type: 'copy-to-clipboard',
            text: url
        };
        const response = await chrome.runtime.sendMessage<ClipboardCopyRequest, ClipboardCopyResponse>(message);

        if (!response) {
            throw new Error('Offscreen clipboard handler did not respond');
        }

        if (!response.success) {
            throw new Error(response.error ?? 'Failed to copy to clipboard');
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
}
