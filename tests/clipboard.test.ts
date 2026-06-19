import { describe, expect, it, vi } from 'vitest';

import { assertClipboardCopySucceeded, writeTextToClipboard } from '../src/services/clipboard';

describe('writeTextToClipboard', () => {
    it('returns success after writing to the injected clipboard', async (): Promise<void> => {
        const writeText = vi.fn().mockResolvedValue(undefined);

        await expect(writeTextToClipboard({ writeText }, 'chrome://settings')).resolves.toEqual({ success: true });
        expect(writeText).toHaveBeenCalledWith('chrome://settings');
    });

    it('returns a clear error when the Clipboard API is unavailable', async (): Promise<void> => {
        await expect(writeTextToClipboard(undefined, 'https://example.com')).resolves.toEqual({
            success: false,
            error: 'Clipboard API is unavailable'
        });
    });

    it('returns a copy error when the Clipboard API rejects the write', async (): Promise<void> => {
        const writeText = vi.fn().mockRejectedValue(new Error('denied'));
        const errorSpy = vi.spyOn(console, 'error').mockImplementation((): void => undefined);

        await expect(writeTextToClipboard({ writeText }, 'https://example.com')).resolves.toEqual({
            success: false,
            error: 'Failed to copy to clipboard'
        });

        errorSpy.mockRestore();
    });
});

describe('assertClipboardCopySucceeded', () => {
    it('allows successful offscreen responses', (): void => {
        expect((): void => assertClipboardCopySucceeded({ success: true })).not.toThrow();
    });

    it('surfaces the offscreen error message', (): void => {
        expect((): void => assertClipboardCopySucceeded({ success: false, error: 'Clipboard API is unavailable' })).toThrow(
            'Clipboard API is unavailable'
        );
    });

    it('uses a fallback error when the offscreen response is missing', (): void => {
        expect((): void => assertClipboardCopySucceeded(undefined)).toThrow('Failed to copy to clipboard');
    });
});
