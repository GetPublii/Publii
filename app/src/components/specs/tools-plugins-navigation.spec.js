const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const compiler = require('vue-template-compiler');

const root = path.resolve(__dirname, '../../../..');
const appRequire = createRequire(path.join(root, 'app/package.json'));
const Router = appRequire('vue-router');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

function options(name, globals = {}) {
    const component = compiler.parseComponent(read('app/src/components/' + name + '.vue'));
    const context = { module: { exports: {} }, ...globals };
    vm.runInNewContext(
        component.script.content.replace(/^import .*;\s*$/gm, '').replace('export default', 'module.exports ='),
        context
    );
    return context.module.exports;
}

function routes() {
    class CaptureRouter {
        constructor(config) {
            this.options = config;
        }

        push() {
            return Promise.resolve();
        }
    }

    const context = {
        module: { exports: {} },
        Vue: { use() {} },
        Router: CaptureRouter,
        Splashscreen: {}
    };
    vm.runInNewContext(
        read('app/src/router/index.js')
            .replace(/^import .*;\s*$/gm, '')
            .replace('export default', 'module.exports ='),
        context
    );
    return context.module.exports.options.routes;
}

describe('Separate Tools and Plugins navigation', () => {
    it('keeps all seven tool destinations and encodes the site name', () => {
        const tools = options('Tools');
        const entries = tools.data().tools;
        assert.deepEqual(Array.from(entries, item => item.link), [
            'backups', 'custom-css', 'custom-html', 'file-manager',
            'log-viewer', 'regenerate-thumbnails', 'wp-importer'
        ]);
        assert.equal(tools.methods.toolUrl.call({ $route: { params: { name: 'my site' } } }, entries[0]), '/site/my%20site/tools/backups');
        assert.equal(new Set(entries.map(item => item.id)).size, 7);
    });

    it('places Plugins after Theme and keeps Tools and optional File Manager distinct', () => {
        const sidebar = options('SidebarMenu');
        const context = {
            $route: { params: { name: 'demo' } },
            $store: { state: { app: { config: { experimentalFileManagerInSidebar: false } } } },
            $t: key => key
        };
        const items = sidebar.computed.items.call(context);
        const theme = items.findIndex(item => item.icon === 'themes');
        assert.equal(items[theme + 1].section, 'plugins');
        assert.equal(items[theme + 1].url, '/site/demo/plugins/');
        assert.equal(items.at(-1).section, 'tools');
        assert.equal(items.at(-1).url, '/site/demo/tools/');
        assert.notEqual(items[theme + 1].icon, items.at(-1).icon);
        context.$store.state.app.config.experimentalFileManagerInSidebar = true;
        assert.equal(sidebar.computed.items.call(context).filter(item => item.icon === 'folder').length, 1);
    });

    it('highlights the correct sidebar section on direct entry and nested routes', () => {
        const sidebar = options('SidebarMenu');
        const config = { experimentalFileManagerInSidebar: false };
        for (const [route, expected] of [
            ['/site/demo/plugins/', 'plugins'],
            ['/site/demo/plugins/example', 'plugins'],
            ['/site/demo/tools/plugins/example', 'plugins'],
            ['/site/demo/tools/', 'tools'],
            ['/site/demo/tools/custom-css', 'tools'],
            ['/site/demo/tools/file-manager', 'tools'],
            ['/site/demo/settings/themes/', 'themes'],
            ['/site/demo/settings/server/', 'server'],
            ['/site/demo/settings/', 'settings'],
            ['/site/demo/pages/', 'pages']
        ]) {
            assert.equal(sidebar.computed.activeMenuItem.call({
                $route: { path: route },
                $store: { state: { app: { config } } }
            }), expected, route);
        }
        config.experimentalFileManagerInSidebar = true;
        assert.equal(sidebar.computed.activeMenuItem.call({
            $route: { path: '/site/demo/tools/file-manager' },
            $store: { state: { app: { config } } }
        }), 'folder');
    });

    it('resolves canonical routes and redirects old plugin links without losing parameters', () => {
        const router = new Router({ mode: 'abstract', routes: routes() });
        const plugins = router.resolve('/site/my%20site/plugins/').route;
        assert.equal(plugins.matched.at(-1).path, '/site/:name/plugins');
        const legacy = router.resolve('/site/my%20site/tools/plugins/My%20Plugin?tab=custom#advanced').route;
        assert.equal(legacy.name, 'SitePlugin');
        assert.equal(legacy.path, '/site/my%20site/plugins/My%20Plugin');
        assert.equal(legacy.params.name, 'my site');
        assert.equal(legacy.params.pluginname, 'My Plugin');
        assert.equal(legacy.query.tab, 'custom');
        assert.equal(legacy.hash, '#advanced');
        assert.equal(router.resolve('/site/demo/tools/file-manager').route.matched.at(-1).path, '/site/:name/tools/file-manager');
    });

    it('returns plugin settings to Plugins and keeps other tools returning to Tools', () => {
        const destinations = [];
        const context = {
            $route: { params: { name: 'my site' } },
            $router: { push: destination => destinations.push(destination) }
        };
        const plugin = options('ToolsPlugin', {
            applyAppAppearance() {},
            SupportedFeaturesCheck: {},
            Repeater: {},
            Vue: {}
        });
        plugin.methods.goBack.call(context);
        assert.deepEqual(destinations, ['/site/my%20site/plugins/']);
        assert.ok(read('app/src/components/mixins/BackToTools.js').includes("'/tools/'"));
    });

    it('separates the Tools label and translated plugin return label in bundled languages', () => {
        for (const [locale, title] of [['en-gb', 'Tools'], ['pl', 'Narzędzia'], ['de', 'Werkzeuge']]) {
            const messages = JSON.parse(read('app/default-files/default-languages/' + locale + '/translations.json'));
            assert.equal(messages.ui.tools, title);
            assert.ok(messages.ui.backToPlugins);
            assert.ok(messages.plugins.plugins);
        }
    });
});
