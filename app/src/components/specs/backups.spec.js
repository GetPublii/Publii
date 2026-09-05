/*
 * Regression tests for backup actions and the inline name editor shared with menus.
 * Uses mocked Electron APIs; no backup files are created, renamed or restored.
 * Run with the full test suite from the repository root: npm test
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const root = path.resolve(__dirname, '../../../..');
const appRequire = createRequire(path.join(root, 'app/package.json'));
const Vue = appRequire('vue');
const VueI18n = appRequire('vue-i18n');
const compiler = appRequire('vue-template-compiler');
Vue.use(VueI18n);
const languages = Object.fromEntries(['en-gb', 'pl'].map(locale => [locale,
    JSON.parse(fs.readFileSync(path.join(root, 'app/default-files/default-languages', locale, 'translations.json'), 'utf8'))
]));
const components = path.join(root, 'app/src/components');
const read = file => fs.readFileSync(path.join(components, file), 'utf8');
function evaluate(source, globals = {}) {
    const context = { module: { exports: {} }, ...globals };
    vm.runInNewContext(source.replace(/^import .*;\s*$/gm, '').replace('export default', 'module.exports ='), context);
    return context.module.exports;
}
function component(file, globals = {}) {
    const source = compiler.parseComponent(read(file));
    const compiled = compiler.compile(source.template.content);
    assert.deepEqual(compiled.errors, []);
    return { ...evaluate(source.script.content, globals),
        render: new Function(compiled.render), staticRenderFns: compiled.staticRenderFns.map(code => new Function(code)) };
}
function nodes(node) { return node ? [node, ...(node.children || []).flatMap(nodes)] : []; }
function text(node) { return nodes(node).map(n => n.text || '').join('').trim(); }
function screen(instance) { return nodes(instance._render()); }
function props(node) { return { ...(node.data && node.data.attrs), ...(node.componentOptions && node.componentOptions.propsData) }; }
function findButtons(instance) { return screen(instance).filter(n => n.tag === 'p-button').map(n => ({ ...props(n), label: text(n) })); }
function i18n(locale = 'en-gb') { return new VueI18n({ locale, fallbackLocale: 'en-gb', messages: JSON.parse(JSON.stringify(languages)), silentTranslationWarn: true }); }
function backup(name, id) { return { name, id, url: '/backups/' + name, size: '1 MB', createdAt: '09-05-2026 10:00' }; }
function setup(locale = 'en-gb') {
    const calls = { sends: [], emits: [], commits: [], folders: [], filenameElements: [] };
    const listeners = {};
    const api = {
        send: (...args) => calls.sends.push(args),
        receiveOnce: (event, callback) => { listeners[event] = callback; },
        shellShowItemInFolder: url => calls.folders.push(url)
    };
    const document = { createElement(tag) {
        const element = { tag, textContent: '', style: {}, get outerHTML() {
            return '<strong style="overflow-wrap: anywhere;">' + this.textContent.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</strong>';
        } };
        calls.filenameElements.push(element);
        return element;
    } };
    const InlineNameEditor = component('basic-elements/InlineNameEditor.vue');
    const options = component('Backups.vue', { mainProcessAPI: api, document, InlineNameEditor,
        CollectionSortButton: component('basic-elements/CollectionSortButton.vue'), CollectionOrdering: evaluate(read('mixins/CollectionOrdering.js')),
        BackToTools: evaluate(read('mixins/BackToTools.js')), CollectionCheckboxes: evaluate(read('mixins/CollectionCheckboxes.js')) });
    const instance = new Vue({ ...options, i18n: i18n(locale) });
    instance.$store = { state: { currentSite: { config: { name: 'demo' } } }, commit: (...args) => calls.commits.push(args) };
    instance.$bus = { $emit: (...args) => calls.emits.push(args) };
    instance.$moment = () => ({ format: () => '09-05-2026-10-00-00' });
    instance.items = [backup('alpha.tar', 0), backup('beta.tar', 1)];
    instance.isLoading = false;
    return { instance, calls, listeners };
}
function editor(options = {}) {
    const instance = new Vue({ ...component('basic-elements/InlineNameEditor.vue'), i18n: i18n(), propsData: { value: 'alpha', ...options } });
    const events = [];
    instance.$on('save', (...args) => events.push(['save', ...args]));
    instance.$on('cancel', (...args) => events.push(['cancel', ...args]));
    instance.$refs.input = { focus() {}, select() {} };
    instance.$el = { contains: target => target === 'inside' };
    return { instance, events };
}
function emittedDialog(calls) { return calls.emits.find(([event]) => event === 'confirm-display')[1]; }

describe('Backup actions', () => {
    it('sorts names naturally, exact byte sizes numerically and creation dates chronologically', () => {
        const { instance: b } = setup();
        b.items = [
            {...backup('copy2.tar', 4), size: '0.00 MB', sizeBytes: 2, createdAt: '12-31-2025 23:59', createdAtTimestamp: Date.UTC(2025,11,31,23,59)},
            {...backup('copy10.tar', 9), size: '0.00 MB', sizeBytes: 100, createdAt: '01-01-2026 00:00', createdAtTimestamp: Date.UTC(2026,0,1)}
        ];
        assert.deepEqual(Array.from(b.sortedItems, item=>item.id), [9,4]);
        b.ordering('sizeBytes'); assert.deepEqual(Array.from(b.sortedItems, item=>item.id), [9,4]);
        b.ordering('sizeBytes'); assert.deepEqual(Array.from(b.sortedItems, item=>item.id), [4,9]);
        b.ordering('name'); assert.deepEqual(Array.from(b.sortedItems, item=>item.name), ['copy10.tar','copy2.tar']);
        b.ordering('name'); assert.deepEqual(Array.from(b.sortedItems, item=>item.name), ['copy2.tar','copy10.tar']);
        assert.deepEqual(Array.from(b.items, item=>item.id), [4,9]);
    });
    it('keeps selected backup identities when sorting and sends their names for deletion', () => {
        const { instance: b, calls } = setup();
        b.selectedItems = [0]; b.ordering('name');
        assert.equal(b.sortedItems[0].id, 1); assert.deepEqual(Array.from(b.selectedItems), [0]);
        b.bulkDelete(); emittedDialog(calls).okClick();
        assert.deepEqual(Array.from(calls.sends[0][1].backupsNames), ['alpha.tar']);
    });
    it('keeps the edited or restoring row in place and retains ordering when the list is refreshed', () => {
        const { instance: b, listeners } = setup();
        b.ordering('name'); b.renameFile('alpha.tar'); b.ordering('sizeBytes');
        assert.equal(b.orderBy,'name'); b.cancelRename(undefined,{restoreFocus:false});
        b.create('new'); b.ordering('sizeBytes'); assert.equal(b.orderBy,'name');
        listeners['app-backup-created']({status:true,backups:[backup('alpha.tar',0),backup('zeta.tar',2)]});
        assert.equal(b.orderBy,'name'); assert.equal(b.order,'DESC'); assert.equal(b.sortedItems[0].name,'zeta.tar');
    });
    for (const locale of ['en-gb', 'pl']) {
        it(`${locale}: rename opens an inline editor with a protected tar suffix`, () => {
            const { instance: b, calls } = setup(locale);
            findButtons(b).find(button => button.label === b.$t('file.rename')).onClick();
            const inline = screen(b).find(node => node.componentOptions && node.componentOptions.Ctor.options.name === 'inline-name-editor');
            assert.equal(props(inline).value, 'alpha');
            assert.equal(props(inline).suffix, '.tar');
            const renderedEditor = new inline.componentOptions.Ctor({ propsData: props(inline) });
            assert.equal(renderedEditor.persistent, true);
            renderedEditor.$destroy();
            assert.equal(props(inline).saveLabel, b.$t('file.saveBackupName'));
            assert.equal(calls.emits.length, 0);
            assert.equal(calls.sends.length, 0);
            assert.ok(findButtons(b).filter(button => button.label !== b.$t('ui.backToTools')).every(button => button.disabled));
            b.restoreFile('beta.tar');
            b.createBackup();
            b.bulkDelete();
            assert.equal(calls.emits.length, 0);
            b.cancelRename(undefined, { restoreFocus: false });
            assert.equal(b.fileToRename, '');
            assert.ok(findButtons(b).every(button => !button.disabled));
        });
        it(`${locale}: restore confirmation identifies the file and uses the danger variant`, () => {
            const { instance: b, calls } = setup(locale);
            const filename = 'Zażółć & <copy>.tar';
            b.restoreFile(filename);
            const dialog = emittedDialog(calls);
            assert.equal(dialog.isDanger, true);
            assert.equal(dialog.okLabel, b.$t('file.restoreBackupConfirmLabel'));
            assert.equal(dialog.cancelLabel, b.$t('ui.cancel'));
            assert.equal(calls.filenameElements[0].textContent, filename);
            assert.equal(calls.filenameElements[0].style.overflowWrap, 'anywhere');
            assert.ok(dialog.message.includes('Zażółć &amp; &lt;copy&gt;.tar'));
            assert.equal(calls.sends.length, 0);
            dialog.okClick();
            assert.equal(calls.sends[0][0], 'app-backup-restore');
            assert.equal(calls.sends[0][1].backupName, filename);
            dialog.okClick();
            assert.equal(calls.sends.length, 1, 'busy restore cannot be submitted twice');
        });
        for (const success of [true, false]) {
            it(`${locale}: restore ${success ? 'success' : 'error'} resets only the appropriate row loader`, () => {
                const { instance: b, calls, listeners } = setup(locale);
                b.restoreFile('beta.tar');
                emittedDialog(calls).okClick();
                const buttons = findButtons(b);
                assert.equal(buttons.find(button => button.label === b.$t('file.createBackup')).loading, false);
                assert.deepEqual(buttons.filter(button => button.label === b.$t('file.restore')).map(button => button.loading), [false, true]);
                assert.equal(screen(b).filter(node => node.data && node.data.staticClass === 'backup-status').length, 1);
                assert.ok(screen(b).some(node => text(node) === b.$t('file.restoringBackup')));
                listeners['app-backup-restored']({ status: success, error: 'file.renameBackupErrorMsg' });
                assert.equal(b.operationInProgress, false);
                assert.equal(b.fileToRestore, '');
                assert.equal(findButtons(b).some(button => button.loading), false);
                assert.equal(screen(b).some(node => node.data && node.data.staticClass === 'backup-status'), false);
                const result = calls.emits.at(-1)[1];
                assert.equal(result.type, success ? 'success' : 'warning');
                if (success) {
                    assert.equal(calls.sends.at(-1)[0], 'app-site-reload');
                    listeners['app-site-reloaded']({ data: {} });
                    assert.deepEqual(calls.commits.map(call => call[0]), ['setSiteConfig', 'switchSite']);
                }
            });
        }
        it(`${locale}: canceled restore followed by creation shows only the create loader`, () => {
            const { instance: b, calls, listeners } = setup(locale);
            b.restoreFile('alpha.tar');
            emittedDialog(calls).cancelClick();
            assert.equal(b.fileToRestore, '');
            b.create('new-backup');
            assert.equal(calls.sends.at(-1)[0], 'app-backup-create');
            assert.equal(findButtons(b).find(button => button.label === b.$t('file.createBackup')).loading, true);
            assert.ok(findButtons(b).filter(button => button.label === b.$t('file.restore')).every(button => !button.loading));
            listeners['app-backup-created']({ status: false });
            assert.equal(b.operationInProgress, false);
            b.create('retry');
            listeners['app-backup-created']({ status: true, backups: [backup('retry.tar', 0)] });
            assert.equal(b.items[0].name, 'retry.tar');
            assert.equal(b.operationInProgress, false);
        });
    }
    it('empty-state creation and validation preserve the current behavior', () => {
        const { instance: b, calls, listeners } = setup();
        b.items = [];
        b.create('   ');
        assert.equal(calls.sends.length, 0);
        b.create('first');
        const button = findButtons(b).find(button => button.label === 'Create backup');
        assert.equal(button.loading, true);
        assert.equal(button['loading-layout'], 'overlay');
        assert.equal(button['aria-label'], 'Creating backup');
        assert.equal(button.disabled, true);
        listeners['app-backup-created']({ status: true, backups: [backup('first.tar', 0)] });
        assert.equal(b.noBackups, false);
    });
    it('invalid, duplicate and unchanged names never rename a file', () => {
        const { instance: b, calls } = setup();
        b.renameFile('alpha.tar');
        for (const value of ['', '  ', 'beta', 'two words', 'łódź', 'new.tar', '../name']) {
            b.rename(value);
            assert.ok(b.renameError);
            assert.equal(b.activeOperation, '');
        }
        b.rename('alpha', { restoreFocus: false });
        assert.equal(b.fileToRename, '');
        assert.equal(calls.sends.length, 0);
    });
    it('rename waits for IPC, preserves failed edits, and keeps selection on the same files', async () => {
        const { instance: b, calls, listeners } = setup();
        b.selectedItems = [0, 1];
        b.renameFile('alpha.tar');
        b.rename('gamma', { restoreFocus: false });
        assert.equal(b.fileToRename, 'alpha.tar');
        assert.equal(b.items[0].name, 'alpha.tar');
        assert.equal(b.activeOperation, 'rename');
        assert.equal(calls.sends[0][1].oldBackupName, 'alpha');
        assert.equal(calls.sends[0][1].newBackupName, 'gamma');
        b.rename('double');
        b.restoreFile('beta.tar');
        assert.equal(calls.sends.length, 1);
        listeners['app-backup-renamed']({ status: false, backups: [] });
        assert.equal(b.fileToRename, 'alpha.tar');
        assert.equal(b.items.length, 2);
        assert.ok(b.renameError);
        b.rename('gamma', { restoreFocus: false });
        listeners['app-backup-renamed']({ status: true, backups: [backup('beta.tar', 4), backup('gamma.tar', 9)] });
        assert.equal(b.fileToRename, '');
        assert.deepEqual(Array.from(b.selectedItems), [4, 9]);
        assert.equal(b.renameError, '');
        assert.equal(b.operationInProgress, false);
        b.showFileInFolder(b.items[1].url);
        assert.equal(calls.folders[0], '/backups/gamma.tar');
        b.restoreFile('gamma.tar');
        assert.ok(emittedDialog(calls).message.includes('gamma.tar'));
    });
    it('new backup copy falls back to English for older language packs', () => {
        const { instance: b, calls } = setup();
        b.$i18n.setLocaleMessage('older', { file: { restoreBackupConfirmMsg: 'Old generic message' } });
        b.$i18n.locale = 'older';
        b.restoreFile('alpha.tar');
        assert.ok(emittedDialog(calls).message.startsWith('Restore the backup'));
        assert.equal(b.$t('file.restoringBackup'), 'Restoring…');
        assert.equal(b.$t('file.saveBackupName'), 'Save name');
    });
});

describe('Inline name editor and menu compatibility', () => {
    it('menus use the shared editor and preserve rename validation and persistence', () => {
        const InlineNameEditor = component('basic-elements/InlineNameEditor.vue');
        const calls = [];
        const options = component('Menus.vue', {
            InlineNameEditor, Draggable: {}, Sortable: {}, MenuItem: {}, MenuItemEditor: {}, MenuPositionPopup: {},
            CollectionCheckboxes: evaluate(read('mixins/CollectionCheckboxes.js')),
            menuDragOptions: () => ({}), keepItemOutOfItsAncestors: () => true,
            clearTimeout: () => {}, setTimeout: () => 1,
            mainProcessAPI: { send: (...args) => calls.push(args) }
        });
        const menu = new Vue({ ...options, i18n: i18n() });
        menu.$store = {
            state: { currentSite: { config: { name: 'demo' }, menuStructure: [
                { name: 'Main menu', position: '', items: [] }, { name: 'Footer', position: '', items: [] }
            ] } },
            commit: (type, data) => { menu.items[data.index].name = data.newName; }
        };
        menu.$bus = { $emit: () => {} };
        menu.menuPositions = () => '';
        menu.startRename(0);
        const node = screen(menu).find(node => node.componentOptions && node.componentOptions.Ctor.options.name === 'inline-name-editor');
        assert.equal(props(node).value, 'Main menu');
        assert.equal(props(node).saveLabel, 'Save name');
        assert.notEqual(props(node).validate('Footer'), true);
        assert.notEqual(props(node).validate(''), true);
        assert.equal(props(node).validate('New menu'), true);
        const child = new node.componentOptions.Ctor({ propsData: props(node) });
        assert.equal(child.persistent, false);
        child.$destroy();
        node.componentOptions.listeners.save('New menu');
        assert.equal(menu.items[0].name, 'New menu');
        assert.equal(menu.renamedMenuIndex, null);
        menu.flushMenuStructureSave();
        assert.equal(calls[0][0], 'app-menu-update');
        menu.startRename(0);
        screen(menu).find(node => node.componentOptions && node.componentOptions.Ctor.options.name === 'inline-name-editor').componentOptions.listeners.cancel();
        assert.equal(menu.renamedMenuIndex, null);
        assert.equal(menu.items[0].name, 'New menu');
    });
    it('default menu behavior saves valid names and cancels unchanged or invalid blur', () => {
        for (const value of ['alpha', '', 'new']) {
            const { instance: e, events } = editor({ validate: name => !!name });
            e.draft = value;
            e.handleFocusOut({ relatedTarget: 'outside' });
            assert.equal(events[0][0], value === 'new' ? 'save' : 'cancel');
            assert.equal(e.closed, true);
        }
    });
    it('explicit invalid menu edits stay open and a valid Enter saves once', () => {
        const { instance: e, events } = editor({ validate: name => name ? true : 'Required' });
        e.draft = '';
        e.save();
        assert.equal(e.error, 'Required');
        assert.equal(e.closed, false);
        e.draft = 'new';
        e.onEnterKey({ isComposing: true });
        assert.equal(events.length, 0);
        e.onEnterKey({ isComposing: false });
        e.handleFocusOut({ relatedTarget: 'outside' });
        assert.equal(events.length, 1);
        assert.deepEqual(events[0].slice(0, 2), ['save', 'new']);
    });
    it('internal focus, cancel and unchanged value never cause a save', () => {
        const { instance: e, events } = editor();
        e.draft = 'new';
        e.handleFocusOut({ relatedTarget: 'inside' });
        assert.equal(events.length, 0);
        e.cancel();
        assert.equal(events[0][0], 'cancel');
        e.save();
        assert.equal(events.length, 1);
    });
    it('persistent edits prevent duplicate submission and retain failed drafts for explicit retry', async () => {
        const { instance: e, events } = editor({ persistent: true, suffix: '.tar' });
        e.draft = 'new';
        e.handleFocusOut({ relatedTarget: 'outside' });
        e.save();
        assert.equal(events.length, 1);
        assert.equal(events[0][2].restoreFocus, false);
        assert.equal(e.closed, false);
        e.pending = true;
        await Vue.nextTick();
        e.cancel();
        assert.equal(events.length, 1);
        e.errorMessage = 'Cannot rename';
        e.pending = false;
        await Vue.nextTick();
        assert.equal(e.draft, 'new');
        assert.equal(e.visibleError, 'Cannot rename');
        e.handleFocusOut({ relatedTarget: 'outside' });
        assert.equal(events.length, 1);
        e.save();
        assert.equal(events.length, 2);
        assert.equal(events[1][2].restoreFocus, true);
    });
    it('persistent validation errors stay below the field on blur', () => {
        const { instance: e, events } = editor({ persistent: true, validate: () => 'Name is taken' });
        e.draft = 'taken';
        e.handleFocusOut({ relatedTarget: null });
        assert.equal(e.visibleError, 'Name is taken');
        assert.equal(e.closed, false);
        assert.equal(events.length, 0);
        const rendered = screen(e);
        assert.equal(props(rendered.find(node => node.tag === 'input'))['aria-invalid'], 'true');
        assert.ok(rendered.some(node => props(node).role === 'alert' && text(node) === 'Name is taken'));
    });
});

describe('Backup button loading presentation', () => {
    it('keeps the existing loading behavior for other button consumers', () => {
        const button = new Vue({ ...component('basic-elements/Button.vue'), propsData: { loading: true, disabled: true, icon: 'plus' } });
        button.$slots.default = [button.$createElement('span', 'Create backup')];
        assert.equal(button.cssClasses['button-preloader'], true);
        assert.equal(button.cssClasses['button-disabled'], true);
        assert.equal(button.cssClasses['button-icon'], false);
        assert.equal(button.cssClasses['button-preloader-overlay'], false);
        assert.equal(text(button._render()), '');
        assert.equal(props(button._render()).disabled, true);
        button.$destroy();
    });
    it('retains layout content and native blocking while showing the overlay', () => {
        const button = new Vue({ ...component('basic-elements/Button.vue'), propsData: { loading: true, disabled: true, loadingLayout: 'overlay', icon: 'plus' } });
        button.$slots.default = [button.$createElement('span', 'Create backup')];
        const rendered = button._render();
        assert.equal(button.cssClasses['button-icon'], true);
        assert.equal(button.cssClasses['button-disabled'], false);
        assert.equal(button.cssClasses['button-preloader-overlay'], true);
        assert.equal(props(rendered).disabled, true);
        assert.equal(props(rendered)['aria-busy'], 'true');
        assert.equal(text(rendered), 'Create backup');
        assert.ok(nodes(rendered).some(node => node.data && node.data.class && node.data.class['button-label-hidden']));
        assert.ok(nodes(rendered).some(node => node.data && node.data.staticClass === 'preloader' && props(node)['aria-hidden'] === 'true'));
        button.loading = false;
        assert.equal(button.cssClasses['button-disabled'], true, 'ordinary disabled styling still applies outside loading');
        assert.equal(button.cssClasses['button-preloader-overlay'], false);
        button.$destroy();
    });
    it('opts in only create and restore actions and retains progress labels', () => {
        const { instance: b, calls } = setup();
        b.restoreFile('beta.tar');
        emittedDialog(calls).okClick();
        const buttons = findButtons(b);
        assert.ok(buttons.filter(button => ['Restore', 'Create backup'].includes(button.label)).every(button => button['loading-layout'] === 'overlay'));
        assert.ok(buttons.filter(button => button.label === 'Rename').every(button => !button['loading-layout']));
        assert.equal(buttons.find(button => button.loading)['aria-label'], b.$t('file.restoringBackup'));
    });
});
