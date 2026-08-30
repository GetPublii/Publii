const STORAGE_KEY = 'publii-pending-wordpress-import';

export function storePendingWordPressImport (payload) {
    try {
        window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
        return true;
    } catch (e) {
        return false;
    }
}

export function consumePendingWordPressImport (siteName) {
    let payload;

    try {
        payload = JSON.parse(window.sessionStorage.getItem(STORAGE_KEY));
    } catch (e) {
        try {
            window.sessionStorage.removeItem(STORAGE_KEY);
        } catch (storageError) {
            // Ignore unavailable session storage and let the user select the file again.
        }
        return null;
    }

    if (!payload ||
        typeof payload.filePath !== 'string' ||
        !payload.stats ||
        typeof payload.stats !== 'object') {
        window.sessionStorage.removeItem(STORAGE_KEY);
        return null;
    }

    if (payload.siteName !== siteName) {
        return null;
    }

    window.sessionStorage.removeItem(STORAGE_KEY);
    return payload;
}
