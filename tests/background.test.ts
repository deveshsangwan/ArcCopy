import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const services = vi.hoisted(() => ({
    copy: vi.fn(),
    show: vi.fn()
}));

vi.mock('../src/services/clipboard', () => ({
    ClipboardService: class {
        public copy = services.copy;
    }
}));

vi.mock('../src/services/notification', () => ({
    NotificationService: class {
        public show = services.show;
    }
}));

type CommandListener = (command: string) => Promise<void>;

let listener: CommandListener;
let queryTabs = vi.fn();

describe('copy URL command', () => {
    beforeEach(async (): Promise<void> => {
        vi.resetModules();
        services.copy.mockReset();
        services.show.mockReset().mockResolvedValue('notification-id');
        queryTabs = vi.fn().mockResolvedValue([{ id: 42, url: 'https://example.com/path' }]);

        vi.stubGlobal('chrome', {
            tabs: {
                query: queryTabs
            },
            commands: {
                onCommand: {
                    addListener: vi.fn((commandListener: CommandListener): void => {
                        listener = commandListener;
                    })
                }
            }
        });
        vi.spyOn(console, 'error').mockImplementation((): void => undefined);

        await import('../src/background.js');
    });

    afterEach((): void => {
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    it('shows success while the clipboard copy is still pending', async (): Promise<void> => {
        let finishCopy!: () => void;
        services.copy.mockReturnValue(new Promise<void>((resolve) => {
            finishCopy = resolve;
        }));

        const command = listener('copy-url');
        await vi.waitFor((): void => {
            expect(services.copy).toHaveBeenCalledWith('https://example.com/path', 42);
        });

        try {
            expect(services.show).toHaveBeenCalledWith('https://example.com/path', false);
        } finally {
            finishCopy();
            await command;
        }

        expect(services.show).toHaveBeenCalledOnce();
    });

    it('keeps the command pending until the success notification finishes', async (): Promise<void> => {
        let finishSuccessNotification!: () => void;
        let commandSettled = false;
        services.show.mockReturnValue(new Promise<string>((resolve) => {
            finishSuccessNotification = (): void => resolve('success-notification');
        }));
        services.copy.mockResolvedValue(undefined);

        const command = listener('copy-url').finally((): void => {
            commandSettled = true;
        });
        await vi.waitFor((): void => {
            expect(services.copy).toHaveBeenCalledWith('https://example.com/path', 42);
        });

        expect(commandSettled).toBe(false);

        finishSuccessNotification();
        await command;

        expect(commandSettled).toBe(true);
    });

    it('shows an error after an optimistic success when copying fails', async (): Promise<void> => {
        let finishSuccessNotification!: () => void;
        services.show
            .mockReturnValueOnce(new Promise<string>((resolve) => {
                finishSuccessNotification = (): void => resolve('success-notification');
            }))
            .mockResolvedValueOnce('error-notification');
        services.copy.mockRejectedValue(new Error('Clipboard denied'));

        const command = listener('copy-url');
        await vi.waitFor((): void => {
            expect(services.show).toHaveBeenCalledWith('https://example.com/path', false);
        });
        expect(services.show).toHaveBeenCalledOnce();

        finishSuccessNotification();
        await command;

        expect(services.show).toHaveBeenNthCalledWith(2, 'Clipboard denied', true);
    });

    it('preserves the clipboard error when notification and copy both fail', async (): Promise<void> => {
        services.show
            .mockRejectedValueOnce(new Error('Notification denied'))
            .mockResolvedValueOnce('error-notification');
        services.copy.mockRejectedValue(new Error('Clipboard denied'));

        await listener('copy-url');

        expect(services.show).toHaveBeenNthCalledWith(2, 'Clipboard denied', true);
    });

    it('shows only an error when the active tab has no URL', async (): Promise<void> => {
        queryTabs.mockResolvedValue([{ id: 42 }]);

        await listener('copy-url');

        expect(services.copy).not.toHaveBeenCalled();
        expect(services.show).toHaveBeenCalledOnce();
        expect(services.show).toHaveBeenCalledWith('No valid URL found', true);
    });

    it('ignores unrelated commands', async (): Promise<void> => {
        await listener('other-command');

        expect(queryTabs).not.toHaveBeenCalled();
        expect(services.copy).not.toHaveBeenCalled();
        expect(services.show).not.toHaveBeenCalled();
    });
});
