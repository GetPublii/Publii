const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function createHarness() {
    const source = fs.readFileSync(path.join(__dirname, '../AppSettings.vue'), 'utf8');
    const start = source.indexOf('        saved (newSettings, data) {');
    const end = source.indexOf('        getAppTheme () {', start);
    assert.ok(start >= 0 && end > start);
    const commits = [];
    const events = [];
    const sends = [];
    const methods = vm.runInNewContext('({' + source.slice(start, end) + '})', {
        mainProcessAPI: {
            send(...args) {
                sends.push(args);
            }
        }
    });
    const component = {
        $store: {
            commit(...args) {
                commits.push(args);
            }
        },
        $bus: {
            $emit(...args) {
                events.push(args);
            }
        },
        $t: key => key,
        theme: 'system',
        buttonsLocked: true
    };

    return { component, commits, events, sends, saved: methods.saved };
}

describe('App settings save result', function () {
    it('keeps the active location and settings after a failed save', function () {
        const harness = createHarness();
        harness.saved.call(harness.component, {
            sitesLocation: '/failed-destination',
            backupsLocation: '/failed-backups'
        }, { status: false });

        assert.equal(harness.commits.some(([name]) => name === 'setSiteDir' || name === 'setAppConfig'), false);
        assert.equal(harness.sends.length, 0);
        assert.equal(harness.events.some(([name]) => name === 'app-settings-saved'), false);
        assert.equal(harness.events.find(([name]) => name === 'message-display')[1].type, 'warning');
        assert.equal(harness.component.buttonsLocked, false);
    });

    it('updates the active location and notifies lists after a successful save', function () {
        const harness = createHarness();
        const config = {
            sitesLocation: '/new-sites',
            backupsLocation: '/backups'
        };
        harness.saved.call(harness.component, config, { status: true });

        assert.deepEqual(harness.commits.find(([name]) => name === 'setSiteDir'), ['setSiteDir', config.sitesLocation]);
        assert.equal(harness.commits.find(([name]) => name === 'setAppConfig')[1], config);
        assert.deepEqual(harness.sends, [['app-backup-set-location', config.backupsLocation]]);
        assert.equal(harness.events.find(([name]) => name === 'app-settings-saved')[1], config);
        assert.equal(harness.events.find(([name]) => name === 'message-display')[1].type, 'success');
        assert.equal(harness.component.buttonsLocked, false);
    });
});
