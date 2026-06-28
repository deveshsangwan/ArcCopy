export interface ClipboardCopyRequest {
    type: 'copy-to-clipboard';
    text: string;
}

export interface ClipboardCopyResponse {
    success: boolean;
    error?: string;
}

export const isClipboardCopyRequest = (message: unknown): message is ClipboardCopyRequest => {
    if (!message || typeof message !== 'object') {
        return false;
    }

    const candidate = message as Partial<ClipboardCopyRequest>;

    return candidate.type === 'copy-to-clipboard' && typeof candidate.text === 'string';
};
