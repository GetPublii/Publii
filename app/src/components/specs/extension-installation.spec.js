const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const compiler = require('vue-template-compiler');

const components = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(components, 'mixins/ExtensionInstallation.js'), 'utf8');

function setup () {
    const timers = new Map();
    const listeners = new Map();
    const sent = [];
    const completed = [];
    const messages = [];
    let now = 0;
    let timerID = 0;
    const api = {
        getPathForFile: async file => file.path,
        normalizePath: async file => file,
        invoke: async () => ({ canceled: false, filePaths: ['/tmp/package.zip'] }),
        receiveOnce (channel, listener) {
            listeners.set(channel, listener);
        },
        send (channel, payload) {
            assert.ok(listeners.has(channel + 'ed'), 'Register the response before sending');
            sent.push({ channel, payload });
        }
    };
    const context = {
        module: { exports: {} },
        mainProcessAPI: api,
        setTimeout (callback, delay) {
            timers.set(++timerID, { callback, time: now + delay });
            return timerID;
        },
        clearTimeout: id => timers.delete(id)
    };
    vm.runInNewContext(source.replace('export default', 'module.exports ='), context);
    const mixin = context.module.exports;
    const instance = {
        ...mixin.data(),
        $t: key => key,
        $bus: {
            $emit: (...args) => messages.push(args)
        }
    };

    for (const [name, method] of Object.entries(mixin.methods)) {
        instance[name] = method.bind(instance);
    }
    for (const kind of ['Theme', 'Plugin', 'Language']) {
        instance['uploaded' + kind] = data => completed.push({ kind, data });
    }

    return {
        instance,
        api,
        sent,
        completed,
        messages,
        timers,
        respond (kind, data) {
            const channel = 'app-' + kind + '-uploaded';
            const listener = listeners.get(channel);
            listeners.delete(channel);
            listener(data);
        },
        destroy () {
            mixin.beforeDestroy.call(instance);
        },
        advance (duration) {
            now += duration;
            for (const [id, timer] of timers) {
                if (timer.time <= now) {
                    timers.delete(id);
                    timer.callback();
                }
            }
        }
    };
}

describe('Extension installation feedback', () => {
    for (const kind of ['theme', 'plugin', 'language']) {
        it(`${kind}: delays the spinner, prevents duplicate drops and finishes on success`, async () => {
            const test = setup();
            const instance = test.instance;
            await instance.installDroppedExtension(kind, { path: '/tmp/first.zip' });
            assert.equal(instance.installingExtension, true);
            test.advance(199);
            assert.equal(instance.installationLoading, false);
            test.advance(1);
            assert.equal(instance.installationLoading, true);
            await instance.installDroppedExtension(kind, { path: '/tmp/second.zip' });
            await instance.pickExtensionFile(kind);
            assert.equal(test.sent.length, 1);
            assert.equal(test.sent[0].payload.sourcePath, '/tmp/first.zip');

            const result = { status: 'added' };
            test.respond(kind, result);
            assert.equal(instance.installingExtension, false);
            assert.equal(instance.installationLoading, false);
            assert.equal(test.timers.size, 0);
            assert.equal(test.completed[0].data, result);
        });

        it(`${kind}: completes fast updates without flashing a spinner`, async () => {
            const test = setup();
            await test.instance.pickExtensionFile(kind);
            test.advance(50);
            test.respond(kind, { status: 'updated' });
            test.advance(1000);
            assert.equal(test.instance.installationLoading, false);
            assert.equal(test.completed[0].data.status, 'updated');
        });

        it(`${kind}: closes feedback on wrong format and allows retry`, async () => {
            const test = setup();
            await test.instance.installDroppedExtension(kind, { path: '/tmp/wrong.zip' });
            test.advance(200);
            test.respond(kind, { status: 'wrong-format' });
            assert.equal(test.instance.installingExtension, false);
            assert.equal(test.instance.installationLoading, false);
            assert.equal(test.completed[0].data.status, 'wrong-format');
            await test.instance.installDroppedExtension(kind, { path: '/tmp/retry.zip' });
            assert.equal(test.sent.length, 2);
        });

        it(`${kind}: reports path errors and cancels delayed feedback`, async () => {
            const test = setup();
            test.api.normalizePath = async () => {
                throw new Error('Cannot resolve path');
            };
            await test.instance.installDroppedExtension(kind, { path: '/tmp/package.zip' });
            test.advance(1000);
            assert.equal(test.instance.installingExtension, false);
            assert.equal(test.instance.installationLoading, false);
            assert.equal(test.sent.length, 0);
            assert.equal(test.messages.length, 1);
            assert.equal(test.messages[0][1].type, 'warning');
        });
    }

    it('ignores an empty drop and a canceled picker', async () => {
        const test = setup();
        await test.instance.installDroppedExtension('theme');
        test.api.invoke = async () => ({ canceled: true, filePaths: [] });
        await test.instance.pickExtensionFile('theme');
        assert.equal(test.instance.installingExtension, false);
        assert.equal(test.instance.installationPickerOpen, false);
        assert.equal(test.sent.length, 0);
        assert.equal(test.messages.length, 0);
    });

    it('prevents a second picker or a drop while the file dialog is open', async () => {
        const test = setup();
        let resolvePicker;
        let pickerCalls = 0;
        test.api.invoke = () => {
            pickerCalls++;
            return new Promise(resolve => {
                resolvePicker = resolve;
            });
        };
        const pending = test.instance.pickExtensionFile('plugin');
        await test.instance.pickExtensionFile('plugin');
        await test.instance.installDroppedExtension('plugin', { path: '/tmp/ignored.zip' });
        assert.equal(pickerCalls, 1);
        assert.equal(test.sent.length, 0);
        resolvePicker({ canceled: false, filePaths: ['/tmp/chosen.zip'] });
        await pending;
        assert.equal(test.sent[0].payload.sourcePath, '/tmp/chosen.zip');
    });

    it('ignores late responses after a send failure and allows another attempt', async () => {
        const test = setup();
        const send = test.api.send;
        test.api.send = () => {
            throw new Error('IPC unavailable');
        };
        await test.instance.installExtension('theme', () => '/tmp/failed.zip');
        test.respond('theme', { status: 'added' });
        assert.equal(test.completed.length, 0);
        assert.equal(test.timers.size, 0);
        test.api.send = send;
        await test.instance.installExtension('theme', () => '/tmp/retry.zip');
        assert.equal(test.sent.length, 1);
    });

    it('cleans up on navigation before file resolution and after sending', async () => {
        const test = setup();
        let resolvePath;
        const pending = test.instance.installExtension('language', () => new Promise(resolve => {
            resolvePath = resolve;
        }));
        test.destroy();
        resolvePath('/tmp/package.zip');
        await pending;
        test.advance(1000);
        assert.equal(test.sent.length, 0);
        assert.equal(test.instance.installationLoading, false);

        const sent = setup();
        await sent.instance.installExtension('language', () => '/tmp/package.zip');
        sent.destroy();
        sent.respond('language', { status: 'added' });
        assert.equal(sent.completed.length, 0);
        assert.equal(sent.timers.size, 0);
    });

    it('compiles all installation surfaces and the shared overlay', () => {
        for (const file of [
            'AppThemes.vue',
            'AppPlugins.vue',
            'AppLanguages.vue',
            'ThemesList.vue',
            'PluginsList.vue',
            'LanguagesList.vue',
            'basic-elements/Overlay.vue'
        ]) {
            const component = compiler.parseComponent(fs.readFileSync(path.join(components, file), 'utf8'));
            assert.deepEqual(compiler.compile(component.template.content).errors, [], file);
        }
    });
});
