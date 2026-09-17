const assert = require('node:assert/strict');
const fs = require('fs-extra');
const path = require('node:path');
const os = require('node:os');
const vm = require('node:vm');
const defaultConfig = require('../../../config/AST.currentSite.config.js');

async function saveSettings(previousAdvanced, nextAdvanced) {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'publii-conversion-config-'));
    const handlers = new Map();
    const replies = [];
    const config = JSON.parse(JSON.stringify(defaultConfig));
    config.name = 'test-site';
    config.theme = 'test-theme';
    config.advanced = previousAdvanced;
    const configPath = path.join(directory, 'test-site/input/config/site.config.json');
    fs.outputJsonSync(configPath, config);
    const application = {
        sitesDir: directory,
        sites: { 'test-site': config },
        notifySitesListChanged() {}
    };
    const context = {
        module: { exports: {} },
        require(name) {
            if (name === 'electron') {
                return {
                    ipcMain: {
                        on(channel, callback) {
                            handlers.set(channel, callback);
                        }
                    }
                };
            }

            if (name === '../themes.js') {
                return class Themes {};
            }

            if (name === '../helpers/file.js') {
                return fs;
            }

            if (name === './../helpers/slug') {
                return value => value;
            }

            if (name === 'fs-extra' || name === 'path') {
                return require(name);
            }

            return {};
        }
    };

    try {
        vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../site.js'), 'utf8'), context);
        new context.module.exports(application);
        await handlers.get('app-site-config-save')({
            sender: {
                id: 1,
                send(channel, result) {
                    replies.push(result);
                }
            }
        }, {
            site: 'test-site',
            source: 'settings',
            settings: { ...config, theme: '', advanced: nextAdvanced }
        });
        assert.equal(replies[0].status, true);
        return replies[0].thumbnailsRegenerateRequired;
    } finally {
        fs.removeSync(directory);
    }
}

describe('Image conversion regeneration notice', function () {
    it('does not ask for regeneration merely because AVIF defaults were added to an existing site', async function () {
        const previous = JSON.parse(JSON.stringify(defaultConfig.advanced));
        delete previous.forceAvif;
        delete previous.avifLossless;
        delete previous.avifEffort;
        previous.forceWebp = true;
        const next = { ...defaultConfig.advanced, ...previous };
        assert.equal(await saveSettings(previous, next), false);
    });

    for (const [key, value] of [
        ['forceAvif', true],
        ['imagesQuality', 72],
        ['avifLossless', true],
        ['avifEffort', 6]
    ]) {
        it(`asks for regeneration when ${key} changes`, async function () {
            const previous = JSON.parse(JSON.stringify(defaultConfig.advanced));
            const next = { ...previous, [key]: value };
            assert.equal(await saveSettings(previous, next), true);
        });
    }

    it('treats equivalent numeric effort values as unchanged', async function () {
        const previous = JSON.parse(JSON.stringify(defaultConfig.advanced));
        const next = { ...previous, avifEffort: '4' };
        assert.equal(await saveSettings(previous, next), false);
    });
});
