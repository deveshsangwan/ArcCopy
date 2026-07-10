import { describe, expect, it } from 'vitest';

import { isRestrictedURL } from '../src/utils/url-utils';

describe('isRestrictedURL', () => {
    it.each(['chrome://settings', 'edge://settings', 'about:blank'])(
        'recognizes restricted URL %s',
        (url: string): void => {
            expect(isRestrictedURL(url)).toBe(true);
        }
    );

    it.each(['https://example.com', 'http://example.com', 'file:///tmp/example'])(
        'allows scriptable URL %s',
        (url: string): void => {
            expect(isRestrictedURL(url)).toBe(false);
        }
    );
});
