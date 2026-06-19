import { describe, expect, it } from 'vitest';

import { getURLCopyResult } from '../src/services/url';

describe('getURLCopyResult', () => {
    it.each(['chrome://settings', 'edge://settings', 'about:blank'])(
        'accepts browser-managed URL %s',
        (url: string): void => {
            expect(getURLCopyResult(url)).toEqual({ success: true, message: url });
        }
    );

    it.each([undefined, '', '   '])('rejects missing or invalid URL %j', (url: string | undefined): void => {
        expect(getURLCopyResult(url)).toEqual({ success: false, message: 'No valid URL found' });
    });
});
