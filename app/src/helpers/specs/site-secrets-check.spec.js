const assert = require('node:assert/strict');
const {
    CHECKED_SITES_STORAGE_KEY,
    checkSiteSecrets,
    recheckMissingSecrets
} = require('../site-secrets-check');

function createStorage (initial = {}) {
    const data = { ...initial };

    return {
        data,
        getItem: key => Object.prototype.hasOwnProperty.call(data, key) ? data[key] : null,
        setItem: (key, value) => {
            data[key] = String(value);
        }
    };
}

function createInvoke (status) {
    const calls = [];
    const invoke = async (channel, siteName) => {
        calls.push(channel + ':' + siteName);

        if (status instanceof Error) {
            throw status;
        }

        return typeof status === 'function' ? status() : status;
    };

    invoke.calls = calls;
    return invoke;
}

describe('Website secrets check', function () {
    it('reads the keychain only during the first check of the website', async function () {
        const storage = createStorage();
        const invoke = createInvoke({ 'publii': false });
        const site = { name: 'first-check', uuid: 'uuid-first-check' };

        assert.deepEqual(await checkSiteSecrets(site, storage, invoke), { missing: ['publii'], isFirstCheck: true });
        assert.deepEqual(await checkSiteSecrets(site, storage, invoke), { missing: ['publii'], isFirstCheck: false });
        assert.deepEqual(invoke.calls, ['app-site:secrets-status:first-check']);
        assert.deepEqual(JSON.parse(storage.data[CHECKED_SITES_STORAGE_KEY]), ['uuid-first-check']);
    });

    it('does not read the keychain for websites checked during previous sessions', async function () {
        const storage = createStorage({ [CHECKED_SITES_STORAGE_KEY]: JSON.stringify(['uuid-checked']) });
        const invoke = createInvoke({ 'publii': false });

        assert.deepEqual(await checkSiteSecrets({ name: 'checked', uuid: 'uuid-checked' }, storage, invoke), { missing: [], isFirstCheck: false });
        assert.deepEqual(invoke.calls, []);
    });

    it('marks websites with readable secrets as checked', async function () {
        const storage = createStorage();
        const invoke = createInvoke({ 'publii': true });

        assert.deepEqual(await checkSiteSecrets({ name: 'readable-site' }, storage, invoke), { missing: [], isFirstCheck: true });
        assert.deepEqual(JSON.parse(storage.data[CHECKED_SITES_STORAGE_KEY]), ['readable-site']);
    });

    it('checks again a renamed website without UUID', async function () {
        const storage = createStorage({ [CHECKED_SITES_STORAGE_KEY]: JSON.stringify(['old-name']) });
        const invoke = createInvoke({ 'publii': false });

        assert.deepEqual(await checkSiteSecrets({ name: 'new-name' }, storage, invoke), { missing: ['publii'], isFirstCheck: true });
        assert.deepEqual(invoke.calls, ['app-site:secrets-status:new-name']);
    });

    it('does not mark the website as checked when the check fails', async function () {
        const storage = createStorage();
        const invoke = createInvoke(new Error('No handler registered'));

        assert.deepEqual(await checkSiteSecrets({ name: 'failed-check' }, storage, invoke), { missing: [], isFirstCheck: false });
        assert.equal(storage.data[CHECKED_SITES_STORAGE_KEY], undefined);
    });

    it('ignores invalid data saved in the storage', async function () {
        const storage = createStorage({ [CHECKED_SITES_STORAGE_KEY]: '{invalid' });
        const invoke = createInvoke({});

        assert.deepEqual(await checkSiteSecrets({ name: 'invalid-storage' }, storage, invoke), { missing: [], isFirstCheck: true });
        assert.deepEqual(JSON.parse(storage.data[CHECKED_SITES_STORAGE_KEY]), ['invalid-storage']);
    });

    it('checks again only the websites which had secrets that could not be read', async function () {
        let status = { 'publii-s3-id': false, 'publii-s3-key': false };
        const invoke = createInvoke(() => status);
        const site = { name: 'recheck', uuid: 'uuid-recheck' };

        await checkSiteSecrets(site, createStorage(), invoke);
        status = { 'publii-s3-id': true, 'publii-s3-key': false };

        assert.deepEqual(await recheckMissingSecrets(site, invoke), ['publii-s3-key']);
        assert.deepEqual(await checkSiteSecrets(site, createStorage(), invoke), { missing: ['publii-s3-key'], isFirstCheck: false });

        const readableSite = { name: 'recheck-readable' };
        const readableInvoke = createInvoke({ 'publii': true });

        await checkSiteSecrets(readableSite, createStorage(), readableInvoke);
        assert.deepEqual(await recheckMissingSecrets(readableSite, readableInvoke), []);
        assert.equal(readableInvoke.calls.length, 1);
    });
});
