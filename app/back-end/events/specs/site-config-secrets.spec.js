const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

describe('Secrets saved with the site config', function () {
    let events;
    let calls;

    // Values come from another realm, so they are compared as plain data
    function plain (value) {
        return JSON.parse(JSON.stringify(value));
    }

    function settings (uuid = '') {
        return {
            name: 'renamed-site',
            uuid: uuid,
            deployment: {
                askforpassword: false
            }
        };
    }

    beforeEach(function () {
        calls = [];

        const context = {
            module: { exports: {} },
            console: { log () {} },
            require (name) {
                if (name === 'electron') {
                    return {
                        ipcMain: {
                            handle () {},
                            on () {}
                        }
                    };
                }

                if (name === './../helpers/password-storage.js') {
                    return {
                        async getPassword (type, account) {
                            calls.push('get:' + type + ':' + account);
                            return undefined;
                        },
                        async setPassword (type, account, password) {
                            calls.push('set:' + type + ':' + account + ':' + password);
                        },
                        async deletePassword (type, account) {
                            calls.push('delete:' + type + ':' + account);
                        }
                    };
                }

                if (name === './../helpers/slug') {
                    return value => value;
                }

                return {};
            }
        };

        vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../site.js'), 'utf8'), context);
        events = new context.module.exports({ sitesDir: path.join(path.sep, 'sites'), sites: {} });
    });

    it('never saves the placeholder of the previous account as the secret', async function () {
        let result = await events.loadPassword(settings(), 'publii', 'publii old-name');

        assert.deepEqual(plain(result), { newPassword: '', toSave: 'publii renamed-site' });
        assert.deepEqual(calls, []);
    });

    it('saves the placeholder of the current account of websites with UUID', async function () {
        let result = await events.loadPassword(settings('uuid-1'), 'publii-gh-token', 'publii-gh-token renamed-site');

        assert.deepEqual(plain(result), { newPassword: '', toSave: 'publii-gh-token uuid-1' });
        assert.deepEqual(calls, []);
    });

    it('saves typed secrets under the current account', async function () {
        let result = await events.loadPassword(settings(), 'publii', 'typed-password');

        assert.deepEqual(plain(result), { newPassword: 'typed-password', toSave: 'publii renamed-site' });
        assert.deepEqual(calls, [
            'get:publii:renamed-site',
            'set:publii:renamed-site:typed-password'
        ]);
    });
});
