const assert = require('node:assert/strict');
const fs = require('fs-extra');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');

describe('Licence acceptance IPC', function () {
    let base;
    let application;
    let handlers;
    let replies;

    beforeEach(function () {
        base = fs.mkdtempSync(path.join(os.tmpdir(), 'publii-license-ipc-'));
        handlers = new Map();
        replies = [];
        application = {
            appConfig: {
                licenseAccepted: false,
                sitesLocation: path.join(base, 'sites'),
                uiZoomLevel: 1
            },
            appConfigPath: path.join(base, 'app-config.json')
        };
        fs.writeJsonSync(application.appConfigPath, application.appConfig);
        const context = {
            module: { exports: {} },
            console,
            require(name) {
                if (name === 'electron') {
                    return {
                        ipcMain: {
                            on(channel, handler) {
                                handlers.set(channel, handler);
                            }
                        }
                    };
                }

                if (name === 'fs-extra' || name === 'path') {
                    return require(name);
                }

                return {};
            }
        };
        vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../app.js'), 'utf8'), context);
        new context.module.exports(application);
    });

    afterEach(function () {
        fs.removeSync(base);
    });

    it('marks the licence as accepted in memory and on disk without replacing the config', function () {
        const config = application.appConfig;

        handlers.get('app-license-accept')({
            sender: {
                send(channel, payload) {
                    replies.push({ channel, payload });
                }
            }
        }, true);

        assert.equal(application.appConfig, config);
        assert.equal(application.appConfig.licenseAccepted, true);
        assert.deepEqual(fs.readJsonSync(application.appConfigPath), {
            licenseAccepted: true,
            sitesLocation: path.join(base, 'sites'),
            uiZoomLevel: 1
        });
        assert.deepEqual(replies, [{ channel: 'app-license-accepted', payload: true }]);
    });
});
