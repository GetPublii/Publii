const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function componentOptions(file, globals) {
    const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
    const script = source.match(/<script>([\s\S]*?)<\/script>/)[1];
    const context = { ...globals, module: { exports: {} } };

    vm.runInNewContext(
        script.replace(/^import .*;\s*$/gm, '').replace('export default', 'module.exports ='),
        context
    );

    return context.module.exports;
}

function bindMethods(options, instance) {
    for (const [name, method] of Object.entries(options.methods)) {
        instance[name] = method.bind(instance);
    }

    return instance;
}

function setup() {
    const events = [];
    const requests = [];
    const commits = [];
    const routes = [];
    const storage = [];
    const listeners = new Map();
    const bodyClasses = new Set();
    const bus = {
        $on(name, callback) {
            listeners.set(name, callback);
        },
        $emit(name, payload) {
            events.push([name, payload]);

            if (listeners.has(name)) {
                listeners.get(name)(payload);
            }
        }
    };
    let reply;
    let focusCount = 0;
    const input = {
        content: '',
        $el: {
            querySelector() {
                return { focus: () => focusCount++ };
            }
        }
    };
    const confirmOptions = componentOptions('basic-elements/Confirm.vue', {
        document: {
            activeElement: null,
            body: {
                classList: {
                    add: value => bodyClasses.add(value),
                    remove: value => bodyClasses.delete(value)
                },
                addEventListener() {}
            }
        },
        setTimeout: callback => callback()
    });
    const dialog = bindMethods(confirmOptions, {
        ...confirmOptions.data.call({ $t: key => key }),
        $t: key => key,
        $bus: bus,
        $refs: { input }
    });
    confirmOptions.mounted.call(dialog);

    const siteOptions = componentOptions('SitesListItem.vue', {
        mainProcessAPI: {
            receiveOnce(channel, callback) {
                assert.equal(channel, 'app-site-cloned');
                reply = callback;
            },
            send(channel, payload) {
                assert.equal(typeof reply, 'function', 'Register the completion handler before sending');
                requests.push([channel, payload]);
            }
        },
        window: {
            localStorage: { setItem: (...args) => storage.push(args) }
        }
    });
    const item = bindMethods(siteOptions, {
        ...siteOptions.data(),
        site: 'source',
        duplicateInProgress: false,
        $t: key => key,
        $bus: bus,
        $router: { push: route => routes.push(route) },
        $store: {
            state: {
                sites: {
                    source: { displayName: 'Original' },
                    other: { displayName: 'Existing' }
                }
            },
            commit: (...args) => commits.push(args)
        }
    });
    item.askForClone();

    return {
        item,
        dialog,
        input,
        events,
        requests,
        commits,
        routes,
        storage,
        bodyClasses,
        focusCount: () => focusCount,
        complete: data => reply(data)
    };
}

describe('Website clone name validation', () => {
    for (const [name, error] of [
        ['', 'site.websiteNameRequired'],
        [' \t\n ', 'site.websiteNameRequired'],
        ['Original', 'site.websiteNameExists'],
        ['Existing', 'site.websiteNameExists'],
        ['  Existing  ', 'site.websiteNameExists']
    ]) {
        it(`keeps the form and entered name after rejecting ${JSON.stringify(name)}`, () => {
            const test = setup();
            test.input.content = name;
            const previousFocusCount = test.focusCount();

            assert.equal(test.dialog.onOk(), false);
            assert.equal(test.dialog.isVisible, true);
            assert.equal(test.input.content, name);
            assert.equal(test.dialog.inputError, error);
            assert.equal(test.focusCount(), previousFocusCount + 1);
            assert.equal(test.bodyClasses.has('has-popup-visible'), true);
            assert.equal(test.item.isDuplicating, false);
            assert.equal(test.requests.length, 0);
            assert.equal(test.events.some(([event]) => event === 'alert-display'), false);
        });
    }

    it('allows correcting the name and submitting with Enter without reopening the form', () => {
        const test = setup();
        test.input.content = 'Existing';
        test.dialog.onEnterKey();
        assert.equal(test.dialog.isVisible, true);

        test.input.content = '  New website  ';
        test.dialog.onEnterKey();

        assert.equal(test.dialog.isVisible, false);
        assert.equal(test.item.isDuplicating, true);
        assert.equal(test.requests.length, 1);
        assert.equal(test.requests[0][0], 'app-site-clone');
        assert.equal(test.requests[0][1].siteName, 'New website');
        assert.equal(test.requests[0][1].catalogName, 'source');
        assert.equal(test.events.filter(([event]) => event === 'confirm-display').length, 1);
        assert.equal(test.bodyClasses.has('has-popup-visible'), false);

        test.item.cloneWebsite('Another name');
        assert.equal(test.requests.length, 1);

        const config = { name: 'new-website', displayName: 'New website' };
        test.complete({ siteName: 'New website', siteCatalog: 'new-website', siteConfig: config });

        assert.equal(test.item.isDuplicating, false);
        assert.equal(test.commits[0][0], 'cloneWebsite');
        assert.equal(test.commits[0][1].newSiteConfig, config);
        assert.deepEqual(test.routes, ['/site/new-website']);
        assert.deepEqual(test.storage, [['publii-last-opened-website', 'new-website']]);
        assert.deepEqual(
            test.events.filter(([event]) => event === 'sites-list-duplicate-in-progress'),
            [['sites-list-duplicate-in-progress', true], ['sites-list-duplicate-in-progress', false]]
        );
        assert.equal(test.events.some(([event]) => event === 'sites-popup-hide'), true);
    });

    for (const cancelWithKeyboard of [false, true]) {
        it(`cancels an invalid form using ${cancelWithKeyboard ? 'Escape' : 'Cancel'} without copying`, () => {
            const test = setup();
            test.input.content = 'Original';
            test.dialog.onOk();

            if (cancelWithKeyboard) {
                test.dialog.onDocumentKeyDown({ key: 'Escape', preventDefault() {} });
            } else {
                test.dialog.onCancel();
            }

            assert.equal(test.dialog.isVisible, false);
            assert.equal(test.item.isDuplicating, false);
            assert.equal(test.requests.length, 0);
            assert.equal(test.bodyClasses.has('has-popup-visible'), false);

            test.item.askForClone();
            assert.equal(test.dialog.isVisible, true);
            assert.equal(test.dialog.inputError, '');
        });
    }

    it('checks the latest site list when submitting and handles padded existing names', () => {
        const test = setup();
        test.item.$store.state.sites.latest = { displayName: ' New arrival ' };
        test.input.content = 'New arrival';

        assert.equal(test.dialog.onOk(), false);
        assert.equal(test.dialog.inputError, 'site.websiteNameExists');
        assert.equal(test.requests.length, 0);
    });

    it('does not submit invalid names directly or start a second copy while the list is busy', () => {
        const test = setup();
        test.item.cloneWebsite(' ');
        test.item.cloneWebsite('Original');
        assert.equal(test.requests.length, 0);

        test.item.duplicateInProgress = true;
        test.item.cloneWebsite('New website');
        test.item.askForClone();
        assert.equal(test.requests.length, 0);
        assert.equal(test.events.filter(([event]) => event === 'confirm-display').length, 1);
    });
});
