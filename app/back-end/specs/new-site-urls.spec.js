const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const defaultSiteConfig = require('../../config/AST.currentSite.config.js');
const UtilsHelper = require('../helpers/utils.js');
const Utils = require('../../src/helpers/utils.js');

function loadSite() {
    const filename = path.join(__dirname, '../site.js');
    const siteRequire = createRequire(filename);
    const context = {
        module: { exports: {} },
        require(name) {
            return name === 'electron' ? { shell: {} } : siteRequire(name);
        },
        console
    };

    vm.runInNewContext(fs.readFileSync(filename, 'utf8'), context);
    return context.module.exports;
}

function loadCreationForm() {
    const source = fs.readFileSync(path.join(__dirname, '../../src/components/SiteAddForm.vue'), 'utf8');
    const script = source.match(/<script>([\s\S]*?)<\/script>/)[1];
    const context = {
        module: { exports: {} },
        defaultSiteConfig,
        Utils,
        GoToLastOpenedWebsite: {},
        WorkspaceAccentPicker: {},
        normalizeWorkspaceAccent: value => value
    };

    vm.runInNewContext(
        script.replace(/^import .*;\s*$/gm, '').replace('export default', 'module.exports ='),
        context
    );

    return context.module.exports;
}

function resolveConfig(config) {
    return UtilsHelper.mergeObjects(JSON.parse(JSON.stringify(defaultSiteConfig)), config);
}

describe('Pretty URLs for new websites', function () {
    const Site = loadSite();
    const form = loadCreationForm();
    let directory;
    let application;

    beforeEach(function () {
        directory = fs.mkdtempSync(path.join(os.tmpdir(), 'publii-new-site-urls-'));
        application = {
            appDir: directory,
            sitesDir: directory,
            addSite() {}
        };
    });

    afterEach(function () {
        fs.rmSync(directory, { recursive: true, force: true });
    });

    for (const method of ['setBaseConfig', 'setWordPressBaseConfig']) {
        it(`enables Pretty URLs in ${method} without changing legacy defaults`, function () {
            const originalDefaults = JSON.stringify(defaultSiteConfig);
            const instance = {
                defaultSiteConfig: form.computed.defaultSiteConfig(),
                siteName: 'New website',
                wordpressSiteName: 'Imported website',
                wordpressStats: { site: {} },
                workspaceAccent: 'default',
                $root: { getCurrentAppAppearance: () => 'publii' },
                $refs: {
                    'logo-creator': { getActiveIcon: () => 'book' },
                    'wordpress-logo-creator': { getActiveIcon: () => 'book' }
                }
            };
            const config = form.methods[method].call(instance);

            assert.equal(config.advanced.urls.cleanUrls, true);
            assert.equal(config.advanced.urls.addIndex, false);
            assert.equal(config.advanced.urls.tagsPrefix, 'tags');
            assert.equal(JSON.stringify(defaultSiteConfig), originalDefaults);
        });
    }

    it('persists Pretty URLs before the first settings save and keeps them when reloaded', function () {
        const site = new Site(application, {
            name: 'new-website',
            displayName: 'New website',
            logo: { icon: 'book' }
        });
        const configDirectory = path.join(site.siteDir, 'input', 'config');
        fs.mkdirSync(configDirectory, { recursive: true });
        site.createConfigFiles();

        const saved = JSON.parse(fs.readFileSync(path.join(configDirectory, 'site.config.json'), 'utf8'));
        assert.equal(saved.advanced.urls.cleanUrls, true);
        assert.equal(resolveConfig(saved).advanced.urls.cleanUrls, true);
        assert.equal(defaultSiteConfig.advanced.urls.cleanUrls, false);
    });

    for (const value of [false, true, undefined]) {
        const label = value === undefined ? 'missing setting' : String(value);

        it(`preserves ${label} when loading or cloning an existing website`, function () {
            const saved = {
                name: 'existing',
                displayName: 'Existing website',
                advanced: { urls: {} }
            };

            if (value !== undefined) {
                saved.advanced.urls.cleanUrls = value;
            }

            const expected = value === true;
            const configDirectory = path.join(directory, 'existing', 'input', 'config');
            const configPath = path.join(configDirectory, 'site.config.json');
            const original = JSON.stringify(saved);
            fs.mkdirSync(configDirectory, { recursive: true });
            fs.writeFileSync(configPath, original);

            assert.equal(resolveConfig(saved).advanced.urls.cleanUrls, expected);

            const clone = Site.clone(application, 'existing', 'Cloned website');
            assert.equal(clone.siteConfig.advanced.urls.cleanUrls, value);
            assert.equal(resolveConfig(clone.siteConfig).advanced.urls.cleanUrls, expected);
            assert.equal(fs.readFileSync(configPath, 'utf8'), original);
        });
    }

    it('keeps Pretty URLs disabled for legacy websites without advanced settings', function () {
        const config = resolveConfig({ name: 'legacy' });
        assert.equal(config.advanced.urls.cleanUrls, false);
    });
});
