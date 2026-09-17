const assert = require('node:assert/strict');
const fs = require('fs-extra');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const AppFiles = require('../../helpers/app-files.js');
const UtilsHelper = require('../../helpers/utils.js');

describe('Sites location retry IPC', function () {
    const senderId = 42;
    let base;
    let missingLocation;
    let application;
    let handlers;
    let replies;
    let reloads;
    let notifications;
    let originalLog;

    beforeEach(function () {
        base = fs.mkdtempSync(path.join(os.tmpdir(), 'publii-sites-retry-'));
        missingLocation = path.join(base, 'missing-sites');
        handlers = new Map();
        replies = [];
        reloads = [];
        notifications = [];
        originalLog = console.log;
        console.log = () => {};
        application = {
            app: { sitesDir: missingLocation },
            appConfig: { licenseAccepted: true, sitesLocation: missingLocation },
            sitesDir: missingLocation,
            sites: {},
            sitesLocationMissing: true,
            appConfigPath: path.join(base, 'app-config.json'),
            notifySitesListChanged(exceptWebContentsId) {
                notifications.push({
                    exceptWebContentsId,
                    sites: this.sites
                });
            },
            setSitesDir(sitesLocation) {
                this.sitesDir = sitesLocation;
                this.app.sitesDir = sitesLocation;
                this.appConfig.sitesLocation = sitesLocation;
            },
            loadSites() {
                reloads.push(this.sitesDir);

                if (!UtilsHelper.dirExists(this.sitesDir)) {
                    this.sitesLocationMissing = true;
                    return false;
                }

                this.sitesLocationMissing = false;
                this.sites = { location: this.sitesDir };
                return true;
            }
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

                if (name === '../helpers/app-files.js') {
                    return AppFiles;
                }

                if (name === '../helpers/utils.js') {
                    return UtilsHelper;
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
        console.log = originalLog;
        fs.removeSync(base);
    });

    function retry(data) {
        handlers.get('app-sites-location-retry')({
            sender: {
                id: senderId,
                send(channel, payload) {
                    replies.push({ channel, payload });
                }
            }
        }, data);
    }

    it('reports the missing folder and succeeds once it appears', function () {
        retry({ sitesLocation: '' });

        assert.equal(replies.length, 1);
        assert.equal(replies[0].channel, 'app-sites-location-retried');
        assert.equal(replies[0].payload.status, false);
        assert.equal(replies[0].payload.reason, 'location-missing');
        assert.equal(replies[0].payload.checkedLocation, missingLocation);
        assert.equal(application.sitesLocationMissing, true);
        assert.deepEqual(notifications, [
            {
                exceptWebContentsId: senderId,
                sites: {}
            }
        ]);

        fs.ensureDirSync(missingLocation);
        retry({ sitesLocation: '' });

        assert.equal(replies.length, 2);
        assert.equal(replies[1].payload.status, true);
        assert.equal(replies[1].payload.reason, null);
        assert.equal(replies[1].payload.sitesLocation, missingLocation);
        assert.deepEqual(replies[1].payload.sites, { location: missingLocation });
        assert.deepEqual(reloads, [missingLocation, missingLocation]);
        assert.equal(application.sitesLocationMissing, false);
        assert.equal(fs.readJsonSync(application.appConfigPath).sitesLocation, missingLocation);
        assert.deepEqual(notifications, [
            {
                exceptWebContentsId: senderId,
                sites: {}
            },
            {
                exceptWebContentsId: senderId,
                sites: { location: missingLocation }
            }
        ]);
    });

    it('switches to an existing folder, persists it and reloads websites', function () {
        const newLocation = path.join(base, 'other-sites');
        fs.ensureDirSync(newLocation);
        retry({ sitesLocation: newLocation });

        assert.equal(replies.length, 1);
        assert.equal(replies[0].payload.status, true);
        assert.equal(replies[0].payload.sitesLocation, newLocation);
        assert.equal(replies[0].payload.checkedLocation, newLocation);
        assert.deepEqual(replies[0].payload.sites, { location: newLocation });
        assert.equal(application.sitesDir, newLocation);
        assert.equal(application.app.sitesDir, newLocation);
        assert.equal(application.appConfig.sitesLocation, newLocation);
        assert.deepEqual(reloads, [newLocation]);
        assert.deepEqual(fs.readJsonSync(application.appConfigPath), {
            licenseAccepted: true,
            sitesLocation: newLocation
        });
        assert.deepEqual(notifications, [
            {
                exceptWebContentsId: senderId,
                sites: { location: newLocation }
            }
        ]);
    });

    it('refuses a missing folder without touching the current location', function () {
        const requestedLocation = path.join(base, 'does-not-exist');
        retry({ sitesLocation: requestedLocation });

        assert.equal(replies.length, 1);
        assert.equal(replies[0].payload.status, false);
        assert.equal(replies[0].payload.reason, 'location-missing');
        assert.equal(replies[0].payload.checkedLocation, requestedLocation);
        assert.equal(application.sitesDir, missingLocation);
        assert.equal(application.app.sitesDir, missingLocation);
        assert.deepEqual(reloads, []);
        assert.equal(fs.readJsonSync(application.appConfigPath).sitesLocation, missingLocation);
        assert.deepEqual(notifications, []);
    });

    it('treats a non-string location as a plain retry', function () {
        retry({ sitesLocation: 42 });
        retry();

        assert.equal(replies.length, 2);
        assert.deepEqual(reloads, [missingLocation, missingLocation]);
        assert.equal(replies[0].payload.checkedLocation, missingLocation);
        assert.equal(replies[1].payload.checkedLocation, missingLocation);
        assert.equal(application.sitesDir, missingLocation);
        assert.deepEqual(notifications, [
            {
                exceptWebContentsId: senderId,
                sites: {}
            },
            {
                exceptWebContentsId: senderId,
                sites: {}
            }
        ]);
    });

    it('restores the previous location when the config cannot be saved', function () {
        const newLocation = path.join(base, 'other-sites');
        fs.ensureDirSync(newLocation);
        application.appConfigPath = path.join(base, 'unwritable', 'app-config.json');
        retry({ sitesLocation: newLocation });

        assert.equal(replies.length, 1);
        assert.equal(replies[0].payload.status, false);
        assert.equal(replies[0].payload.reason, 'config-save-error');
        assert.equal(replies[0].payload.checkedLocation, newLocation);
        assert.equal(application.sitesDir, missingLocation);
        assert.equal(application.app.sitesDir, missingLocation);
        assert.equal(application.appConfig.sitesLocation, missingLocation);
        assert.deepEqual(reloads, []);
        assert.equal(fs.existsSync(application.appConfigPath), false);
        assert.deepEqual(notifications, []);
    });
});
