import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type MessageHandler = (
    message: unknown,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response?: unknown) => void
) => boolean;

let select = vi.fn();
let execCommand = vi.fn<(command: string) => boolean>();
let querySelector = vi.fn<(selector: string) => FakeTextArea | null>();
let handler: MessageHandler;

class FakeTextArea {
    public value = '';

    public select(): void {
        select();
    }
}

const loadHandler = async (): Promise<MessageHandler> => {
    await import('../src/offscreen.js');
    return handler;
};

describe('offscreen clipboard handler', () => {
    let textArea: FakeTextArea;

    beforeEach((): void => {
        vi.resetModules();
        textArea = new FakeTextArea();
        select = vi.fn();
        execCommand = vi.fn<(command: string) => boolean>().mockReturnValue(true);
        querySelector = vi.fn<(selector: string) => FakeTextArea | null>().mockReturnValue(textArea);

        vi.stubGlobal('HTMLTextAreaElement', FakeTextArea);
        vi.stubGlobal('document', { querySelector, execCommand });
        vi.stubGlobal('chrome', {
            runtime: {
                onMessage: {
                    addListener: vi.fn((listener: MessageHandler): void => {
                        handler = listener;
                    })
                }
            }
        });
    });

    afterEach((): void => {
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    it('selects the textarea and copies valid requests', async (): Promise<void> => {
        const sendResponse = vi.fn();
        const listener = await loadHandler();

        expect(listener(
            { type: 'copy-to-clipboard', text: 'https://example.com' },
            {} as chrome.runtime.MessageSender,
            sendResponse
        )).toBe(true);
        expect(querySelector).toHaveBeenCalledWith('#text');
        expect(textArea.value).toBe('https://example.com');
        expect(select).toHaveBeenCalledOnce();
        expect(execCommand).toHaveBeenCalledWith('copy');
        expect(sendResponse).toHaveBeenCalledWith({ success: true });
    });

    it('ignores unrelated messages', async (): Promise<void> => {
        const sendResponse = vi.fn();
        const listener = await loadHandler();

        expect(listener({ type: 'other' }, {} as chrome.runtime.MessageSender, sendResponse)).toBe(false);
        expect(sendResponse).not.toHaveBeenCalled();
        expect(execCommand).not.toHaveBeenCalled();
    });

    it('reports a failed execCommand copy', async (): Promise<void> => {
        execCommand.mockReturnValue(false);
        const sendResponse = vi.fn();
        const listener = await loadHandler();

        listener(
            { type: 'copy-to-clipboard', text: 'https://example.com' },
            {} as chrome.runtime.MessageSender,
            sendResponse
        );

        expect(sendResponse).toHaveBeenCalledWith({ success: false, error: 'Failed to copy to clipboard' });
    });

    it('reports a missing textarea', async (): Promise<void> => {
        querySelector.mockReturnValue(null);
        const sendResponse = vi.fn();
        const listener = await loadHandler();

        listener(
            { type: 'copy-to-clipboard', text: 'https://example.com' },
            {} as chrome.runtime.MessageSender,
            sendResponse
        );

        expect(sendResponse).toHaveBeenCalledWith({ success: false, error: 'Clipboard element is unavailable' });
    });

    it('reports exceptions thrown during copy', async (): Promise<void> => {
        execCommand.mockImplementation((): boolean => {
            throw new Error('copy unavailable');
        });
        vi.spyOn(console, 'error').mockImplementation((): void => undefined);
        const sendResponse = vi.fn();
        const listener = await loadHandler();

        listener(
            { type: 'copy-to-clipboard', text: 'https://example.com' },
            {} as chrome.runtime.MessageSender,
            sendResponse
        );

        expect(console.error).toHaveBeenCalledOnce();
        expect(sendResponse).toHaveBeenCalledWith({ success: false, error: 'Failed to copy to clipboard' });
    });
});
