const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');

const repo = path.resolve(__dirname, '../../../..');
const appRequire = createRequire(path.join(repo, 'app/package.json'));
const Vue = appRequire('vue');
const VueI18n = appRequire('vue-i18n');
const compiler = appRequire('vue-template-compiler');
const Utils = require(path.join(repo, 'app/src/helpers/utils.js'));
Vue.use(VueI18n);

function readComponent(name) {
    const source = fs.readFileSync(path.join(repo, 'app/src/components', name + '.vue'), 'utf8');
    const parsed = compiler.parseComponent(source);
    const compiled = compiler.compile(parsed.template.content);
    assert.deepEqual(compiled.errors, []);
    const context = {
        module: { exports: {} },
        Tooltip: {},
        SidebarIcons: {},
        Utils,
        Vue,
        Intl,
        Date
    };
    vm.runInNewContext(
        parsed.script.content.replace(/^import .*;\s*$/gm, '').replace('export default', 'module.exports ='),
        context
    );
    return {
        ...context.module.exports,
        render: new Function(compiled.render),
        staticRenderFns: compiled.staticRenderFns.map(code => new Function(code))
    };
}

const sidebar = readComponent('SidebarSyncButton');
const server = readComponent('ServerSettings');
const locales = ['en-gb', 'pl', 'de'];
const translations = {};
for (const locale of locales) {
    translations[locale] = JSON.parse(fs.readFileSync(
        path.join(repo, 'app/default-files/default-languages', locale, 'translations.json'),
        'utf8'
    ));
}

function setup(protocol, domain, relativeUrls, locale = 'en-gb', output = 'catalog') {
    const i18n = new VueI18n({
        locale,
        fallbackLocale: 'en-gb',
        messages: translations
    });
    const store = {
        state: Vue.observable({
            currentSite: {
                config: {
                    domain,
                    name: 'demo',
                    syncDate: new Date(2026, 8, 9, 6, 50).getTime(),
                    deployment: {
                        protocol,
                        relativeUrls,
                        cachedDomain: 'example.test',
                        manual: { output }
                    }
                }
            },
            app: { config: { timeFormat: 24 } },
            components: { sidebar: { status: false, syncInProgress: false } }
        }),
        getters: {
            languages: locales.map(directory => ({ directory, momentLocale: directory }))
        }
    };
    const instance = new Vue({
        ...sidebar,
        i18n,
        beforeCreate () {
            this.$store = store;
            this.$bus = { $emit () {} };
        }
    });
    return instance;
}

function nodes(node) {
    return node ? [node, ...(node.children || []).flatMap(nodes)] : [];
}

function dateNode(instance) {
    return nodes(instance._render()).find(node => node.data && node.data.staticClass === 'sidebar-sync-date');
}

function tooltip(node) {
    return node.data.directives.find(directive => directive.name === 'tooltip').value;
}

const methods = ['ftp', 'ftp+tls', 'sftp', 'sftp+key', 's3', 'google-cloud', 'netlify', 'git', 'github-pages', 'gitlab-pages', 'manual'];

describe('Sidebar date destination and server address settings', () => {
    for (const protocol of methods) {
        for (const locale of locales) {
            it(`${protocol}, ${locale}: absolute domain visits the website`, () => {
                const instance = setup(protocol, 'https://example.test/blog', false, locale);
                const node = dateNode(instance);
                assert.equal(node.tag, 'a');
                assert.equal(node.data.attrs.href, 'https://example.test/blog');
                assert.equal(node.data.attrs.target, '_blank');
                assert.equal(tooltip(node).disabled, false);
                assert.equal(tooltip(node).text, instance.$t('sync.clickToVisitYourWebsite'));
                assert.equal(tooltip(node).offsetX, '75%');
            });

            it(`${protocol}, ${locale}: relative URLs retain a date without opening any local directory`, () => {
                const instance = setup(protocol, '/', true, locale);
                const node = dateNode(instance);
                assert.equal(node.tag, 'span');
                assert.equal(node.data.attrs.href, null);
                assert.equal(node.data.attrs.target, null);
                assert.equal(tooltip(node).disabled, true);
                assert.equal(tooltip(node).text, '');
                const text = nodes(node).map(child => child.text || '').join('');
                assert.ok(text.includes(instance.$t(protocol === 'manual' ? 'sync.lastRendered' : 'sync.lastSync')));
                assert.ok(text.includes(instance.syncDate));
            });
        }

        it(`${protocol}: actual server toggle stores a relative root and restores the cached domain`, () => {
            const settings = {
                domain: 'example.test/blog',
                httpProtocolSelected: 'https',
                deploymentMethodSelected: protocol,
                deploymentSettings: { relativeUrls: true }
            };
            settings.prepareDomain = server.methods.prepareDomain.bind(settings);
            server.methods.toggleDomainName.call(settings);
            assert.equal(settings.domain, '/');
            assert.equal(settings.deploymentSettings.cachedDomain, 'example.test/blog');
            assert.equal(server.methods.fullDomainName.call(settings), '/');

            settings.deploymentSettings.relativeUrls = false;
            server.methods.toggleDomainName.call(settings);
            assert.equal(server.methods.fullDomainName.call(settings), 'https://example.test/blog');
        });
    }

    for (const output of ['catalog', 'zip-archive', 'tar-archive']) {
        it(`manual ${output}: output type does not override the explicit public address`, () => {
            const instance = setup('manual', 'https://example.test', false, 'en-gb', output);
            assert.equal(dateNode(instance).data.attrs.href, 'https://example.test/');
            instance.$store.state.currentSite.config.deployment.relativeUrls = true;
            assert.equal(dateNode(instance).tag, 'span');
        });
    }

    for (const locale of locales) {
        for (const domain of ['file:///Users/example/website/', 'file:///C:/Website/index.html', 'file:///home/example/site/']) {
            it(`${locale}: explicit local target has accurate local-action copy: ${domain}`, () => {
                const instance = setup('manual', domain, false, locale);
                const node = dateNode(instance);
                assert.equal(node.tag, 'a');
                assert.equal(node.data.attrs.href, domain);
                assert.equal(tooltip(node).text, translations[locale].sync.openLocalFileOrFolder);
                assert.notEqual(tooltip(node).text, instance.$t('sync.clickToVisitYourWebsite'));
            });
        }
    }

    for (const domain of ['', '/', '.', './', '/blog/', 'example.test', 'javascript:alert(1)', 'https://', 'https://bad host.test']) {
        it(`invalid or relative address cannot resolve against Electron's file URL: ${domain}`, () => {
            const instance = setup('ftp', domain, false);
            const node = dateNode(instance);
            assert.equal(node.tag, 'span');
            assert.equal(node.data.attrs.href, null);
            assert.equal(tooltip(node).disabled, true);
        });
    }

    it('opens an explicitly protocol-relative website over HTTPS instead of resolving it as a file URL', () => {
        const instance = setup('ftp', '//example.test/blog', false);
        assert.equal(dateNode(instance).data.attrs.href, 'https://example.test/blog');
    });

    it('retains supported alternative public URL schemes', () => {
        for (const domain of ['dat://example.test/', 'ipfs://example/', 'dweb://example/']) {
            const instance = setup('manual', domain, false);
            assert.equal(dateNode(instance).data.attrs.href, domain);
            assert.equal(instance.websiteLinkTooltip, instance.$t('sync.clickToVisitYourWebsite'));
        }
    });

    it('does not use an old absolute or cached domain while relative URLs are enabled', () => {
        const instance = setup('ftp', 'https://old.example.test', true);
        assert.equal(dateNode(instance).tag, 'span');
    });

    it('updates the target and tooltip when the active site settings change', () => {
        const instance = setup('manual', 'https://example.test', false);
        assert.equal(dateNode(instance).tag, 'a');
        instance.$store.state.currentSite.config.domain = 'file:///tmp/site/';
        assert.equal(tooltip(dateNode(instance)).text, instance.$t('sync.openLocalFileOrFolder'));
        instance.$store.state.currentSite.config.domain = '/';
        instance.$store.state.currentSite.config.deployment.relativeUrls = true;
        assert.equal(dateNode(instance).tag, 'span');
    });

    it('does not show a last-operation date before the first successful operation', () => {
        const instance = setup('ftp', 'https://example.test', false);
        instance.$store.state.currentSite.config.syncDate = null;
        assert.equal(dateNode(instance), undefined);
    });

    it('demonstrates why the old root and protocol-relative hrefs were unsafe in an Electron document', () => {
        const base = 'file:///Applications/Publii.app/Contents/Resources/app.asar/dist/index.html';
        assert.equal(new URL('/', base).href, 'file:///');
        assert.equal(new URL('./', base).protocol, 'file:');
        assert.equal(new URL('//example.test', base).protocol, 'file:');
    });
});
