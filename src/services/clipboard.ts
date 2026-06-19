import { ClipboardCopyResponse } from '../types/messages';

export interface ClipboardWriter {
    writeText(text: string): Promise<void>;
}

export const writeTextToClipboard = async (
    clipboard: ClipboardWriter | undefined,
    text: string
): Promise<ClipboardCopyResponse> => {
    if (!clipboard) {
        return { success: false, error: 'Clipboard API is unavailable' };
    }

    try {
        await clipboard.writeText(text);
        return { success: true };
    } catch (error) {
        console.error('Failed to copy to clipboard:', error);
        return { success: false, error: 'Failed to copy to clipboard' };
    }
};

export const assertClipboardCopySucceeded = (response: ClipboardCopyResponse | undefined): void => {
    if (!response?.success) {
        throw new Error(response?.error ?? 'Failed to copy to clipboard');
    }
};
