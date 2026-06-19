import { writeTextToClipboard } from './services/clipboard';
import { isClipboardCopyRequest } from './types/messages';

const handleMessage = (
    message: unknown,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response?: unknown) => void
): boolean => {
    if (!isClipboardCopyRequest(message)) {
        return false;
    }

    void writeTextToClipboard(navigator.clipboard, message.text).then(sendResponse);
    return true;
};

chrome.runtime.onMessage.addListener(handleMessage);
