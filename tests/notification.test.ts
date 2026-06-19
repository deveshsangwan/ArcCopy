import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type AlarmListener = (alarm: chrome.alarms.Alarm) => void;

describe('NotificationService', () => {
    let alarmListener: AlarmListener | undefined;
    let alarmsClear: ReturnType<typeof vi.fn>;
    let alarmsCreate: ReturnType<typeof vi.fn>;
    let notificationsClear: ReturnType<typeof vi.fn>;
    let notificationsCreate: ReturnType<typeof vi.fn>;
    let notificationModule: typeof import('../src/services/notification');

    beforeEach(async (): Promise<void> => {
        alarmsClear = vi.fn().mockResolvedValue(true);
        alarmsCreate = vi.fn().mockResolvedValue(undefined);
        notificationsClear = vi.fn((_notificationId: string, callback?: (wasCleared: boolean) => void): void => {
            callback?.(true);
        });
        notificationsCreate = vi.fn();
        alarmListener = undefined;

        vi.stubGlobal('chrome', {
            alarms: {
                clear: alarmsClear,
                create: alarmsCreate,
                onAlarm: {
                    addListener: vi.fn((listener: AlarmListener): void => {
                        alarmListener = listener;
                    })
                }
            },
            notifications: {
                clear: notificationsClear,
                create: notificationsCreate
            }
        });
        vi.resetModules();
        notificationModule = await import('../src/services/notification');
    });

    afterEach((): void => {
        vi.useRealTimers();
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
    });

    const triggerAlarm = (alarm: chrome.alarms.Alarm): void => {
        if (!alarmListener) {
            throw new Error('Expected the notification cleanup alarm listener to be registered');
        }

        alarmListener(alarm);
    };

    it('cleans up after two seconds and cancels the fallback alarm', async (): Promise<void> => {
        const now = 1000;
        vi.useFakeTimers();
        vi.setSystemTime(now);

        const notificationId = await new notificationModule.NotificationService().show('https://example.com');

        expect(notificationsCreate).toHaveBeenCalledOnce();
        expect(alarmsCreate).toHaveBeenCalledWith(
            `${notificationModule.NOTIFICATION_CLEANUP_ALARM_PREFIX}${notificationId}`,
            { when: now + notificationModule.NOTIFICATION_CLEANUP_FALLBACK_DELAY }
        );
        expect(notificationsCreate.mock.invocationCallOrder[0]).toBeLessThan(alarmsCreate.mock.invocationCallOrder[0]);

        await vi.advanceTimersByTimeAsync(1999);
        expect(notificationsClear).not.toHaveBeenCalled();

        await vi.advanceTimersByTimeAsync(1);
        expect(notificationsClear).toHaveBeenCalledWith(notificationId, expect.any(Function));
        expect(alarmsClear).toHaveBeenCalledWith(
            `${notificationModule.NOTIFICATION_CLEANUP_ALARM_PREFIX}${notificationId}`
        );
    });

    it('keeps fallback alarm scheduling failures quiet without interrupting timer cleanup', async (): Promise<void> => {
        const errorSpy = vi.spyOn(console, 'error').mockImplementation((): void => undefined);
        alarmsCreate.mockRejectedValue(new Error('alarm failed'));
        vi.useFakeTimers();

        const notificationId = await new notificationModule.NotificationService().show('https://example.com');

        expect(notificationsCreate).toHaveBeenCalledOnce();
        expect(notificationId).toEqual(expect.any(String));
        expect(errorSpy).not.toHaveBeenCalled();

        await vi.advanceTimersByTimeAsync(2000);
        expect(notificationsClear).toHaveBeenCalledWith(notificationId, expect.any(Function));
    });

    it('clears the notification associated with a matching fallback alarm', async (): Promise<void> => {
        triggerAlarm({
            name: `${notificationModule.NOTIFICATION_CLEANUP_ALARM_PREFIX}notification-id`,
            scheduledTime: Date.now()
        });
        await Promise.resolve();

        expect(notificationsClear).toHaveBeenCalledWith('notification-id', expect.any(Function));
    });

    it('ignores alarms that are not notification cleanup alarms', (): void => {
        triggerAlarm({ name: 'unrelated-alarm', scheduledTime: Date.now() });

        expect(notificationsClear).not.toHaveBeenCalled();
    });

    it('keeps clear failures quiet', async (): Promise<void> => {
        const errorSpy = vi.spyOn(console, 'error').mockImplementation((): void => undefined);
        notificationsClear.mockRejectedValue(new Error('clear failed'));

        expect((): void => {
            triggerAlarm({
                name: `${notificationModule.NOTIFICATION_CLEANUP_ALARM_PREFIX}notification-id`,
                scheduledTime: Date.now()
            });
        }).not.toThrow();
        await Promise.resolve();

        expect(errorSpy).not.toHaveBeenCalled();
    });

    it('keeps fallback alarm cancellation failures quiet', async (): Promise<void> => {
        const errorSpy = vi.spyOn(console, 'error').mockImplementation((): void => undefined);
        alarmsClear.mockRejectedValue(new Error('alarm clear failed'));
        vi.useFakeTimers();

        await new notificationModule.NotificationService().show('https://example.com');
        await vi.advanceTimersByTimeAsync(2000);

        expect(errorSpy).not.toHaveBeenCalled();
    });
});
