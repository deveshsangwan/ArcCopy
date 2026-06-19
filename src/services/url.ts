import { CopyResult } from '../types/interfaces';

export const getURLCopyResult = (url: string | undefined): CopyResult => {
    if (!url?.trim()) {
        return { success: false, message: 'No valid URL found' };
    }

    return { success: true, message: url };
};
