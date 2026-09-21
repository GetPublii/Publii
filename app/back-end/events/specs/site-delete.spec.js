const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

describe('Website removal IPC', function () {
    const senderId = 7;
    let application;
    let handlers;
    let events;
    let replies;
    let calls;
    let lockedSites;
    let openedDbs;
    let trashError;
    let finishTrashing;

    // Values come from another realm, so they are compared as plain data
    function plain (value) {
        return JSON.parse(JSON.stringify(value));
    }

    function remove (config) {
        return handlers.get('app-site-delete')({
            sender: {
                id: senderId,
                isDestroyed: () => false,
                send (channel, payload) {
                    replies.push({ channel, payload });
                }
            }
        }, config);
    }

    function lastReply () {
        return plain(replies[replies.length - 1]);
    }

    beforeEach(function () {
        handlers = new Map();
        replies = [];
        calls = [];
        lockedSites = new Set();
        openedDbs = new Set(['demo']);
        trashError = null;
        finishTrashing = null;

        application = {
            sitesDir: path.join(path.sep, 'sites'),
            sites: {
                'demo': { name: 'demo', displayName: 'Demo site', uuid: 'uuid-1' },
                'legacy': { name: 'legacy' }
            },
            previewServer: {
                async disableSite (siteName) {
                    calls.push('preview:' + siteName);
                }
            },
            getDbForSite: siteName => openedDbs.has(siteName),
            setDbForSite (siteName, db) {
                calls.push('db-reopened:' + db.db.path);
            },
            windowManager: {
                onWindowFocused () {},
                onWindowDestroyed () {},
                isSiteLockedByOther: siteName => lockedSites.has(siteName),
                getSiteForWindow: () => 'demo',
                clearWindowSite (webContentsId) {
                    calls.push('lock-released:' + webContentsId);
                }
            },
            notifySitesListChanged (exceptWebContentsId) {
                calls.push('notified:' + exceptWebContentsId);
            }
        };

        const context = {
            module: { exports: {} },
            console: { log () {} },
            require (name) {
                if (name === 'electron') {
                    return {
                        ipcMain: {
                            handle () {},
                            on (channel, handler) {
                                handlers.set(channel, handler);
                            }
                        }
                    };
                }

                if (name === '../site.js') {
                    return {
                        removeTemporaryBackupFiles () {},
                        async delete (appInstance, siteName) {
                            calls.push('trash:' + siteName);
                            await finishTrashing;

                            if (trashError) {
                                throw trashError;
                            }
                        }
                    };
                }

                if (name === './../helpers/password-storage.js') {
                    return {
                        async deleteAllPasswords (account) {
                            calls.push('passwords:' + account);
                        }
                    };
                }

                if (name === '../helpers/site-logs.js') {
                    return {
                        remove (appInstance, siteName) {
                            calls.push('logs:' + siteName);
                        }
                    };
                }

                if (name === '../helpers/ipc.helper.js') {
                    return {
                        createSafeSender: webContents => ({
                            id: webContents.id,
                            isDestroyed: () => webContents.isDestroyed(),
                            send: (...args) => webContents.send(...args)
                        })
                    };
                }

                if (name === './../helpers/slug') {
                    return value => 'slug-' + value;
                }

                if (name === 'better-sqlite3') {
                    return function (dbPath) {
                        this.path = dbPath;
                    };
                }

                if (name === '../helpers/db.utils.js') {
                    return function (db) {
                        this.db = db;
                    };
                }

                if (name === 'path') {
                    return path;
                }

                if (name === '../helpers/path-validator.js') {
                    return require(path.join(__dirname, '..', name));
                }

                return {};
            }
        };

        vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../site.js'), 'utf8'), context);
        events = new context.module.exports(application);
    });

    it('removes credentials only when the website is already in the trash', async function () {
        await remove({ site: 'demo' });

        assert.deepEqual(calls, [
            'preview:demo',
            'trash:demo',
            'passwords:uuid-1',
            'logs:demo',
            'lock-released:' + senderId,
            'notified:' + senderId
        ]);
        assert.deepEqual(lastReply().payload, { status: true });
        assert.equal('demo' in application.sites, false);
        assert.equal(events.deletingSites.has('demo'), false);
    });

    it('uses the name of websites without UUID as the credentials account', async function () {
        await remove({ site: 'legacy' });

        assert.equal(calls.includes('passwords:slug-legacy'), true);
    });

    it('keeps the website untouched when it cannot be moved to the trash', async function () {
        trashError = new Error('Trash is not available');
        await remove({ site: 'demo' });

        assert.deepEqual(lastReply().payload, { status: false, error: 'trash-failed' });
        assert.deepEqual(calls, [
            'preview:demo',
            'trash:demo',
            'db-reopened:' + path.join(application.sitesDir, 'demo', 'input', 'db.sqlite')
        ]);
        assert.equal('demo' in application.sites, true);
        assert.equal(events.deletingSites.has('demo'), false);
    });

    it('does not reopen a database which was not opened', async function () {
        trashError = new Error('Trash is not available');
        openedDbs.clear();
        await remove({ site: 'demo' });

        assert.deepEqual(calls, ['preview:demo', 'trash:demo']);
    });

    it('rejects unknown and unsafe websites', async function () {
        for (let config of [undefined, null, {}, { site: 'unknown' }, { site: '../demo' }, { site: '' }, { site: 7 }, { site: ['demo'] }]) {
            await remove(config);
            assert.deepEqual(lastReply().payload, { status: false, error: 'site-not-exists' });
        }

        assert.deepEqual(calls, []);
    });

    it('rejects websites opened in another window', async function () {
        lockedSites.add('demo');
        await remove({ site: 'demo' });

        assert.deepEqual(lastReply().payload, { status: false, error: 'site-already-open' });
        assert.deepEqual(calls, []);
        assert.equal('demo' in application.sites, true);
    });

    it('removes the website once when the same request comes again', async function () {
        let finish;
        finishTrashing = new Promise(resolve => finish = resolve);

        let firstRequest = remove({ site: 'demo' });
        await remove({ site: 'demo' });

        assert.deepEqual(lastReply().payload, { status: false, error: 'delete-in-progress' });

        finish();
        await firstRequest;

        assert.deepEqual(lastReply().payload, { status: true });
        assert.equal(calls.filter(call => call === 'trash:demo').length, 1);
        assert.equal(calls.filter(call => call === 'passwords:uuid-1').length, 1);
        assert.equal(events.deletingSites.has('demo'), false);
    });
});
