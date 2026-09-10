const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const Vue = require('vue');
const VueI18n = require('vue-i18n');
const compiler = require('vue-template-compiler');
const defaultConfig = require('../../../config/AST.currentSite.config.js');

Vue.use(VueI18n);

function readComponent(name) {
    return fs.readFileSync(path.join(__dirname, '..', name + '.vue'), 'utf8');
}

function loadOptions(name) {
    const script = readComponent(name).match(/<script>([\s\S]*?)<\/script>/)[1];
    const context = {
        module: { exports: {} },
        ThemeUpload: {},
        EmbedConsentsGroups: {},
        GConsentModeGroups: {},
        GdprGroups: {},
        ThemesDropdown: {},
        WorkspaceAccentPicker: {},
        Tooltip: {}
    };

    vm.runInNewContext(
        script.replace(/^import[\s\S]*?from ['"][^'"]+['"];\s*$/gm, '')
            .replace('export default', 'module.exports ='),
        context
    );

    return context.module.exports;
}

function descendants(node) {
    return [node, ...(node.children || []).flatMap(descendants)];
}

function renderTab(tab, locale, relativeUrls, noIndex, socialEnabled) {
    const source = readComponent('Settings');
    const start = source.indexOf('<div slot="tab-' + tab + '">');
    const end = source.indexOf('<div slot="tab-' + (tab + 1) + '">', start);
    const compiled = compiler.compileToFunctions('<section>' + source.slice(start, end) + '</section>');
    const translations = JSON.parse(fs.readFileSync(
        path.join(__dirname, '../../../default-files/default-languages', locale, 'translations.json'),
        'utf8'
    ));
    const advanced = JSON.parse(JSON.stringify(defaultConfig.advanced));
    advanced.noIndexThisPage = noIndex;
    advanced.openGraphEnabled = socialEnabled;
    advanced.twitterCardsEnabled = socialEnabled;
    const instance = new Vue({
        i18n: new VueI18n({
            locale,
            messages: { [locale]: translations },
            silentTranslationWarn: true,
            silentFallbackWarn: true
        }),
        data() {
            return {
                advanced,
                siteUsesRelativeUrls: relativeUrls,
                sitemapLink: false,
                currentThemeSupportsTagPages: true,
                currentThemeSupportsAuthorPages: true,
                feedTitleItems: {},
                feedAuthorsItems: {},
                feedContentItems: {},
                twitterCardsTypes: {},
                serverSettingsNoticeRoute: { path: '/site/audit/settings/server' }
            };
        },
        methods: {
            rememberSettingsDraft() {},
            openIndexingSettings() {}
        },
        render: compiled.render,
        staticRenderFns: compiled.staticRenderFns
    });

    const nodes = descendants(instance._render());
    instance.$destroy();
    return nodes;
}

describe('Settings dependency notices', function () {
    for (const locale of ['en-gb', 'pl', 'de']) {
        for (const relativeUrls of [false, true]) {
            for (const noIndex of [false, true]) {
                it(`shows only active restrictions in ${locale}, relative=${relativeUrls}, noindex=${noIndex}`, function () {
                    for (const tab of [2, 3, 4, 7]) {
                        const nodes = renderTab(tab, locale, relativeUrls, noIndex, true);
                        const notices = nodes.filter(node => node.data && (node.data.staticClass || '').split(' ').includes('settings-dependency-notice'));
                        assert.equal(notices.length, Number(relativeUrls) + (tab === 2 ? Number(noIndex) : 0));

                        for (const notice of notices) {
                            const content = descendants(notice);
                            const text = content.map(node => node.text || '').join('');
                            assert.equal(text.includes('{option}'), false);
                            assert.equal(/\bsettings\.[a-zA-Z]/.test(text), false);
                            assert.equal(content.filter(node => node.tag === 'router-link' || node.tag === 'a').length, 1);
                        }
                    }
                });
            }
        }
    }

    for (const enabled of [false, true]) {
        it(`keeps social controls editable with relative URLs, enabled=${enabled}`, function () {
            for (const [tab, id, model] of [
                [3, 'open-graph-enabled', 'openGraphEnabled'],
                [4, 'twitter-cards-enabled', 'twitterCardsEnabled']
            ]) {
                const nodes = renderTab(tab, 'en-gb', true, false, enabled);
                const control = nodes.find(node => node.tag === 'switcher' && node.data.attrs.id === id);
                assert.ok(control);
                assert.equal(!!control.data.attrs.disabled, false);
                assert.equal(control.data.model.value, enabled);
                assert.ok(control.data.model.expression.includes(model));
                const noticeIndex = nodes.findIndex(node => node.data && (node.data.staticClass || '').split(' ').includes('settings-dependency-notice'));
                assert.ok(noticeIndex < nodes.indexOf(control));
            }
        });
    }

    it('preserves an independent draft for the same site without restoring server settings', function () {
        const options = loadOptions('Settings');
        const original = {
            $store: { state: { currentSite: { config: { name: 'audit', uuid: 'site-a' } } } },
            $refs: { 'logo-creator': { getActiveIcon: () => 'star' } },
            name: 'Unsaved name',
            description: 'Unsaved description',
            theme: 'use-new-theme',
            workspaceAccent: 'violet',
            language: 'custom',
            customLanguage: 'pl-PL',
            spellchecking: true,
            uuid: 'site-a',
            advanced: { openGraphEnabled: true, twitterCardsEnabled: true, urls: { postsPrefix: 'draft' } }
        };
        options.methods.rememberSettingsDraft.call(original);
        original.advanced.urls.postsPrefix = 'changed-after-navigation';
        const otherSite = { $store: { state: { currentSite: { config: { name: 'other', uuid: 'site-b' } } } } };
        options.methods.restoreSettingsDraft.call(otherSite);
        assert.equal(otherSite.name, undefined);
        const restored = {
            $store: { state: { currentSite: { config: { name: 'audit', uuid: 'site-a', deployment: { relativeUrls: false } } } } }
        };
        options.methods.restoreSettingsDraft.call(restored);
        assert.equal(restored.name, 'Unsaved name');
        assert.equal(restored.logo.icon, 'star');
        assert.equal(restored.theme, 'use-new-theme');
        assert.equal(restored.advanced.urls.postsPrefix, 'draft');
        assert.equal(restored.$store.state.currentSite.config.deployment.relativeUrls, false);
        const secondVisit = { $store: restored.$store };
        options.methods.restoreSettingsDraft.call(secondVisit);
        assert.equal(secondVisit.name, undefined);
    });

    it('opens the localized SEO tab and focuses indexing without toggling it', function () {
        const options = loadOptions('Settings');
        const calls = [];
        const control = {
            focus: () => calls.push('focus'),
            scrollIntoView: () => calls.push('scroll')
        };
        options.methods.openIndexingSettings.call({
            advancedTabs: ['Ustawienia SEO'],
            $refs: {
                'advanced-tabs': { toggle: (...args) => calls.push(args) },
                'indexing-setting': { $el: { querySelector: () => control } }
            },
            $nextTick: callback => callback()
        });
        assert.deepEqual(calls, [['Ustawienia SEO', 0], 'focus', 'scroll']);
    });

    it('focuses the relative URLs switch only for a targeted link', function () {
        const options = loadOptions('ServerSettings');
        let focusCount = 0;
        const instance = {
            $route: { query: {} },
            $refs: {
                'relative-urls-setting': {
                    $el: {
                        querySelector: () => ({
                            focus: () => focusCount++,
                            scrollIntoView() {}
                        })
                    }
                }
            }
        };
        options.methods.focusLinkedSetting.call(instance);
        assert.equal(focusCount, 0);
        instance.$route.query.focus = 'relative-urls';
        options.methods.focusLinkedSetting.call(instance);
        assert.equal(focusCount, 1);
        instance.$refs = {};
        assert.doesNotThrow(() => options.methods.focusLinkedSetting.call(instance));
    });
});
