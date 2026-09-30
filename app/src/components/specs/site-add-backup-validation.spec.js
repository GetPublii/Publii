const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const Vue = require('vue');
const compiler = require('vue-template-compiler');
const translations = require('../../../default-files/default-languages/en-gb/translations.json');

function descendants(node) {
    return [node, ...(node.children || []).flatMap(descendants)];
}

function fixture() {
    const sends = [];
    const events = [];
    const listeners = new Map();
    const source = fs.readFileSync(path.join(__dirname, '../SiteAddForm.vue'), 'utf8');
    const parsed = compiler.parseComponent(source);
    const compiled = compiler.compile(parsed.template.content);
    assert.deepEqual(compiled.errors, []);
    const context = {
        module: { exports: {} },
        GoToLastOpenedWebsite: {},
        WorkspaceAccentPicker: {},
        Utils: {},
        mainProcessAPI: {
            getPathForFile: file => file.path,
            normalizePath: filePath => filePath,
            receiveOnce: (channel, callback) => listeners.set(channel, callback),
            send: (channel, payload) => {
                if (channel === 'app-site-check-website-to-restore') {
                    assert.ok(listeners.has('app-site-backup-checked'));
                }

                sends.push({ channel, payload });
            }
        }
    };
    vm.runInNewContext(
        parsed.script.content.replace(/^import .*;\s*$/gm, '').replace('export default', 'module.exports ='),
        context
    );
    const options = context.module.exports;
    const instance = new Vue({
        data: options.data,
        computed: options.computed,
        methods: {
            ...options.methods,
            getCurrentWorkspaceAccent: () => 'indigo',
            $t: key => key.split('.').reduce((value, part) => value && value[part], translations) || key
        },
        render: new Function(compiled.render),
        staticRenderFns: compiled.staticRenderFns.map(code => new Function(code))
    });
    instance.$store = { getters: { siteNames: [] } };
    instance.$bus = { $emit: (...args) => events.push(args) };
    instance.$refs.input = { value: 'selected.tar', files: [{ path: '/tmp/selected.tar' }] };
    instance.$refs['wordpress-input'] = { value: 'selected.xml' };
    return {
        instance,
        sends,
        events,
        reply: (data, channel = 'app-site-backup-checked') => {
            const callback = listeners.get(channel);
            listeners.delete(channel);
            callback(data);
        }
    };
}

describe('Add website backup validation', () => {
    const errors = {
        'unsupported-format': 'unsupportedFormat',
        'unpack-error': 'unpackError',
        'invalid-backup-content': 'invalidBackupContent',
        'invalid-site-data': 'invalidSiteData'
    };

    for (const [type, messageKey] of Object.entries(errors)) {
        it(type + ': shows an accessible inline error and releases the uploader', async () => {
            const { instance, events, reply } = fixture();
            await instance.uploadBackup('/tmp/selected.tar');
            assert.equal(instance.restoreInProgress, true);
            reply({ status: 'error', type });
            await Vue.nextTick();
            assert.equal(instance.restoreInProgress, false);
            assert.equal(instance.$refs.input.value, '');
            assert.equal(events.length, 0);

            const nodes = descendants(instance._render());
            const error = nodes.find(node => node.data && node.data.attrs &&
                node.data.attrs.id === 'site-create-backup-file-error');
            assert.equal(error.data.attrs.role, 'alert');
            assert.equal(error.children[0].text.trim(), translations.site.restoreFromBackup[messageKey]);
            const controls = nodes.filter(node => node.data && node.data.attrs &&
                node.data.attrs['aria-describedby'] === 'site-create-backup-file-error');
            assert.equal(controls.length, 2);
            assert.ok(controls.every(node => node.data.attrs.disabled === false));
            instance.$destroy();
        });
    }

    it('also releases the loader for missing files and unrecognized failure responses', async () => {
        for (const response of [null, undefined, { status: false }, { status: 'error', type: 'unknown' }]) {
            const { instance, events, reply } = fixture();
            await instance.uploadBackup('/tmp/missing.tar');
            reply(response);
            await Vue.nextTick();
            assert.equal(instance.restoreInProgress, false);
            assert.equal(instance.backupError, translations.site.restoreFromBackup.restoreFailed);
            assert.equal(events.length, 0);
            instance.$destroy();
        }
    });

    it('clears the old error when retrying the same file through the picker after a drop', async () => {
        const { instance, sends, reply } = fixture();
        await instance.uploadBackup({ dataTransfer: { files: [{ path: '/tmp/selected.tar' }] } });
        reply({ status: 'error', type: 'unpack-error' });
        await Vue.nextTick();
        assert.equal(instance.$refs.input.value, '');
        assert.notEqual(instance.backupError, '');

        await instance.valueChanged({ target: instance.$refs.input });
        assert.equal(instance.backupError, '');
        assert.equal(instance.restoreInProgress, true);
        assert.equal(sends.length, 2);
        assert.equal(sends[1].payload.backupPath, '/tmp/selected.tar');
        assert.equal(descendants(instance._render()).some(node => node.data && node.data.attrs &&
            node.data.attrs.id === 'site-create-backup-file-error'), false);
        instance.$destroy();
    });

    it('keeps the website-name confirmation after a valid backup', async () => {
        const { instance, events, reply } = fixture();
        await instance.uploadBackup('/tmp/valid.tar');
        reply({ status: 'success', data: { displayName: 'Imported website' } });
        assert.equal(instance.backupError, '');
        assert.equal(events.length, 1);
        assert.equal(events[0][0], 'confirm-display');
        assert.equal(events[0][1].hasInput, true);
        assert.equal(events[0][1].defaultText, 'Imported website');
        events[0][1].cancelClick();
        assert.equal(instance.restoreInProgress, false);
        instance.$destroy();
    });

    it('keeps WordPress file validation inline', async () => {
        const { instance, events, reply } = fixture();
        instance.analyzeWordPressFile('/tmp/invalid.xml');
        reply({ status: 'error' }, 'app-wxr-checked');
        await Vue.nextTick();
        assert.equal(instance.wordpressCheckInProgress, false);
        assert.equal(instance.wordpressError, translations.tools.wpImport.invalidWXRFile);
        assert.equal(instance.$refs['wordpress-input'].value, '');
        assert.equal(events.length, 0);
        instance.$destroy();
    });
});
