import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type AlarmListener = (alarm: chrome.alarms.Alarm) => void;

describe('NotificationService', () => {
    let alarmListener: AlarmListener | undefined;
    let alarmsCreate: ReturnType<typeof vi.fn>;
    let notificationsClear: ReturnType<typeof vi.fn>;
    let notificationsCreate: ReturnType<typeof vi.fn>;
    let notificationModule: typeof import('../src/services/notification');

    beforeEach(async (): Promise<void> => {
        alarmsCreate = vi.fn().mockResolvedValue(undefined);
        notificationsClear = vi.fn();
        notificationsCreate = vi.fn();
        alarmListener = undefined;

        vi.stubGlobal('chrome', {
            alarms: {
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
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
    });

    const triggerAlarm = (alarm: chrome.alarms.Alarm): void => {
        if (!alarmListener) {
            throw new Error('Expected the notification cleanup alarm listener to be registered');
        }

        alarmListener(alarm);
    };

    it('schedules one uniquely named cleanup alarm after creating a notification', async (): Promise<void> => {
        const now = 1000;
        vi.spyOn(Date, 'now').mockReturnValue(now);

        const notificationId = await new notificationModule.NotificationService().show('https://example.com');

        expect(notificationsCreate).toHaveBeenCalledOnce();
        expect(alarmsCreate).toHaveBeenCalledWith(
            `${notificationModule.NOTIFICATION_CLEANUP_ALARM_PREFIX}${notificationId}`,
            { when: now + 2000 }
        );
        expect(notificationsCreate.mock.invocationCallOrder[0]).toBeLessThan(alarmsCreate.mock.invocationCallOrder[0]);
    });

    it('keeps alarm scheduling failures quiet without interrupting notification display', async (): Promise<void> => {
        const errorSpy = vi.spyOn(console, 'error').mockImplementation((): void => undefined);
        alarmsCreate.mockRejectedValue(new Error('alarm failed'));

        await expect(new notificationModule.NotificationService().show('https://example.com')).resolves.toEqual(
            expect.any(String)
        );

        expect(notificationsCreate).toHaveBeenCalledOnce();
        expect(errorSpy).not.toHaveBeenCalled();
    });

    it('clears the notification associated with a matching cleanup alarm', (): void => {
        triggerAlarm({
            name: `${notificationModule.NOTIFICATION_CLEANUP_ALARM_PREFIX}notification-id`,
            scheduledTime: Date.now()
        });

        expect(notificationsClear).toHaveBeenCalledWith('notification-id');
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
});
