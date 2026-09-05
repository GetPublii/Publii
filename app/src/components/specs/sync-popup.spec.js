/*
 * Regression tests for the synchronization popup and log viewer.
 * Covers deployment-specific copy, button actions, retries and log navigation.
 * Uses mocked Electron APIs; no files are uploaded and no app window is opened.
 *
 * Run with the full test suite from the repository root: npm test
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');

const repo = path.resolve(__dirname, '../../../..');
const root = repo;
const appRequire = createRequire(path.join(repo, 'app/package.json'));
const Vue = appRequire('vue');
const VueI18n = appRequire('vue-i18n');
const compiler = appRequire('vue-template-compiler');
Vue.use(VueI18n);
const originalSilent = Vue.config.silent;
Vue.config.silent = true;
after(() => { Vue.config.silent = originalSilent; });

const languages = Object.fromEntries(['en-gb', 'pl'].map(locale => [locale, JSON.parse(fs.readFileSync(path.join(root, 'app/default-files/default-languages', locale, 'translations.json'), 'utf8'))]));

function setup(componentName, protocol = 'ftp', locale = 'en-gb') {
    const calls = { sends: [], emits: [], routes: [], folders: [], commits: [], external: [] };
    const listeners = {};
    const busListeners = {};
    const api = {
        send: (...args) => calls.sends.push(args),
        receive: (event, callback) => { listeners[event] = callback; },
        receiveOnce: (event, callback) => { listeners[event] = callback; },
        stopReceive: () => {},
        shellShowItemInFolder: p => calls.folders.push(p),
        shellOpenExternal: url => calls.external.push(url)
    };
    const body = { popup: false, classList: { contains: () => body.popup }, addEventListener: () => {}, removeEventListener: () => {} };
    const source = fs.readFileSync(path.join(root, 'app/src/components', componentName + '.vue'), 'utf8');
    const parsed = compiler.parseComponent(source);
    const compilation = compiler.compile(parsed.template.content);
    assert.deepEqual(compilation.errors, []);
    const context = { module: { exports: {} }, mainProcessAPI: api, document: { body }, Utils: { getValidUrl: u => u }, BackToTools: {}, setTimeout: () => {} };
    vm.runInNewContext(parsed.script.content.replace(/^import .*;\s*$/gm, '').replace('export default', 'module.exports ='), context);
    const component = context.module.exports;
    const i18n = new VueI18n({ locale, fallbackLocale: 'en-gb', messages: JSON.parse(JSON.stringify(languages)) });
    const instance = new Vue({ ...component, i18n, render: new Function(compilation.render), staticRenderFns: compilation.staticRenderFns.map(code => new Function(code)) });
    instance.$store = {
        state: { currentSite: { config: { name: 'demo', domain: 'https://example.test', theme: 'theme', deployment: { protocol, server: 'server', port: '22', username: 'user', manual: { output: 'catalog' } } } } },
        commit: (...args) => calls.commits.push(args)
    };
    instance.$bus = {
        $on: (event, callback) => { busListeners[event] = callback; },
        $off: (event, callback) => { assert.equal(busListeners[event], callback); delete busListeners[event]; },
        $emit: (...args) => calls.emits.push(args)
    };
    instance.$router = { push: route => calls.routes.push(route) };
    instance.$route = { path: '/site/demo/posts', query: {}, params: { name: 'demo' } };
    instance.isVisible = true;
    return { instance, calls, listeners, component, busListeners, body };
}

function allNodes(node) {
    return node ? [node, ...(node.children || []).flatMap(allNodes)] : [];
}
function text(node) {
    return allNodes(node).map(n => n.text || '').join('').trim();
}
function screen(instance) {
    const nodes = allNodes(instance._render());
    return {
        headings: nodes.filter(n => n.tag === 'h1').map(text),
        buttons: nodes.filter(n => n.tag === 'p-button').map(n => ({ label: text(n), ...n.data.attrs })),
        nodes
    };
}

describe('Synchronization popup and log viewer', () => {
    for (const locale of ['en-gb', 'pl']) {
        for (const protocol of ['ftp', 'ftp+tls', 'sftp', 's3', 'google-cloud', 'netlify', 'git', 'github-pages', 'gitlab-pages', 'manual']) {
            it(`${locale}: ${protocol} idle, busy and success content`, () => {
                const { instance: s, calls, listeners } = setup('SyncPopup', protocol, locale);
                const manual = protocol === 'manual';
                const t = key => s.$t(key);
                assert.equal(screen(s).buttons[0].label, t(manual ? 'sync.prepareWebsiteFiles' : 'sync.syncYourWebsite'));
                assert.equal(screen(s).headings[0], t(manual ? 'sync.websiteFilesPreparation' : 'sync.websiteSynchronization'));
                s.startSync();
                assert.equal(calls.sends[0][0], 'app-deploy-render');
                assert.equal(screen(s).buttons[0].label, t(manual ? 'sync.preparingWebsiteFiles' : 'sync.syncingWebsite'));
                assert.equal(screen(s).buttons[0].disabled, true);
                s.startUpload();
                listeners['app-deploy-uploaded'](manual ? { status: true, type: 'catalog', path: '/output/demo-files' } : { status: true });
                listeners['app-sync-is-done-saved']();
                const key = manual ? 'sync.websiteFilesReady' : protocol === 'github-pages' ? 'sync.githubChangesSent' : protocol === 'gitlab-pages' ? 'sync.gitlabChangesSent' : 'sync.yourWebsiteIsInSync';
                assert.equal(screen(s).headings[0], t(key));
                assert.equal(s.messageFromUploader, t(key));
                assert.deepEqual(screen(s).buttons.map(b => b.label), [t(manual ? 'sync.showInFolder' : 'sync.visitYourWebsite'), t('ui.close')]);
                screen(s).buttons[0].onClick();
                assert.equal(s.isVisible, false);
                assert.equal(manual ? calls.folders[0] : calls.external[0], manual ? '/output/demo-files' : 'https://example.test');
            });
        }
    }

    for (const protocol of ['ftp', 'manual']) {
        it(`${protocol}: failure with details, visible error and retry without rerendering`, () => {
            const { instance: s, calls } = setup('SyncPopup', protocol);
            s.renderingProgressUpdate({ progress: 100, message: 'Generated' });
            s.startUpload();
            calls.sends.length = 0;
            s.showError({ additionalMessage: 'Output unavailable' });
            const prefix = protocol === 'manual' ? "Couldn't prepare website files" : 'An error occurred while connecting to the server';
            assert.equal(s.orbMessage, prefix + '.');
            assert.equal(s.orbPhase, 'error');
            assert.equal(calls.emits.at(-1)[1].message, prefix + ': Output unavailable');
            assert.equal(screen(s).buttons[0].label, protocol === 'manual' ? 'Retry preparation' : 'Retry upload');
            assert.equal(screen(s).buttons[0].disabled, false);
            screen(s).buttons[0].onClick();
            assert.deepEqual(calls.sends.map(c => c[0]), ['app-deploy-upload']);
            assert.equal(s.uploadError, false);
            assert.notEqual(s.orbPhase, 'error');
            assert.equal(screen(s).buttons[0].disabled, true);
            if (protocol === 'manual') assert.equal(s.orbMessage, s.$t('file.preparingFilesInOutputDir'));
        });
        it(`${protocol}: generic failure text`, () => {
            const { instance: s, calls } = setup('SyncPopup', protocol);
            s.showError();
            assert.equal(calls.emits[0][1].message, s.$t(protocol === 'manual' ? 'sync.websiteFilesPreparationErrorMessage' : 'sync.connectionToServerErrorMessage'));
        });
    }

    it('translated provider errors preserve interpolation variables', () => {
        const { instance: s, calls } = setup('SyncPopup');
        s.$i18n.mergeLocaleMessage('en-gb', { testError: 'Cannot write {file}' });
        s.showError({ additionalMessage: { translation: 'testError', translationVars: { file: 'index.html' } } });
        assert.equal(calls.emits[0][1].message, 'An error occurred while connecting to the server: Cannot write index.html');
    });

    for (const output of ['catalog', 'zip-archive', 'tar-archive']) {
        it(`manual ${output}: reveal generated output and close independently`, () => {
            const { instance: s, calls, listeners } = setup('SyncPopup', 'manual');
            s.startUpload();
            listeners['app-deploy-uploaded']({ status: true, type: output, path: '/output/' + output });
            const buttons = screen(s).buttons;
            buttons[1].onClick();
            assert.equal(s.isVisible, false);
            assert.equal(calls.folders.length, 0);
            s.isVisible = true;
            buttons[0].onClick();
            assert.equal(calls.folders[0], '/output/' + output);
        });
    }

    for (const protocol of ['ftp', 'ftp+tls', 'sftp']) {
        it(`${protocol}: password prompt says Connect and only sends on acceptance`, () => {
            const { instance: s, calls } = setup('SyncPopup', protocol);
            s.$store.state.currentSite.config.deployment.askforpassword = true;
            s.startUpload();
            const dialog = calls.emits[0][1];
            assert.equal(dialog.okLabel, 'Connect');
            assert.equal(dialog.message, 'Please enter the password for the following server: server');
            assert.equal(dialog.hasInput, true);
            assert.equal(dialog.inputIsPassword, true);
            assert.equal(calls.sends.length, 0);
            dialog.okClick('test-password');
            assert.equal(calls.sends[0][0], 'app-deploy-upload');
            assert.equal(calls.sends[0][1].password, 'test-password');
        });
    }

    it('empty password and cancelling password retain existing retry flow', () => {
        for (const action of ['blank', 'cancel']) {
            const { instance: s, calls } = setup('SyncPopup');
            s.$store.state.currentSite.config.deployment.askforpassword = true;
            s.startUpload();
            const dialog = calls.emits[0][1];
            action === 'blank' ? dialog.okClick(' ') : dialog.cancelClick();
            assert.equal(calls.sends.length, 0);
            assert.equal(s.syncInProgress, false);
            assert.equal(s.uploadError, true);
            assert.equal(screen(s).buttons[0].label, 'Retry upload');
        }
    });

    it('warning action opens actual deployment log and Close performs no navigation', () => {
        const { instance: s, calls, listeners } = setup('SyncPopup', 's3');
        s.startUpload();
        listeners['app-deploy-uploaded']({ status: true, issues: true });
        listeners['app-sync-is-done-saved']();
        const buttons = screen(s).buttons;
        assert.deepEqual(buttons.map(b => b.label), ['View log', 'Close']);
        buttons[1].onClick();
        assert.equal(calls.routes.length, 0);
        s.isVisible = true;
        buttons[0].onClick();
        assert.equal(calls.routes[0].path, '/site/demo/tools/log-viewer');
        assert.equal(calls.routes[0].query.file, 'deployment-process.log');
        assert.equal(s.isVisible, false);
        s.$route = calls.routes[0];
        s.isVisible = true;
        s.viewLog();
        assert.equal(calls.routes.length, 1);
        assert.equal(s.isVisible, false);
    });

    for (const locale of ['en-gb', 'pl']) {
        for (const protocol of ['s3', 'ftp']) {
            it(`${locale}: ${protocol} keeps a minimized warning until the user opens the details`, () => {
                const { instance: s, calls, listeners } = setup('SyncPopup', protocol, locale);
                s.startSync();
                s.startUpload();
                s.minimizePopup();
                s.uploadingProgressUpdate({ progress: 50, operations: [1, 2] });
                let progress = screen(s).nodes.find(n => n.tag === 'progress-bar');
                assert.equal(progress.data.attrs.progress, 50);
                assert.equal(progress.data.attrs.message, s.messageFromUploader);

                listeners['app-deploy-uploaded']({ status: true, issues: true });
                // The warning must also survive the gap before the sync status is saved.
                for (const saved of [false, true]) {
                    if (saved) listeners['app-sync-is-done-saved']();
                    const view = screen(s);
                    progress = view.nodes.find(n => n.tag === 'progress-bar');
                    assert.ok(progress, 'The minimized warning remains visible');
                    assert.equal(progress.data.attrs.message, locale === 'pl' ? 'Nie wysłano części plików' : "Some files weren't uploaded");
                    assert.equal(progress.data.attrs.intent, 'warning');
                    assert.equal(progress.data.attrs.progress, 100);
                    assert.equal(progress.data.attrs.cssClasses['is-synced'], false);
                    assert.equal(progress.data.attrs.cssClasses['sync-progress-bar'], false);
                    assert.equal(s.isVisible, true);
                    assert.equal(s.isMinimized, true);
                    assert.deepEqual(view.headings, []);
                    assert.deepEqual(view.buttons, []);
                }

                // Typing in the editor must not open the popup or navigate away.
                s.onDocumentKeyDown({ code: 'Enter', target: { closest: () => ({}) } });
                assert.equal(s.isMinimized, true);
                assert.equal(calls.routes.length, 0);
                assert.equal(calls.emits.length, 0);

                s._render().data.on.click();
                assert.equal(s.isMinimized, false);
                assert.equal(screen(s).nodes.some(n => n.tag === 'progress-bar'), false);
                assert.equal(screen(s).headings[0], s.$t('sync.filesNotSyncedErrorText'));
                assert.deepEqual(screen(s).buttons.map(b => b.label), [s.$t('sync.viewLog'), s.$t('ui.close')]);
                screen(s).buttons[1].onClick();
                assert.equal(s.isVisible, false);
                assert.equal(calls.routes.length, 0);
            });
        }
    }

    it('a fully successful minimized sync still closes automatically', () => {
        for (const protocol of ['ftp', 's3', 'github-pages', 'gitlab-pages']) {
            const { instance: s, listeners } = setup('SyncPopup', protocol);
            s.startUpload();
            s.minimizePopup();
            listeners['app-deploy-uploaded']({ status: true, issues: false });
            listeners['app-sync-is-done-saved']();
            assert.equal(s.isVisible, false);
            assert.equal(screen(s).nodes.some(n => n.tag === 'progress-bar'), false);
        }
    });

    it('a minimized connection error keeps its existing message and error intent', () => {
        const { instance: s } = setup('SyncPopup');
        s.startUpload();
        s.minimizePopup();
        s.showError();
        const progress = screen(s).nodes.find(n => n.tag === 'progress-bar');
        assert.ok(progress);
        assert.equal(progress.data.attrs.intent, 'danger');
        assert.equal(progress.data.attrs.message, s.$t('sync.connectionToServerErrorText'));
        assert.equal(s.isVisible, true);
    });

    it('opening a new sync after dismissing a warning resets the previous result', () => {
        const { instance: s, listeners, component, busListeners } = setup('SyncPopup');
        component.mounted.call(s);
        s.startUpload();
        s.minimizePopup();
        listeners['app-deploy-uploaded']({ status: true, issues: true });
        listeners['app-sync-is-done-saved']();
        s.maximizePopup();
        s.close();
        busListeners['sync-popup-display']();
        assert.equal(s.noIssues, true);
        assert.equal(s.isInSync, false);
        assert.equal(s.isMinimized, false);
        assert.equal(s.messageFromUploader, '');
        assert.equal(s.uploadingProgressIntent, 'default');
        assert.equal(screen(s).buttons[0].label, 'Sync your website');
    });

    it('Cancel before and during sync and Continue keep their actions', () => {
        const { instance: s, calls, listeners } = setup('SyncPopup');
        screen(s).buttons[1].onClick();
        assert.equal(s.isVisible, false);
        assert.equal(calls.sends.length, 0);
        s.isVisible = true;
        s.startSync();
        calls.sends.length = 0;
        s.cancelSync();
        assert.deepEqual(calls.sends.map(c => c[0]), ['app-deploy-render-abort', 'app-deploy-abort']);
        listeners['app-deploy-aborted']();
        assert.equal(s.isVisible, false);
        s.askForContinueSync();
        const dialog = calls.emits.at(-1)[1];
        assert.equal(dialog.okLabel, 'Continue and sync');
        assert.equal(dialog.cancelLabel, 'Cancel');
        dialog.okClick();
        assert.equal(calls.sends.at(-1)[0], 'app-deploy-continue');
    });

    it('focused controls, modal dialogs, composing and minimized states own Enter', () => {
        const { instance: s, calls, body } = setup('SyncPopup', 'manual');
        s.isInSync = true;
        s.manualFilePath = '/output/site';
        const event = { code: 'Enter', target: { closest: () => ({}) } };
        s.onDocumentKeyDown(event);
        assert.equal(calls.folders.length, 0);
        event.target.closest = () => null;
        body.popup = true;
        s.onDocumentKeyDown(event);
        body.popup = false;
        s.onDocumentKeyDown({ ...event, isComposing: true });
        s.onDocumentKeyDown({ ...event, defaultPrevented: true });
        s.isMinimized = true;
        s.onDocumentKeyDown(event);
        assert.equal(calls.folders.length, 0);
        s.isMinimized = false;
        s.onDocumentKeyDown(event);
        assert.equal(calls.folders[0], '/output/site');
    });

    function logViewer(file) {
        const result = setup('LogViewer');
        const s = result.instance;
        s.$route.query = file === undefined ? {} : { file };
        s.$refs.codemirror = { editor: null };
        result.component.mounted.call(s);
        result.ready = () => {
            s.$refs.codemirror.editor = { setValue: value => { result.content = value; }, refresh: () => {} };
            result.busListeners['log-viewer-editor-loaded']();
        };
        result.files = () => result.listeners['app-log-files-loaded']({ files: ['deployment-process.log', 'other.log'] });
        return result;
    }

    for (const order of ['editor-first', 'files-first']) {
        it(`View log waits for both editor and list (${order})`, () => {
            const v = logViewer('deployment-process.log');
            order === 'editor-first' ? v.ready() : v.files();
            assert.equal(v.calls.sends.filter(c => c[0] === 'app-log-file-load').length, 0);
            order === 'editor-first' ? v.files() : v.ready();
            assert.equal(v.instance.selectedFile, 'deployment-process.log');
            assert.equal(v.calls.sends.filter(c => c[0] === 'app-log-file-load').length, 1);
            v.listeners['app-log-file-loaded']({ fileContent: 'UPL HARD ERR index.html' });
            assert.equal(v.content, 'UPL HARD ERR index.html');
            v.component.beforeDestroy.call(v.instance);
            assert.equal(v.busListeners['log-viewer-editor-loaded'], undefined);
        });
    }

    it('log viewer rejects unlisted, empty or non-string requested files', () => {
        for (const file of [undefined, '', 'missing.log', '../outside.log', ['deployment-process.log']]) {
            const v = logViewer(file);
            v.ready();
            v.files();
            assert.equal(v.instance.selectedFile, '');
            assert.equal(v.calls.sends.filter(c => c[0] === 'app-log-file-load').length, 0);
        }
    });

    it('normal Tools entry preserves manual selection, reload and clear', () => {
        const v = logViewer();
        v.ready();
        v.files();
        const dropdown = screen(v.instance).nodes.find(n => n.tag === 'dropdown');
        assert.equal(dropdown.data.model.value, '');
        dropdown.data.model.callback('other.log');
        dropdown.data.attrs.onChange('other.log');
        assert.equal(v.instance.selectedFile, 'other.log');
        v.listeners['app-log-file-loaded']({ fileContent: 'Other log' });
        assert.equal(v.content, 'Other log');
        v.instance.loadSelectedFile();
        assert.equal(v.calls.sends.at(-1)[1], 'other.log');
        v.listeners['app-log-file-loaded']({ fileContent: '' });
        assert.equal(v.content, v.instance.$t('tools.logFileEmpty'));
        v.instance.loadFile('');
        assert.equal(v.content, '');
        v.instance.$route.query.file = 'deployment-process.log';
        v.component.watch['$route.query.file'].call(v.instance);
        assert.equal(v.instance.selectedFile, 'deployment-process.log');
        assert.equal(v.calls.sends.at(-1)[1], 'deployment-process.log');
    });

    it('popup translations exist in both bundled languages and fall back for other languages', () => {
        const source = fs.readFileSync(path.join(root, 'app/src/components/SyncPopup.vue'), 'utf8');
        const keys = [...new Set([...source.matchAll(/['"]((?:sync|ui|file)\.\w+)['"]/g)].map(match => match[1]))];
        const i18n = new VueI18n({ locale: 'custom', fallbackLocale: 'en-gb', silentTranslationWarn: true, silentFallbackWarn: true, messages: { custom: {}, 'en-gb': languages['en-gb'] } });
        for (const key of keys) {
            const [group, name] = key.split('.');
            for (const locale of ['en-gb', 'pl']) assert.equal(typeof languages[locale][group][name], 'string', locale + ': ' + key);
            assert.equal(i18n.t(key), languages['en-gb'][group][name]);
        }
    });
});
