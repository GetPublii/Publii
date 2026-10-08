/*
 * Checks once per website on this computer whether the saved server credentials can be read
 * from the system keychain - after the change of the password storage they may have to be entered again.
 *
 * Reading the keychain can ask for the system password, so it happens only during the first check
 * of the website and the result is kept until the app is closed. Websites are identified by their UUID
 * or name - renaming a website without UUID makes its credentials unavailable, so it is checked again.
 */

const CHECKED_SITES_STORAGE_KEY = 'publii-checked-site-secrets';

// Types of the secrets which cannot be read, found during this session for each website
const sessionResults = new Map();

function getSiteKey (siteConfig) {
    return siteConfig.uuid || siteConfig.name;
}

function readCheckedSites (storage) {
    try {
        const stored = JSON.parse(storage.getItem(CHECKED_SITES_STORAGE_KEY));
        return Array.isArray(stored) ? stored.filter(key => typeof key === 'string') : [];
    } catch (error) {
        return [];
    }
}

function markSiteAsChecked (storage, siteKey) {
    const checkedSites = readCheckedSites(storage);

    if (checkedSites.indexOf(siteKey) > -1) {
        return;
    }

    checkedSites.push(siteKey);

    try {
        storage.setItem(CHECKED_SITES_STORAGE_KEY, JSON.stringify(checkedSites));
    } catch (error) {
        // The website will be checked again during the next session
    }
}

async function readMissingSecrets (siteConfig, invoke) {
    const status = await invoke('app-site:secrets-status', siteConfig.name) || {};
    return Object.keys(status).filter(type => status[type] === false);
}

/**
 * Returns the secrets which cannot be read and whether it was the first check of the website
 *
 * @returns {Promise<{missing: string[], isFirstCheck: boolean}>}
 */
async function checkSiteSecrets (siteConfig, storage = window.localStorage, invoke = window.mainProcessAPI.invoke) {
    const siteKey = getSiteKey(siteConfig);

    if (sessionResults.has(siteKey)) {
        return { missing: sessionResults.get(siteKey), isFirstCheck: false };
    }

    if (readCheckedSites(storage).indexOf(siteKey) > -1) {
        return { missing: [], isFirstCheck: false };
    }

    try {
        const missing = await readMissingSecrets(siteConfig, invoke);
        sessionResults.set(siteKey, missing);
        markSiteAsChecked(storage, siteKey);
        return { missing, isFirstCheck: true };
    } catch (error) {
        return { missing: [], isFirstCheck: false };
    }
}

/**
 * Checks again the website which had secrets that could not be read, e.g. after saving the server settings
 *
 * @returns {Promise<string[]>}
 */
async function recheckMissingSecrets (siteConfig, invoke = window.mainProcessAPI.invoke) {
    const siteKey = getSiteKey(siteConfig);
    const missing = sessionResults.get(siteKey) || [];

    if (!missing.length) {
        return missing;
    }

    try {
        const currentlyMissing = await readMissingSecrets(siteConfig, invoke);
        sessionResults.set(siteKey, currentlyMissing);
        return currentlyMissing;
    } catch (error) {
        return missing;
    }
}

module.exports = {
    CHECKED_SITES_STORAGE_KEY,
    checkSiteSecrets,
    recheckMissingSecrets
};
