const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const Vue = require('vue');

function loadOptions (file, globals) {
    const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
    const script = source.match(/<script>([\s\S]*?)<\/script>/)[1];
    const context = {
        ...globals,
        module: { exports: {} }
    };

    vm.runInNewContext(
        script.replace(/^import[^\n]+\n/gm, '').replace('export default', 'module.exports ='),
        context
    );

    return context.module.exports;
}

function createHarness (componentName, currentSiteName, siteNames, storage) {
    const routes = [];
    const events = [];
    const mixin = loadOptions('mixins/GoToLastOpenedWebsite.vue', {
        localStorage: storage
    });
    const options = componentName ? loadOptions(componentName + '.vue', {
        GoToLastOpenedWebsite: mixin,
        ExtensionInstallation: {},
        ThemeUpload: {},
        ThemesList: {},
        LanguagesList: {},
        PluginsList: {},
        localStorage: storage
    }) : mixin;
    const methods = Vue.extend(options).options.methods;
    const component = {
        $store: {
            state: {
                currentSite: {
                    config: { name: currentSiteName }
                },
                sites: Object.fromEntries(siteNames.map(name => [name, { name }]))
            }
        },
        $router: {
            push (route) {
                routes.push(route);
                return Promise.resolve();
            }
        },
        $bus: {
            $emit (eventName) {
                events.push(eventName);
            }
        },
        $nextTick (callback) {
            callback();
        }
    };

    return {
        routes,
        events,
        goBack: () => methods.goBack.call(component)
    };
}

describe('Go back navigation in multiple windows', function () {
    const views = [
        'AppSettings',
        'AppThemes',
        'AppLanguages',
        'AppPlugins',
        null
    ];

    for (const view of views) {
        describe(view || 'shared navigation mixin', function () {
            it('returns each window to its own website despite shared recent-site changes', async function () {
                const siteNames = ['first-site', 'second-site', 'third-site'];
                let lastOpened = 'first-site';
                const storage = {
                    getItem: () => lastOpened
                };
                const windows = siteNames.map(name => createHarness(view, name, siteNames, storage));

                for (const recentSite of siteNames) {
                    lastOpened = recentSite;

                    for (const [index, window] of windows.entries()) {
                        await window.goBack();

                        assert.equal(window.routes.at(-1), '/site/' + siteNames[index] + '/posts/');
                        assert.deepEqual(window.events, []);
                    }
                }
            });

            it('shows the site picker when this window has no active website', async function () {
                const harness = createHarness(view, undefined, ['other-window-site'], {
                    getItem: () => 'other-window-site'
                });

                await harness.goBack();

                assert.deepEqual(harness.routes, ['/site/!/posts/']);
                assert.deepEqual(harness.events, ['sites-popup-show']);
            });

            it('shows the site picker when the active website is no longer available', async function () {
                const harness = createHarness(view, 'removed-site', ['other-window-site'], {
                    getItem: () => 'other-window-site'
                });

                await harness.goBack();

                assert.deepEqual(harness.routes, ['/site/!/posts/']);
                assert.deepEqual(harness.events, ['sites-popup-show']);
            });

            it('shows website creation when no websites exist', async function () {
                const harness = createHarness(view, undefined, [], {
                    getItem: () => null
                });

                await harness.goBack();

                assert.deepEqual(harness.routes, ['/site/!/posts/']);
                assert.deepEqual(harness.events, []);
            });
        });
    }
});
