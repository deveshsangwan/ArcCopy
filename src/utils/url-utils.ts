import { CONFIG } from '../constants/config';

export const isRestrictedURL = (url: string): boolean => {
    return CONFIG.RESTRICTED_PROTOCOLS.some(protocol => url.startsWith(protocol));
};