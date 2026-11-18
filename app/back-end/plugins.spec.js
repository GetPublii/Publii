const assert = require('assert');
const fs = require('fs-extra');
const os = require('os');
const path = require('path');
const Plugins = require('./plugins.js');

describe('Plugins', function () {
    let tempDir;
    let appDir;
    let sitesDir;
    let originalConsoleLog;

    beforeEach(function () {
        originalConsoleLog = console.log;
        console.log = function () {};
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'publii-plugins-'));
        appDir = path.join(tempDir, 'app');
        sitesDir = path.join(tempDir, 'sites');
        fs.ensureDirSync(path.join(appDir, 'plugins', 'removed-plugin'));
        fs.ensureDirSync(path.join(appDir, 'plugins', 'retained-plugin'));
        fs.ensureDirSync(sitesDir);
    });

    afterEach(function () {
        console.log = originalConsoleLog;
        fs.removeSync(tempDir);
    });

    function writeSiteConfig (siteName, config) {
        let configPath = path.join(sitesDir, siteName, 'input', 'config', 'site.plugins.json');
        fs.ensureDirSync(path.dirname(configPath));
        fs.writeFileSync(configPath, JSON.stringify(config, null, 4));
        return configPath;
    }

    it('removes an uninstalled plugin from every site config immediately', function () {
        let activeConfigPath = writeSiteConfig('active-site', {
            'removed-plugin': true,
            'retained-plugin': true
        });
        let inactiveConfigPath = writeSiteConfig('inactive-site', {
            'removed-plugin': false,
            'retained-plugin': false
        });
        let unrelatedConfigPath = writeSiteConfig('unrelated-site', {
            'retained-plugin': true
        });
        let plugins = new Plugins(appDir, sitesDir);

        plugins.removePlugin('removed-plugin');

        assert.strictEqual(fs.existsSync(path.join(appDir, 'plugins', 'removed-plugin')), false);
        assert.deepStrictEqual(fs.readJsonSync(activeConfigPath), {
            'retained-plugin': true
        });
        assert.deepStrictEqual(fs.readJsonSync(inactiveConfigPath), {
            'retained-plugin': false
        });
        assert.deepStrictEqual(fs.readJsonSync(unrelatedConfigPath), {
            'retained-plugin': true
        });
    });

    it('leaves an invalid site config untouched while cleaning valid sites', function () {
        let invalidConfigPath = path.join(sitesDir, 'invalid-site', 'input', 'config', 'site.plugins.json');
        fs.ensureDirSync(path.dirname(invalidConfigPath));
        fs.writeFileSync(invalidConfigPath, '{invalid json');
        let validConfigPath = writeSiteConfig('valid-site', {
            'removed-plugin': true
        });
        let plugins = new Plugins(appDir, sitesDir);

        plugins.removePlugin('removed-plugin');

        assert.strictEqual(fs.readFileSync(invalidConfigPath, 'utf8'), '{invalid json');
        assert.strictEqual(fs.readJsonSync(validConfigPath)['removed-plugin'], undefined);
    });
});
