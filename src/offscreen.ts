import { ClipboardCopyResponse, isClipboardCopyRequest } from './types/messages';

const writeToClipboard = async (text: string): Promise<ClipboardCopyResponse> => {
    if (!navigator.clipboard?.writeText) {
        return { success: false, error: 'Clipboard API is unavailable' };
    }

    try {
        await navigator.clipboard.writeText(text);
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

    void writeToClipboard(message.text).then(sendResponse);
    return true;
};

chrome.runtime.onMessage.addListener(handleMessage);
