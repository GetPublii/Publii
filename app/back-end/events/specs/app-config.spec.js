const assert = require('node:assert/strict');
const fs = require('fs-extra');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const AppFiles = require('../../helpers/app-files.js');

describe('Website location settings IPC', function () {
    let base;
    let application;
    let handlers;
    let replies;
    let reloads;
    let closed;
    let originalLog;

    beforeEach(function () {
        base = fs.mkdtempSync(path.join(os.tmpdir(), 'publii-location-ipc-'));
        const source = path.join(base, 'source');
        fs.outputFileSync(path.join(source, 'demo', 'input', 'db.sqlite'), 'original');
        fs.ensureDirSync(path.join(base, 'destination'));
        handlers = new Map();
        replies = [];
        reloads = [];
        closed = 0;
        originalLog = console.log;
        console.log = () => {};
        application = {
            app: { sitesDir: source },
            appConfig: { sitesLocation: source },
            sitesDir: source,
            appConfigPath: path.join(base, 'app-config.json'),
            closeAllDbs() {
                closed++;
            },
            loadSites() {
                reloads.push(this.sitesDir);
                this.sites = { location: this.sitesDir };
            }
        };
        fs.writeJsonSync(application.appConfigPath, application.appConfig);
        const context = {
            module: { exports: {} },
            console,
            setTimeout(callback) {
                callback();
            },
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

    function save(config) {
        handlers.get('app-config-save')({
            sender: {
                send(channel, payload) {
                    replies.push({ channel, payload });
                }
            }
        }, config);
    }

    it('sends exactly one failure and reloads the original sites on a conflict', function () {
        const oldConfig = application.appConfig;
        const destination = path.join(base, 'destination');
        fs.outputFileSync(path.join(destination, 'demo', 'keep.txt'), 'existing');
        save({ sitesLocation: destination });

        assert.equal(closed, 1);
        assert.deepEqual(reloads, [oldConfig.sitesLocation]);
        assert.equal(application.appConfig, oldConfig);
        assert.equal(application.app.sitesDir, oldConfig.sitesLocation);
        assert.equal(replies.length, 1);
        assert.equal(replies[0].channel, 'app-config-saved');
        assert.equal(replies[0].payload.status, false);
        assert.equal(replies[0].payload.message, 'error-save');
        assert.equal(fs.readFileSync(path.join(destination, 'demo', 'keep.txt'), 'utf8'), 'existing');
    });

    for (const withoutCopying of [false, true]) {
        it('persists and reports a successful change with copying ' + !withoutCopying, function () {
            const original = application.sitesDir;
            const config = {
                sitesLocation: path.join(base, 'destination'),
                changeSitesLocationWithoutCopying: withoutCopying
            };
            save(config);

            assert.equal(application.appConfig, config);
            assert.equal(application.sitesDir, config.sitesLocation);
            assert.equal(application.app.sitesDir, config.sitesLocation);
            assert.deepEqual(reloads, [config.sitesLocation]);
            assert.deepEqual(fs.readJsonSync(application.appConfigPath), config);
            assert.equal(replies.length, 1);
            assert.equal(replies[0].payload.status, true);
            assert.equal(replies[0].payload.message, 'success-save');
            assert.equal(fs.existsSync(path.join(original, 'demo')), withoutCopying);
            assert.equal(fs.existsSync(path.join(config.sitesLocation, 'demo')), !withoutCopying);
        });
    }

    it('reports a settings save failure without switching the active directory', function () {
        const original = application.sitesDir;
        application.appConfigPath = path.join(base, 'missing', 'app-config.json');
        save({ sitesLocation: path.join(base, 'destination') });

        assert.equal(application.sitesDir, original);
        assert.equal(application.app.sitesDir, original);
        assert.equal(replies.length, 1);
        assert.equal(replies[0].payload.status, false);
        assert.deepEqual(reloads, [original]);
        assert.equal(fs.readFileSync(path.join(original, 'demo', 'input', 'db.sqlite'), 'utf8'), 'original');
        assert.deepEqual(fs.readdirSync(path.join(base, 'destination')), []);
    });
});
