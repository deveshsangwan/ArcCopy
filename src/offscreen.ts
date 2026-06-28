import { ClipboardCopyResponse, isClipboardCopyRequest } from './types/messages';

// Offscreen documents cannot be focused, so navigator.clipboard.writeText fails here.
// execCommand is deprecated on the open web but remains Chrome's supported path for
// extension-owned clipboard writes in offscreen documents (see MV3 migration guide).
const textEl = document.querySelector('#text');

const writeToClipboard = (text: string): ClipboardCopyResponse => {
    if (!(textEl instanceof HTMLTextAreaElement)) {
        return { success: false, error: 'Clipboard element is unavailable' };
    }

    try {
        textEl.value = text;
        textEl.select();
        if (!document.execCommand('copy')) {
            return { success: false, error: 'Failed to copy to clipboard' };
        }
        return { success: true };
    } catch (error) {
        console.error('Failed to copy to clipboard:', error);
        return { success: false, error: 'Failed to copy to clipboard' };
    }
};

const handleMessage = (
    message: unknown,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response?: unknown) => void
): boolean => {
    if (!isClipboardCopyRequest(message)) {
        return false;
    }

    sendResponse(writeToClipboard(message.text));
    return true;
};

chrome.runtime.onMessage.addListener(handleMessage);
