import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ClipboardService } from '../src/services/clipboard';

let executeScript = vi.fn();
let getURL = vi.fn();
let getContexts = vi.fn();
let sendMessage = vi.fn();
let createDocument = vi.fn();

describe('ClipboardService', () => {
    beforeEach((): void => {
        executeScript = vi.fn().mockResolvedValue([]);
        getURL = vi.fn().mockReturnValue('chrome-extension://test/offscreen.html');
        getContexts = vi.fn().mockResolvedValue([{}]);
        sendMessage = vi.fn().mockResolvedValue({ success: true });
        createDocument = vi.fn().mockResolvedValue(undefined);

        vi.stubGlobal('chrome', {
            scripting: { executeScript },
            runtime: {
                ContextType: { OFFSCREEN_DOCUMENT: 'OFFSCREEN_DOCUMENT' },
                getURL,
                getContexts,
                sendMessage
            },
            offscreen: {
                Reason: { CLIPBOARD: 'CLIPBOARD' },
                createDocument
            }
        });
        vi.spyOn(console, 'warn').mockImplementation((): void => undefined);
    });

    afterEach((): void => {
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    it('uses active-tab scripting for a normal URL', async (): Promise<void> => {
        const writeText = vi.fn().mockResolvedValue(undefined);
        vi.stubGlobal('navigator', { clipboard: { writeText } });

        await new ClipboardService().copy('https://example.com/path', 42);

        expect(executeScript).toHaveBeenCalledOnce();
        expect(executeScript).toHaveBeenCalledWith(expect.objectContaining({
            target: { tabId: 42 },
            args: ['https://example.com/path']
        }));
        const injection = executeScript.mock.calls[0][0] as {
            func: (text: string) => Promise<void>;
            args: [string];
        };
        await injection.func(...injection.args);
        expect(writeText).toHaveBeenCalledWith('https://example.com/path');
        expect(sendMessage).not.toHaveBeenCalled();
    });

    it('uses the existing offscreen document for restricted URLs', async (): Promise<void> => {
        await new ClipboardService().copy('chrome://settings', 42);

        expect(executeScript).not.toHaveBeenCalled();
        expect(getContexts).toHaveBeenCalledWith({
            contextTypes: ['OFFSCREEN_DOCUMENT'],
            documentUrls: ['chrome-extension://test/offscreen.html']
        });
        expect(createDocument).not.toHaveBeenCalled();
        expect(sendMessage).toHaveBeenCalledWith({ type: 'copy-to-clipboard', text: 'chrome://settings' });
    });

    it('uses the offscreen document when no tab ID is available', async (): Promise<void> => {
        await new ClipboardService().copy('https://example.com');

        expect(executeScript).not.toHaveBeenCalled();
        expect(sendMessage).toHaveBeenCalledWith({ type: 'copy-to-clipboard', text: 'https://example.com' });
    });

    it('falls back offscreen when active-tab scripting fails', async (): Promise<void> => {
        executeScript.mockRejectedValue(new Error('Cannot access page'));

        await new ClipboardService().copy('https://example.com', 42);

        expect(console.warn).toHaveBeenCalledOnce();
        expect(sendMessage).toHaveBeenCalledWith({ type: 'copy-to-clipboard', text: 'https://example.com' });
    });

    it('creates a missing offscreen document before sending the copy request', async (): Promise<void> => {
        getContexts.mockResolvedValue([]);

        await new ClipboardService().copy('about:blank', 42);

        expect(createDocument).toHaveBeenCalledWith({
            url: 'offscreen.html',
            reasons: ['CLIPBOARD'],
            justification: 'Copy the current tab URL to the clipboard.'
        });
        expect(createDocument.mock.invocationCallOrder[0]).toBeLessThan(sendMessage.mock.invocationCallOrder[0]);
    });

    it('rejects when the offscreen handler does not respond', async (): Promise<void> => {
        sendMessage.mockResolvedValue(undefined);

        await expect(new ClipboardService().copy('chrome://settings', 42)).rejects.toThrow(
            'Offscreen clipboard handler did not respond'
        );
    });

    it('surfaces an offscreen copy error', async (): Promise<void> => {
        sendMessage.mockResolvedValue({ success: false, error: 'Clipboard denied' });

        await expect(new ClipboardService().copy('chrome://settings', 42)).rejects.toThrow('Clipboard denied');
    });
});
