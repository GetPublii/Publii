/* File Manager UI regression tests, included in npm test.
 * Vue templates are compiled; Electron and clipboard calls use test doubles. */
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
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const messages = Object.fromEntries(['en-gb','pl','de'].map(locale => [locale, JSON.parse(read('app/default-files/default-languages/' + locale + '/translations.json'))]));
const helperContext = {URL, Intl, exports:{}};
vm.runInNewContext(read('app/src/helpers/file-manager.js').replace(/export function /g, 'function ') + '\nexports.fileWebsiteURL = fileWebsiteURL; exports.sortFiles = sortFiles;', helperContext);
const helpers = helperContext.exports;
const { isGeneratedRootFile } = require('../../../shared/root-file-conflicts');
function mixin(name) {
    const context = { module: { exports: {} } };
    vm.runInNewContext(read('app/src/components/mixins/' + name + '.js').replace('export default', 'module.exports ='), context);
    return context.module.exports;
}
const source = compiler.parseComponent(read('app/src/components/FileManager.vue'));
const template = compiler.compile(source.template.content);
const tick = () => new Promise(resolve => setImmediate(resolve));
function file(name, size=1) { return {name, fullPath:'/fixture/'+name, size, createdAt:'2026-01-01', modifiedAt:'2026-01-01', revision:'revision-'+name, isFile:true, icon:'pdf'}; }
function setup(locale='en-gb', platform='darwin') {
    const calls = {requests:[], emits:[], listeners:[], unlisteners:[], copies:[], folders:[]};
    const rows = [file('a.pdf',100),file('b.pdf',2),file('REPORT.pdf',30)];
    const api = {getEnv:()=>({platformName:platform}),
        invoke:async (channel, data, ...rest)=>{ calls.requests.push([channel, data, ...rest]); return channel === 'app-file-manager:list' ? {status:true,files:rows.slice()} : {status:true}; },
        getPathForFile:file=>file.path, shellOpenPath:async()=>'', shellShowItemInFolder:async name=>calls.folders.push(name)};
    const document = {body:{classList:{contains:()=>false}},createElement:()=>({style:{},textContent:'',get outerHTML(){return '<strong>'+this.textContent.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')+'</strong>';}})};
    const globals = {module:{exports:{}},isGeneratedRootFile,...helpers,CollectionSortButton:{},Tooltip:{},mainProcessAPI:api,BackToTools:mixin('BackToTools'),CollectionCheckboxes:mixin('CollectionCheckboxes'),CollectionOrdering:mixin('CollectionOrdering'),
        navigator:{clipboard:{writeText:async text=>calls.copies.push(text)}},document,
        window:{addEventListener:(...a)=>calls.listeners.push(a),removeEventListener:(...a)=>calls.unlisteners.push(a)}};
    const timers = new Map();
    let timerID = 0;

    globals.setTimeout = (callback, delay) => {
        const id = ++timerID;
        timers.set(id, { callback, delay });
        return id;
    };
    globals.clearTimeout = id => timers.delete(id);

    vm.runInNewContext(source.script.content.replace(/^import .*;\s*$/gm,'').replace('export default','module.exports ='),globals);
    const options = {...globals.module.exports,render:new Function(template.render),staticRenderFns:template.staticRenderFns.map(s=>new Function(s))};
    const instance = new Vue({...options,i18n:new VueI18n({locale,fallbackLocale:'en-gb',messages:JSON.parse(JSON.stringify(messages)),silentTranslationWarn:true})});
    instance.$store={state:{currentSite:{config:{name:'demo',domain:'https://example.com/blog/'}},app:{config:{timeFormat:24}}}};
    instance.$moment=()=>({format:()=> 'Jan 01, 2026 10:00'});
    instance.$bus={$emit:(...args)=>calls.emits.push(args),$on:(...a)=>calls.listeners.push(a),$off:(...a)=>calls.unlisteners.push(a)};
    instance.items=rows.slice(); instance.$refs.search={value:'',isOpen:false};
    instance.$refs.conflict={focus(){}};
    return {
        instance,
        calls,
        api,
        options,
        rows,
        clipboard: globals.navigator.clipboard,
        timers,
        runtime: globals
    };
}

describe('File Manager refresh feedback', () => {
    it('blocks only a pending read and restarts refresh immediately during the animation tail', async () => {
        const { instance, calls, api, timers, runtime } = setup();
        const reads = [];
        runtime.Date = { now: () => 0 };
        api.invoke = channel => {
            calls.requests.push(channel);
            return new Promise(resolve => reads.push(resolve));
        };

        const firstRefresh = instance.refreshFiles();
        assert.equal(instance.isLoading, true);
        assert.equal(instance.isRefreshing, true);
        assert.equal(instance.refreshAnimationID, 1);
        await instance.refreshFiles();
        assert.equal(calls.requests.length, 1);

        reads[0]({ status: true, files: [file('updated.pdf')] });
        await firstRefresh;
        assert.equal(instance.items[0].name, 'updated.pdf');
        assert.equal(instance.isLoading, false);
        assert.equal(instance.isRefreshing, true);
        assert.equal(calls.emits.length, 0);
        assert.equal(timers.size, 1);

        const secondRefresh = instance.refreshFiles();
        assert.equal(calls.requests.length, 2);
        assert.equal(instance.isLoading, true);
        assert.equal(instance.refreshAnimationID, 2);
        assert.equal(timers.size, 0);

        reads[1]({ status: true, files: [file('newer.pdf')] });
        await secondRefresh;
        assert.equal(instance.items[0].name, 'newer.pdf');
        assert.equal(instance.isLoading, false);
        assert.equal(calls.emits.length, 0);
        const timer = Array.from(timers.values())[0];
        assert.equal(timer.delay, 800);
        timer.callback();
        assert.equal(instance.isRefreshing, false);
    });

    it('keeps refreshing during a slow read and adds no further animation delay', async () => {
        const { instance, api, calls, timers, runtime } = setup();
        let now = 0;
        let resolveRead;
        runtime.Date = { now: () => now };
        api.invoke = () => new Promise(resolve => {
            resolveRead = resolve;
        });

        const refresh = instance.refreshFiles();
        now = 1200;
        assert.equal(instance.isRefreshing, true);
        assert.equal(calls.emits.length, 0);
        resolveRead({ status: true, files: [] });
        await refresh;

        assert.equal(instance.items.length, 0);
        assert.equal(calls.emits.length, 0);
        const timer = Array.from(timers.values())[0];
        assert.equal(timer.delay, 0);
        timer.callback();
        assert.equal(instance.isRefreshing, false);
    });

    it('reports read failures without announcing success', async () => {
        for (const rejected of [false, true]) {
            const { instance, api, calls, options } = setup();
            api.invoke = async () => {
                if (rejected) {
                    throw new Error('Read failed');
                }

                return { status: false, code: 'permission' };
            };

            await instance.refreshFiles();

            assert.equal(calls.emits.length, 1);
            assert.equal(calls.emits[0][1].type, 'warning');
            assert.equal(calls.emits[0][1].message, instance.$t('file.manager.loadError'));
            options.beforeDestroy.call(instance);
        }
    });

    it('does not announce initial or automatic focus refreshes', async () => {
        const { instance, calls } = setup();

        await instance.loadFiles();
        instance.refreshOnFocus();
        await tick();

        assert.equal(calls.requests.length, 2);
        assert.equal(calls.emits.length, 0);
        assert.equal(instance.isRefreshing, false);
    });

    it('ignores a manual refresh superseded by a directory change', async () => {
        const { instance, api, calls, options } = setup();
        const reads = [];
        api.invoke = () => new Promise(resolve => reads.push(resolve));

        const refresh = instance.refreshFiles();
        instance.changeDirectory('media/files');
        reads[1]({ status: true, files: [file('media.pdf')] });
        await tick();
        reads[0]({ status: true, files: [file('root.pdf')] });
        await refresh;

        assert.equal(instance.items[0].name, 'media.pdf');
        assert.equal(calls.emits.length, 0);
        options.beforeDestroy.call(instance);
    });

    it('ignores a refresh result after leaving the view', async () => {
        const { instance, api, calls, options, timers } = setup();
        let resolveRead;
        api.invoke = () => new Promise(resolve => {
            resolveRead = resolve;
        });

        const refresh = instance.refreshFiles();
        options.beforeDestroy.call(instance);
        resolveRead({ status: true, files: [file('late.pdf')] });
        await refresh;

        assert.equal(instance.items[0].name, 'a.pdf');
        assert.equal(calls.emits.length, 0);
        assert.equal(timers.size, 0);
    });

    it('clears the remaining animation timer when the view is destroyed', async () => {
        const { instance, options, timers } = setup();

        await instance.refreshFiles();
        assert.equal(timers.size, 1);
        options.beforeDestroy.call(instance);
        assert.equal(timers.size, 0);
    });
});

describe('File Manager UI and IPC', () => {
    it('compiles the template without errors',()=>assert.deepEqual(template.errors,[]));
    it('filters case-insensitively and selects only visible filenames', () => {
        const {instance:f}=setup(); f.filterFiles('report'); assert.deepEqual(Array.from(f.filteredFiles, i=>i.name),['REPORT.pdf']);
        f.toggleAllCheckboxes(); assert.deepEqual(Array.from(f.selectedItems),['REPORT.pdf']);
        f.filterFiles('missing'); assert.equal(f.filteredFiles.length,0); assert.equal(f.selectedItems.length,0);
        f.toggleAllCheckboxes(); assert.equal(f.selectedItems.length,0);
    });
    it('keeps selection on the same file through sorting and clears it between directories', async () => {
        const {instance:f}=setup(); f.toggleSelection('b.pdf'); f.ordering('size'); f.ordering('size');
        assert.deepEqual(Array.from(f.filteredFiles,i=>i.name),['b.pdf','REPORT.pdf','a.pdf']);
        assert.deepEqual(Array.from(f.selectedItems),['b.pdf']); f.changeDirectory('media/files');
        assert.equal(f.selectedItems.length,0); assert.equal(f.items.length,0); await tick();
    });
    it('select-all excludes folders and toggles all visible files', () => {
        const {instance:f}=setup(); f.items.push({...file('folder'),isFile:false,isCatalog:true});
        f.toggleAllCheckboxes(); assert.equal(f.selectedItems.length,3); assert.equal(f.allVisibleSelected,true);
        f.toggleAllCheckboxes(); assert.equal(f.selectedItems.length,0); f.toggleSelection('folder'); assert.equal(f.selectedItems.length,0);
    });
    it('captures exact names and revisions before opening a deletion confirmation', async () => {
        const {instance:f,calls}=setup(); f.filterFiles('b.pdf'); f.toggleAllCheckboxes(); f.bulkDelete();
        const config=calls.emits[0][1]; assert.ok(config.message.includes('b.pdf')); assert.equal(config.isDanger,true);
        f.filterFiles('a.pdf'); config.okClick(); await tick();
        const request=calls.requests.find(([name])=>name==='app-file-manager:delete')[1];
        assert.deepEqual(JSON.parse(JSON.stringify(request.files)),[{name:'b.pdf',revision:'revision-b.pdf'}]);
        assert.equal(request.dirPath,'root-files');
    });
    it('never executes a stale confirmation after the directory changes', async () => {
        const {instance:f,calls}=setup(); f.confirmDelete([f.items[0]]); const confirm=calls.emits[0][1];
        f.changeDirectory('media/files'); confirm.okClick(); await tick();
        assert.equal(calls.requests.some(([name])=>name==='app-file-manager:delete'),false);
    });
    it('escapes filenames used in HTML confirmation messages',()=>{
        const {instance:f,calls}=setup(); f.confirmDelete([file('<img src=x onerror=alert(1)>.pdf')]);
        assert.ok(calls.emits[0][1].message.includes('&lt;img')); assert.ok(!calls.emits[0][1].message.includes('<img'));
    });
    it('ignores older list replies after a newer directory request completes', async () => {
        const {instance:f,api}=setup(); const pending=[]; api.invoke=()=>new Promise(resolve=>pending.push(resolve));
        const first=f.loadFiles(); f.changeDirectory('media/files');
        pending[1]({status:true,files:[file('media.pdf')]}); await tick();
        pending[0]({status:true,files:[file('root.pdf')]}); await first;
        assert.equal(f.items[0].name,'media.pdf'); assert.equal(f.isLoading,false);
    });
    it('does not render an empty-folder state while loading or after a read failure',async()=>{
        const {instance:f,api,calls}=setup(); f.items=[]; api.invoke=async()=>({status:false,code:'permission'});
        await f.loadFiles(); assert.equal(f.loadError,true); assert.equal(calls.emits.at(-1)[1].type,'warning');
        assert.ok(!JSON.stringify(f._render(),(key,value)=>['context','parent','componentInstance'].includes(key)?undefined:value).includes('noFileInRootDirInfo'));
    });
    it('reports partial deletion failures instead of announcing success',async()=>{
        const {instance:f,api,calls}=setup(); api.invoke=async channel=>channel.endsWith(':delete') ? {status:false,deleted:['a.pdf'],failed:[{name:'b.pdf',code:'permission'}]} : {status:true,files:[file('b.pdf')]};
        f.selectedItems=['a.pdf','b.pdf']; await f.deleteFiles(f.items,f.context());
        assert.equal(calls.emits.at(-1)[0],'alert-display'); assert.equal(f.failures[0].name,'b.pdf'); assert.deepEqual(Array.from(f.selectedItems),['b.pdf']);
    });
    it('uses isolated picker results and preserves the chosen directory for an entire batch',async()=>{
        const {instance:f,api,calls}=setup(); api.invoke=async(channel,data,...rest)=>{
            calls.requests.push([channel,data,...rest]);
            if(channel==='app-main-process-select-files')return{canceled:false,filePaths:['C:\\Downloads\\a.pdf','C:\\Downloads\\b.pdf']};
            if(channel==='app-file-manager:upload'){ f.changeDirectory('media/files'); return{status:true}; }
            return{status:true,files:[]};
        };
        await f.uploadFiles(); assert.equal(calls.requests[0][3].returnResult,true);
        const uploads=calls.requests.filter(([channel])=>channel.endsWith(':upload'));
        assert.equal(uploads.length,2); assert.ok(uploads.every(([,data])=>data.dirPath==='root-files'));
        assert.equal(f.dirPath,'root-files'); assert.equal(f.completed,2); assert.equal(f.busy,false);
    });
    it('filters the replacement picker and rejects another extension before confirmation or upload', async () => {
        const {instance:f,api,calls}=setup();
        api.invoke=async(...args)=>{calls.requests.push(args);return{canceled:false,filePaths:['C:\\Downloads\\photo.PNG']};};
        await f.replaceFile(f.items[0]);
        assert.deepEqual(JSON.parse(JSON.stringify(calls.requests[0][2])),[{name:'PDF',extensions:['pdf']}]);
        const [event,dialog]=calls.emits[0];
        assert.equal(event,'confirm-display'); assert.equal(dialog.okLabel,f.$t('file.manager.chooseFile'));
        assert.ok(dialog.message.includes('.pdf')); assert.ok(dialog.message.includes('has not been changed'));
        assert.notEqual(dialog.isDanger,true); assert.equal(calls.requests.length,1); assert.equal(f.busy,false);
        f.dirPath='media/files'; dialog.okClick(); await tick(); assert.equal(calls.requests.length,1);
    });
    it('accepts uppercase matching extensions and reports replacement success without upload counts', async () => {
        const {instance:f,api,calls}=setup();
        api.invoke=async(channel,data)=>{calls.requests.push([channel,data]);return channel==='app-main-process-select-files'?{canceled:false,filePaths:['/tmp/NEW.PDF']}:channel.endsWith(':list')?{status:true,files:[file('a.pdf')]}:{status:true};};
        await f.replaceFile(f.items[0]); const dialog=calls.emits[0][1];
        assert.equal(dialog.okLabel,f.$t('file.manager.replace')); await dialog.okClick();
        assert.equal(calls.requests[1][1].policy,'replace');
        assert.equal(calls.emits.at(-1)[1].message,f.$t('file.manager.replaced')); assert.equal(f.busy,false);
    });
    it('handles files without extensions and dotfiles consistently with filesystem replacement', async () => {
        const {instance:f,api,calls}=setup();
        for(const name of ['CNAME','.htaccess'])assert.equal(f.fileExtension(name),'');
        assert.equal(f.fileExtension('C:\\folder\\archive.TAR.GZ'),'gz');
        api.invoke=async()=>({canceled:false,filePaths:['/tmp/config.txt']});
        await f.replaceFile(file('.htaccess'));
        assert.ok(calls.emits[0][1].message.includes('without a filename extension')); assert.equal(f.busy,false);
    });
    it('releases picker state on cancellation or failure without starting a transfer', async () => {
        const {instance:f,api,calls}=setup();
        api.invoke=async()=>({canceled:true,filePaths:[]}); await f.uploadFiles(); await f.replaceFile(f.items[0]);
        assert.equal(f.busy,false); assert.equal(calls.emits.length,0);
        api.invoke=async()=>{throw new Error('picker failed');}; await f.replaceFile(f.items[0]);
        assert.equal(f.busy,false); assert.equal(calls.emits.at(-1)[1].type,'warning');
    });
    it('reports replacement errors in context and does not reuse their details for a later error', async () => {
        const {instance:f,api,calls}=setup();
        api.invoke=async channel=>channel.endsWith(':list')?{status:true,files:[file('a.pdf')]}:{status:false,code:'permission'};
        await f.uploadQueue(['/tmp/new.pdf'],f.context(),{name:'a.pdf',revision:'revision-a.pdf'});
        assert.equal(calls.emits.at(-1)[0],'alert-display');
        assert.ok(calls.emits.at(-1)[1].message.includes('Could not replace')); assert.ok(calls.emits.at(-1)[1].message.includes('a.pdf'));
        assert.ok(!calls.emits.at(-1)[1].message.includes('Failed: 1'));
        api.shellOpenPath=async()=> 'open failed'; await f.openFile(f.items[0]);
        assert.equal(calls.emits.at(-1)[0],'message-display'); assert.equal(calls.emits.at(-1)[1].message,f.$t('file.manager.openError'));
    });
    it('pauses duplicate handling, applies a deliberate choice and keeps its revision',async()=>{
        const {instance:f,api,calls}=setup(); api.invoke=async(channel,data)=>{calls.requests.push([channel,data]);return channel.endsWith(':list')?{status:true,files:[]} : data.policy==='replace'?{status:true}:{status:false,code:'exists',name:'a.pdf',revision:'duplicate-revision'};};
        const upload=f.uploadQueue(['/tmp/a.pdf'],f.context()); await tick();
        assert.equal(f.conflict.name,'a.pdf'); assert.equal(f.busy,true); f.resolveConflict('replace'); await upload;
        assert.equal(calls.requests[1][1].revision,'duplicate-revision'); assert.equal(f.completed,1); assert.equal(f.failures.length,0);
    });
    it('stops a paused duplicate queue without processing remaining files',async()=>{
        const {instance:f,api,calls}=setup(); api.invoke=async(channel,data)=>{calls.requests.push([channel,data]);return channel.endsWith(':list')?{status:true,files:[]}:{status:false,code:'exists',name:'a.pdf'};};
        const upload=f.uploadQueue(['/tmp/a.pdf','/tmp/b.pdf'],f.context()); await tick(); f.stopUpload(); await upload;
        assert.equal(calls.requests.filter(([channel])=>channel.endsWith(':upload')).length,1);
        assert.equal(f.busy,false); assert.equal(f.conflict,null); assert.equal(f.completed,0);
    });
    it('rejects duplicate submissions and blocks leaving during file operations',async()=>{
        const {instance:f,options,calls}=setup(); f.operation='upload'; let canLeave;
        options.beforeRouteLeave.call(f,{}, {}, value=>{canLeave=value;}); assert.equal(canLeave,false);
        await f.uploadFiles(); await f.createFile('a.txt',f.context()); f.bulkDelete(); await f.copyLocalPath(f.items[0]); assert.equal(calls.copies.length,0); assert.equal(calls.requests.length,0); assert.equal(calls.emits.length,0);
    });
    it('cleans only its own search/focus listeners and ignores replies after destruction',async()=>{
        const {instance:f,options,api,calls}=setup(); let resolve; api.invoke=()=>new Promise(r=>{resolve=r;});
        options.mounted.call(f); options.beforeDestroy.call(f); resolve({status:true,files:[file('late.pdf')]}); await tick();
        assert.equal(f.items[0].name,'a.pdf');
        assert.equal(calls.unlisteners[0][0],f.searchEvent); assert.equal(calls.unlisteners[0][1],f.filterFiles);
        assert.equal(calls.unlisteners[1][0], 'focus');
    });
    it('uses shared bulk actions with disabled explanations and closes them when selection changes', async () => {
        const { instance: f } = setup();
        f.$store.state.currentSite.config = Vue.observable(f.$store.state.currentSite.config);
        let closes = 0;
        f.$refs.bulkMenu = {
            close () {
                closes += 1;
            }
        };
        f.selectedItems = ['a.pdf'];
        await tick();
        assert.equal(closes, 1);
        assert.deepEqual(Array.from(f.bulkActions, item => item.value), ['copy-urls', 'copy-paths']);
        assert.equal(f.bulkActions[0].disabled, false);
        assert.equal(f.bulkActions[1].disabled, false);
        assert.equal(f.bulkActions[0].onClick, f.bulkCopyURLs);
        assert.equal(f.bulkActions[1].onClick, f.bulkCopyLocalPaths);

        f.$store.state.currentSite.config.domain = '';
        assert.equal(f.bulkActions[0].disabled, true);
        assert.equal(f.bulkActions[0].disabledReason, f.$t('file.manager.copyURLsUnavailable'));
        assert.equal(f.bulkActions[1].disabled, false);

        f.operation = 'copy';
        await tick();
        assert.equal(closes, 2);
    });
    it('copies an encoded public URL with the site subdirectory intact',async()=>{
        const {instance:f,calls}=setup(); f.dirPath='media/files'; await f.copyURL(file('Zażółć #1%.pdf'));
        assert.equal(calls.copies[0],'https://example.com/blog/media/files/Za%C5%BC%C3%B3%C5%82%C4%87%20%231%25.pdf');
    });
    it('copies native paths unchanged on each platform without requiring a website address', async () => {
        const paths = [
            ['darwin', '/Users/Example/My site/Zażółć #1%.pdf'],
            ['linux', '/home/example/My site/Zażółć #1%.pdf'],
            ['win32', 'C:\\Users\\Example\\My site\\Zażółć #1%.pdf'],
            ['win32', '\\server\\share\\My site\\Zażółć #1%.pdf']
        ];
        for (const [platform, fullPath] of paths) {
            const {instance:f,calls}=setup('en-gb',platform);
            f.$store.state.currentSite.config.domain='';
            const actions=f.fileActions({...file('Zażółć #1%.pdf'),fullPath});
            const urlIndex=actions.findIndex(item=>item.label===f.$t('file.manager.copyURL'));
            const action=actions[urlIndex+1];
            assert.equal(actions[urlIndex].disabled,true);
            assert.equal(action.label,f.$t('file.manager.copyLocalPath'));
            assert.equal(action.icon,'clipboard-copy'); assert.notEqual(action.disabled,true);
            await action.onClick();
            assert.deepEqual(calls.copies,[fullPath]);
            assert.equal(calls.emits.at(-1)[0],'message-display');
            assert.equal(calls.emits.at(-1)[1].type,'success');
            assert.equal(calls.emits.at(-1)[1].message,f.$t('file.manager.localPathCopied'));
        }
    });
    it('reports a clipboard failure without showing a success notification', async () => {
        const {instance:f,calls,clipboard}=setup('pl');
        clipboard.writeText=async()=>{throw new Error('Clipboard unavailable');};
        await f.copyLocalPath(f.items[0]);
        assert.equal(calls.emits.length,1);
        assert.equal(calls.emits[0][1].type,'warning');
        assert.equal(calls.emits[0][1].message,f.$t('file.manager.copyLocalPathError'));
    });
    it('duplicates through keep-both in the current directory and reports the generated filename', async () => {
        const {instance:f,api,calls}=setup(); f.dirPath='media/files'; f.selectedItems=['a.pdf'];
        api.invoke=async(channel,data)=>{
            calls.requests.push([channel,data]);
            return channel.endsWith(':list') ? {status:true,files:[file('a.pdf'),file('a (2).pdf')]} : {status:true,name:'a (2).pdf'};
        };
        await f.duplicateFile(f.items[0]);
        assert.deepEqual(JSON.parse(JSON.stringify(calls.requests[0])),['app-file-manager:upload',{
            siteName:'demo',dirPath:'media/files',source:'/fixture/a.pdf',name:'a.pdf',policy:'keep-both',sourceRevision:'revision-a.pdf'
        }]);
        assert.equal(f.busy,false); assert.deepEqual(Array.from(f.selectedItems),['a.pdf']);
        assert.ok(calls.emits.at(-1)[1].message.includes('a (2).pdf')); assert.equal(calls.emits.at(-1)[1].type,'success');
    });
    it('locks duplicate submissions and keeps the directory fixed until the copy completes', async () => {
        const {instance:f,api,calls}=setup(); let finish;
        api.invoke=(channel,data)=>{
            calls.requests.push([channel,data]);
            return channel.endsWith(':list') ? Promise.resolve({status:true,files:[file('a.pdf')]}) : new Promise(resolve=>{finish=resolve;});
        };
        const copy=f.duplicateFile(f.items[0]);
        await f.duplicateFile(f.items[0]); f.changeDirectory('media/files'); f.bulkDelete();
        assert.equal(calls.requests.length,1); assert.equal(f.dirPath,'root-files'); assert.equal(f.operation,'duplicate');
        finish({status:true,name:'a (2).pdf'}); await copy; assert.equal(f.busy,false);
    });
    it('does not duplicate folders or announce success after a failed copy', async () => {
        const {instance:f,api,calls}=setup();
        await f.duplicateFile({...file('folder'),isFile:false,isCatalog:true}); assert.equal(calls.requests.length,0);
        api.invoke=async channel=>channel.endsWith(':list') ? {status:true,files:[file('a.pdf')]} : {status:false,code:'space'};
        await f.duplicateFile(f.items[0]);
        assert.equal(f.busy,false); assert.equal(calls.emits.at(-1)[1].type,'warning'); assert.equal(calls.emits.at(-1)[1].message,f.errorMessage('space'));
    });
    for (const locale of ['en-gb', 'pl']) {
        it(`${locale}: copies selected URLs and paths in visible order, excluding folders`, async () => {
            const { instance: f, calls } = setup(locale);
            f.items = [file('space #.pdf'), file('a.pdf'), { ...file('folder'), isFile: false }];
            f.selectedItems = ['space #.pdf', 'folder', 'a.pdf'];
            f.dirPath = 'media/files';
            await f.bulkCopyURLs();
            await f.bulkCopyLocalPaths();

            assert.equal(calls.copies[0], 'https://example.com/blog/media/files/a.pdf\nhttps://example.com/blog/media/files/space%20%23.pdf');
            assert.equal(calls.copies[1], '/fixture/a.pdf\n/fixture/space #.pdf');
            assert.equal(calls.emits.length, 2);
            assert.equal(f.busy, false);
            assert.equal(f.selectedItems.length, 3);
        });
    }
    it('does not copy an empty or incomplete selection or copy while busy', async () => {
        const { instance: f, calls } = setup();
        await f.bulkCopyURLs();
        await f.bulkCopyLocalPaths();
        f.selectedItems = ['a.pdf', 'b.pdf'];
        f.$store.state.currentSite.config.domain = '';
        assert.equal(f.canCopySelectedURLs, false);
        await f.bulkCopyURLs();
        f.items[1].fullPath = '';
        assert.equal(f.canCopySelectedPaths, false);
        await f.bulkCopyLocalPaths();
        f.items[1].fullPath = '/fixture/b.pdf';
        f.operation = 'upload';
        await f.bulkCopyLocalPaths();
        assert.equal(calls.copies.length, 0);
    });
    it('unlocks after a rejected bulk clipboard write and reports one error', async () => {
        const { instance: f, calls, clipboard } = setup();
        f.selectedItems = ['a.pdf', 'b.pdf'];
        clipboard.writeText = async () => {
            throw new Error('Clipboard unavailable');
        };
        await f.bulkCopyURLs();
        assert.equal(f.busy, false);
        assert.equal(calls.emits.length, 1);
        assert.equal(calls.emits[0][1].type, 'warning');
    });
    it('duplicates a fixed batch and selects only failed files for retry', async () => {
        const { instance: f, calls, api } = setup();
        f.selectedItems = ['b.pdf', 'a.pdf'];
        api.invoke = async (channel, data) => {
            calls.requests.push([channel, data]);
            if (channel.endsWith(':list')) {
                return { status: true, files: [file('a.pdf'), file('b.pdf'), file('a (2).pdf')] };
            }
            f.changeDirectory('media/files');
            await f.bulkDuplicate();
            return data.name === 'a.pdf'
                ? { status: true, name: 'a (2).pdf' }
                : { status: false, code: 'space' };
        };
        await f.bulkDuplicate();

        const uploads = calls.requests.filter(([channel]) => channel.endsWith(':upload'));
        assert.equal(uploads.length, 2);
        assert.equal(uploads[0][1].name, 'a.pdf');
        assert.ok(uploads.every(([, data]) => data.dirPath === 'root-files' && data.policy === 'keep-both'));
        assert.equal(uploads[1][1].sourceRevision, 'revision-b.pdf');
        assert.equal(f.completed, 2);
        assert.equal(f.busy, false);
        assert.deepEqual(Array.from(f.selectedItems), ['b.pdf']);
        assert.equal(calls.emits.length, 1);
        assert.equal(calls.emits[0][0], 'alert-display');
        assert.ok(calls.emits[0][1].message.includes('Copies created: 1.'));
    });
    it('stops bulk duplication after the active file and preserves pending selection', async () => {
        const { instance: f, calls, api, rows } = setup();
        let finish;
        f.selectedItems = ['a.pdf', 'b.pdf'];
        api.invoke = (channel, data) => {
            calls.requests.push([channel, data]);
            if (channel.endsWith(':list')) {
                return Promise.resolve({ status: true, files: rows });
            }
            return new Promise(resolve => {
                finish = resolve;
            });
        };
        const task = f.bulkDuplicate();
        f.stopUpload();
        finish({ status: true, name: 'a (2).pdf' });
        await task;

        assert.equal(calls.requests.filter(([channel]) => channel.endsWith(':upload')).length, 1);
        assert.equal(f.completed, 1);
        assert.equal(f.busy, false);
        assert.deepEqual(Array.from(f.selectedItems), ['b.pdf']);
    });
    it('stops a bulk duplicate queue without stale feedback when the site changes', async () => {
        const { instance: f, calls, api } = setup();
        f.selectedItems = ['a.pdf', 'b.pdf'];
        api.invoke = async (channel, data) => {
            calls.requests.push([channel, data]);
            f.$store.state.currentSite.config.name = 'other-site';
            return { status: true, name: 'a (2).pdf' };
        };
        await f.bulkDuplicate();
        assert.equal(calls.requests.length, 1);
        assert.equal(calls.emits.length, 0);
        assert.equal(f.busy, false);
    });

    it('uses available SVG icons for every action, with Duplicate instead of Rename', () => {
        const {instance:f}=setup(); const actions=f.fileActions(f.items[0]).filter(item=>!item.separator);
        const map=read('app/src/assets/svg/svg-map.svg');
        for(const item of actions) assert.ok(map.includes('id="'+item.icon+'"'),item.label);
        assert.ok(actions.some(item=>item.label===f.$t('file.manager.duplicateFile')));
        assert.ok(!actions.some(item=>item.label===f.$t('file.rename')));
    });
    for(const platform of ['darwin','win32','linux'])it(`uses the appropriate reveal action on ${platform}`,()=>{
        const {instance:f}=setup('en-gb',platform); const labels=f.fileActions(f.items[0]).map(item=>item.label);
        assert.ok(labels.includes(platform==='darwin'?'Show in Finder':platform==='win32'?'Show in File Explorer':'Show in folder'));
    });
    for(const locale of ['en-gb','pl'])it(`${locale}: all new strings resolve, including errors and interpolated labels`,()=>{
        const {instance:f}=setup(locale);
        for(const key of Object.keys(messages[locale].file.manager).filter(key=>key!=='errors'))assert.notEqual(f.$t('file.manager.'+key),'file.manager.'+key);
        assert.equal(f._render().tag,'section'); assert.ok(f.fileActions(f.items[0]).length>3);
        f.$i18n.setLocaleMessage('older',{}); f.$i18n.locale='older'; assert.equal(f.$t('file.manager.replace'),'Replace');
    });
});

describe('File Manager public addresses and ordering',()=>{
    it('encodes filenames and preserves the domain path for both directories',()=>{
        assert.equal(helpers.fileWebsiteURL('https://example.com/blog/','root-files',"it's #1%.pdf"),'https://example.com/blog/it%27s%20%231%25.pdf');
        assert.equal(helpers.fileWebsiteURL('https://example.com','media/files','a.pdf'),'https://example.com/media/files/a.pdf');
        for(const domain of ['', 'javascript:alert(1)', 'file:///tmp', 'https://user:pass@example.com'])assert.equal(helpers.fileWebsiteURL(domain,'root-files','a.pdf'),'');
    });
    it('sorts raw numeric sizes rather than their display labels and does not mutate inputs',()=>{
        const files=[file('file10.pdf',100),file('file2.pdf',2)];
        assert.equal(helpers.sortFiles(files,'name','ASC','en-gb')[0].name,'file2.pdf');
        assert.equal(helpers.sortFiles(files,'size','DESC','pl')[0].size,100); assert.equal(files[0].name,'file10.pdf');
    });
});

describe('Shared Electron file picker compatibility',()=>{
    it('retains the legacy event contract and emits no global event for direct requests',async()=>{
        let handler, properties, defaultPath; const sends=[], remembered=[];
        const dialogsState={getLastDirectory:()=>'/tmp/last',rememberDirectoryFromResult:(name,result)=>remembered.push([name,result])};
        const code=read('app/main.js'); const start=code.indexOf("    ipcMain.handle('app-main-process-select-files'"); const end=code.indexOf('\n    // Get available spellchecker languages',start);
        vm.runInNewContext(code.slice(start,end),{ipcMain:{handle:(name,fn)=>{handler=fn;}},BrowserWindow:{fromWebContents:()=>({})},dialogsState,dialog:{showOpenDialog:async(win,config)=>{properties=config.properties;defaultPath=config.defaultPath;return{canceled:false,filePaths:['/tmp/a.pdf']};}}});
        const event={sender:{send:(...args)=>sends.push(args)}};
        assert.equal(handler(event,'legacy',[]),undefined); await tick(); assert.equal(sends.length,1); assert.equal(sends[0][0],'app-files-selected'); assert.equal(sends[0][1].fieldName,'legacy');
        const result=await handler(event,false,[],{returnResult:true,multiple:false});
        assert.equal(result.filePaths[0],'/tmp/a.pdf'); assert.equal(sends.length,1); assert.deepEqual(Array.from(properties),['openFile']);
        // Electron 43 opens every dialog in Downloads unless the previous directory is restored
        assert.equal(defaultPath,'/tmp/last'); assert.equal(remembered.length,2); assert.deepEqual(remembered[0],['files',{canceled:false,filePaths:['/tmp/a.pdf']}]);
    });
});


describe('Shared listing conventions', () => {
    it('listings share their arrows and ordering controls', () => {
        for (const name of ['Posts', 'Pages', 'Tags', 'Authors']) {
            const code = read('app/src/components/' + name + '.vue');
            assert.ok(code.includes('collection-sorting.css'), name);
            assert.ok(code.includes('CollectionOrdering'), name);
        }
        for (const name of ['FileManager', 'Backups']) {
            const code = read('app/src/components/' + name + '.vue');
            assert.ok(code.includes('CollectionSortButton'), name);
            assert.ok(code.includes('CollectionOrdering'), name);
        }
        assert.ok(read('app/src/components/basic-elements/CollectionSortButton.vue').includes('collection-sorting.css'));
        assert.ok(!source.template.content.includes('Selected:'));
        assert.ok(!source.template.content.includes('directory-description'));
        assert.ok(!source.template.content.includes('file-message'));
        assert.ok(source.template.content.includes(':customCssClasses="\'file \' + item.icon"'));
        assert.ok(source.template.content.includes('class="tools"'));
    });
    it('preserves the existing descending-first toggle and saveOrdering callback', () => {
        const calls = []; const context = { orderBy: 'name', order: 'ASC', saveOrdering: (...args) => calls.push(args) };
        const ordering = mixin('CollectionOrdering').methods.ordering;
        ordering.call(context, 'size'); ordering.call(context, 'size'); ordering.call(context, 'name');
        assert.deepEqual(calls, [['size', 'DESC'], ['size', 'ASC'], ['name', 'DESC']]);
    });
});


describe('Shared confirmation compatibility', () => {
    function confirm() {
        const parsed = compiler.parseComponent(read('app/src/components/basic-elements/Confirm.vue'));
        assert.deepEqual(compiler.compile(parsed.template.content).errors, []);
        const context = { module: { exports: {} }, document: { body: { classList: { remove() {} } } }, setTimeout: () => { throw new Error('Delayed close can hide the next queued dialog'); } };
        vm.runInNewContext(parsed.script.content.replace('export default', 'module.exports ='), context);
        return context.module.exports;
    }
    it('retains legacy text and plain callbacks while passing opted-in choices separately', () => {
        const options = confirm(); const calls = [];
        for (const config of [{hasInput:true,choices:[],expected:['filename']},{hasInput:false,choices:[],expected:[]},{hasInput:false,choices:[{value:'skip'}],choice:'skip',checkValue:true,expected:['skip',true]}]) {
            const ctx = {...config,isVisible:true,$refs:{input:{content:'filename'}},okClick:(...args)=>calls.push(args),restoreDialogFocus(){}};
            options.methods.onOk.call(ctx); assert.deepEqual(calls.at(-1),config.expected); assert.equal(ctx.isVisible,false);
        }
    });
    it('leaves Enter on a navigation link to the native link action', () => {
        const options = confirm();
        const documentKeyDown = options.methods.onDocumentKeyDown;
        documentKeyDown.call({
            isVisible: true,
            dialogLabel: 'Theme change',
            onEnterKey() {
                throw new Error('Following a link must not confirm the theme change');
            }
        }, {
            key: 'Enter',
            code: 'Enter',
            isComposing: false,
            target: {
                closest(selector) {
                    return selector.includes('a[href]') ? {} : null;
                }
            },
            preventDefault() {
                throw new Error('The navigation link must keep its native keyboard action');
            }
        });
    });

    it('dismisses a navigation confirmation after preserving its draft without accepting or cancelling', () => {
        const options = confirm();
        const calls = [];
        const instance = {
            isVisible: true,
            link: { onClick: () => calls.push('draft') },
            restoreDialogFocus: () => calls.push('focus'),
            okClick() {
                throw new Error('Navigation must not accept');
            },
            cancelClick() {
                throw new Error('Navigation must not cancel the draft');
            }
        };
        options.methods.onLinkClick.call(instance, { button: 0 });
        assert.equal(instance.isVisible, false);
        assert.deepEqual(calls, ['draft', 'focus']);
    });

    it('does not schedule an old Enter timeout over the next queued File Manager dialog', () => {
        const options = confirm(); let accepted = false;
        options.methods.onEnterKey.call({dialogLabel:'Files',onOk(){accepted=true;return true;}});
        assert.equal(accepted,true);
    });
});

describe('File row menu disabled action explanations', () => {
    const parsedMenu = compiler.parseComponent(read('app/src/components/basic-elements/ActionMenu.vue'));
    const compiledMenu = compiler.compile(parsedMenu.template.content);
    const context = { module: { exports: {} }, Tooltip: {} };
    vm.runInNewContext(
        parsedMenu.script.content.replace(/^import .*;\s*$/gm, '').replace('export default', 'module.exports ='),
        context
    );

    function menuFor(items, i18n) {
        const instance = new Vue({
            ...context.module.exports,
            propsData: { items },
            i18n,
            render: new Function(compiledMenu.render),
            staticRenderFns: compiledMenu.staticRenderFns.map(code => new Function(code))
        });
        instance.isOpen = true;
        return instance;
    }

    function menuItems(instance) {
        function nodes(node) {
            return [node, ...(node.children || []).flatMap(nodes)];
        }
        return nodes(instance._render()).filter(node => node.data && node.data.attrs && node.data.attrs.role === 'menuitem');
    }

    it('compiles the shared menu template', () => {
        assert.deepEqual(compiledMenu.errors, []);
    });

    for (const locale of ['en-gb', 'pl', 'de']) {
        it(`${locale}: explains unavailable row URL copying and blocks activation`, () => {
            const { instance: manager, calls } = setup(locale);
            manager.$store.state.currentSite.config.domain = '/';
            const action = manager.fileActions(file('a.pdf')).find(item => item.icon === 'link-2');
            assert.equal(action.disabled, true);
            assert.equal(action.disabledReason, messages[locale].file.manager.copyURLsUnavailable);

            const menu = menuFor([action], manager.$i18n);
            const node = menuItems(menu)[0];
            assert.equal(node.data.attrs.disabled, false);
            assert.equal(node.data.attrs['aria-disabled'], 'true');
            assert.equal(node.data.attrs.tabindex, '-1');
            assert.equal(node.data.directives[0].value, action.disabledReason);

            let selections = 0;
            menu.$on('select', () => selections++);
            node.data.on.click({ stopPropagation () {}, detail: 1 });
            node.data.on.click({ stopPropagation () {}, detail: 0 });
            assert.equal(calls.copies.length, 0);
            assert.equal(selections, 0);
            assert.equal(menu.isOpen, true);

            manager.$store.state.currentSite.config.domain = 'https://example.com/';
            const enabledAction = manager.fileActions(file('a.pdf')).find(item => item.icon === 'link-2');
            assert.equal(enabledAction.disabled, false);
            menu.items = [enabledAction];
            const enabledNode = menuItems(menu)[0];
            assert.equal(enabledNode.data.attrs.disabled, false);
            assert.equal(enabledNode.data.attrs['aria-disabled'], null);
            assert.equal(enabledNode.data.directives[0].value, '');
            let closed = false;
            menu.close = () => { closed = true; };
            enabledNode.data.on.click({ stopPropagation () {}, detail: 1 });
            assert.equal(calls.copies.length, 1);
            assert.equal(selections, 1);
            assert.equal(closed, true);
        });
    }

    it('preserves native disabling for other menu actions without explanations', () => {
        const { instance: manager } = setup();
        const menu = menuFor([{ label: 'Delete', disabled: true }], manager.$i18n);
        assert.equal(menuItems(menu)[0].data.attrs.disabled, true);
    });
});

describe('File Manager root conflict confirmations with filesystem operations', () => {
    const os = require('node:os');
    const FileManager = require('../../../back-end/helpers/file-manager');
    let base;
    let rootFiles;
    let harness;

    async function waitFor(predicate) {
        const deadline = Date.now() + 3000;
        while (!predicate()) {
            assert.ok(Date.now() < deadline, 'expected file operation or dialog');
            await tick();
        }
    }

    function dialogs() {
        return harness.calls.emits.filter(([event]) => event === 'confirm-display').map(([, dialog]) => dialog);
    }

    function uploadSource(name, content = 'uploaded content') {
        const source = path.join(base, name);
        fs.writeFileSync(source, content);
        return source;
    }

    beforeEach(() => {
        base = fs.mkdtempSync(path.join(os.tmpdir(), 'publii-root-dialog-test-'));
        rootFiles = path.join(base, 'demo/input/root-files');
        fs.mkdirSync(rootFiles, { recursive: true });
        fs.mkdirSync(path.join(base, 'demo/input/media/files'), { recursive: true });
        harness = setup();
        const manager = new FileManager({ sitesDir: base }, () => 'txt');
        harness.api.invoke = async (channel, data) => {
            harness.calls.requests.push([channel, { ...data }]);
            return manager[channel.split(':')[1]](data);
        };
    });

    afterEach(() => {
        harness.options.beforeDestroy.call(harness.instance);
        fs.rmSync(base, { recursive: true, force: true });
    });

    for (const entry of ['picker', 'drop']) {
        it(`${entry}: waits for Add anyway before uploading a generated root filename`, async () => {
            const { instance: manager } = harness;
            const source = uploadSource('index.html');
            manager.pickFiles = async () => ({ canceled: false, filePaths: [source] });
            const upload = entry === 'picker'
                ? manager.uploadFiles()
                : manager.dropFiles({ dataTransfer: { files: [{ path: source }] } });
            await waitFor(() => dialogs().length === 1);
            const dialog = dialogs()[0];
            assert.equal(dialog.title, 'Potential file conflict');
            assert.equal(dialog.focusDialog, true);
            assert.equal(dialog.isDanger, true);
            assert.equal(dialog.okLabel, 'Add anyway');
            assert.equal(dialog.cancelLabel, 'Cancel');
            assert.ok(dialog.message.includes('index.html'));
            assert.equal(fs.existsSync(path.join(rootFiles, 'index.html')), false);
            assert.equal(manager.busy, true);
            dialog.okClick();
            await upload;
            assert.equal(fs.readFileSync(path.join(rootFiles, 'index.html'), 'utf8'), 'uploaded content');
            assert.equal(dialogs().length, 1);
            assert.equal(manager.busy, false);
        });
    }

    it('warns before manually creating an empty file and handles cancel without a success message', async () => {
        const { instance: manager, calls } = harness;
        const cancelled = manager.createFile(' robots.txt ', manager.context());
        await waitFor(() => dialogs().length === 1);
        assert.equal(fs.existsSync(path.join(rootFiles, 'robots.txt')), false);
        dialogs()[0].cancelClick();
        await cancelled;
        assert.equal(manager.busy, false);
        assert.equal(calls.emits.some(([event]) => event === 'message-display'), false);

        const confirmed = manager.createFile(' robots.txt ', manager.context());
        await waitFor(() => dialogs().length === 2);
        dialogs()[1].okClick();
        await confirmed;
        assert.equal(fs.readFileSync(path.join(rootFiles, 'robots.txt'), 'utf8'), '');
        assert.equal(manager.busy, false);
    });

    it('cancels one warned upload and continues the rest of the batch', async () => {
        const { instance: manager, calls } = harness;
        const upload = manager.uploadQueue([
            uploadSource('index.html'),
            uploadSource('ordinary.txt')
        ], manager.context());
        await waitFor(() => dialogs().length === 1);
        dialogs()[0].cancelClick();
        await upload;
        assert.equal(fs.existsSync(path.join(rootFiles, 'index.html')), false);
        assert.equal(fs.readFileSync(path.join(rootFiles, 'ordinary.txt'), 'utf8'), 'uploaded content');
        assert.equal(manager.completed, 2);
        assert.equal(manager.failures.length, 0);
        assert.ok(calls.emits.at(-1)[1].message.includes('Skipped: 1'));
    });

    for (const choice of ['replace', 'keep-both', 'skip']) {
        it(`${choice}: combines the existing duplicate prompt with the generated-file warning`, async () => {
            const { instance: manager } = harness;
            fs.writeFileSync(path.join(rootFiles, 'index.html'), 'old homepage');
            const upload = manager.uploadQueue([uploadSource('index.html')], manager.context());
            await waitFor(() => dialogs().length === 1);
            const dialog = dialogs()[0];
            assert.ok(dialog.message.includes('already exists'));
            assert.ok(dialog.message.includes('Publii may generate'));
            assert.equal(dialog.isDanger, true);
            assert.equal(dialog.choice, 'skip');
            assert.equal(dialog.checkLabel, '');
            dialog.okClick(choice, false);
            await upload;
            assert.equal(dialogs().length, 1);
            assert.equal(fs.readFileSync(path.join(rootFiles, 'index.html'), 'utf8'), choice === 'replace' ? 'uploaded content' : 'old homepage');
            assert.equal(fs.existsSync(path.join(rootFiles, 'index (2).html')), choice === 'keep-both');
        });
    }

    it('does not apply a remembered Replace choice to a generated filename without showing its warning', async () => {
        const { instance: manager } = harness;
        for (const name of ['ordinary.txt', 'index.html', 'another.txt']) {
            fs.writeFileSync(path.join(rootFiles, name), 'old content');
        }
        const upload = manager.uploadQueue([
            uploadSource('ordinary.txt'),
            uploadSource('index.html'),
            uploadSource('another.txt')
        ], manager.context());
        await waitFor(() => dialogs().length === 1);
        dialogs()[0].okClick('replace', true);
        await waitFor(() => dialogs().length === 2);
        assert.ok(dialogs()[1].message.includes('Publii may generate'));
        assert.equal(fs.readFileSync(path.join(rootFiles, 'index.html'), 'utf8'), 'old content');
        dialogs()[1].okClick('skip', false);
        await upload;
        assert.equal(dialogs().length, 2);
        assert.equal(fs.readFileSync(path.join(rootFiles, 'index.html'), 'utf8'), 'old content');
        assert.equal(fs.readFileSync(path.join(rootFiles, 'another.txt'), 'utf8'), 'uploaded content');
    });

    it('includes the warning in the explicit Replace dialog instead of opening another dialog', async () => {
        const { instance: manager } = harness;
        fs.writeFileSync(path.join(rootFiles, 'index.html'), 'old homepage');
        await manager.loadFiles();
        manager.pickFiles = async () => ({ canceled: false, filePaths: [uploadSource('replacement.html')] });
        await manager.replaceFile(manager.items[0]);
        const dialog = dialogs()[0];
        assert.ok(dialog.message.includes('Publii may generate'));
        assert.equal(dialog.isDanger, true);
        await dialog.okClick();
        assert.equal(dialogs().length, 1);
        assert.equal(fs.readFileSync(path.join(rootFiles, 'index.html'), 'utf8'), 'uploaded content');
    });

    it('keeps media/files creation and upload free of root warnings', async () => {
        const { instance: manager } = harness;
        manager.dirPath = 'media/files';
        await manager.createFile('robots.txt', manager.context());
        await manager.uploadQueue([uploadSource('index.html')], manager.context());
        assert.equal(dialogs().length, 0);
        assert.equal(fs.existsSync(path.join(base, 'demo/input/media/files/robots.txt')), true);
        assert.equal(fs.existsSync(path.join(base, 'demo/input/media/files/index.html')), true);
    });

    for (const operation of ['create', 'upload']) {
        for (const change of ['site', 'destroy']) {
            it(`${operation}: ignores approval after ${change}`, async () => {
                const { instance: manager, options, calls } = harness;
                const pending = operation === 'create'
                    ? manager.createFile('index.html', manager.context())
                    : manager.uploadQueue([uploadSource('index.html')], manager.context());
                await waitFor(() => dialogs().length === 1);
                if (change === 'site') {
                    manager.$store.state.currentSite.config.name = 'other';
                } else {
                    options.beforeDestroy.call(manager);
                }
                dialogs()[0].okClick();
                await pending;
                assert.equal(fs.existsSync(path.join(rootFiles, 'index.html')), false);
                assert.equal(calls.requests.length, 1);
                assert.equal(manager.busy, false);
            });
        }
    }

    it('finishes and counts an in-flight upload when Stop remaining files is requested', async () => {
        const { instance: manager, api } = harness;
        const invoke = api.invoke;
        api.invoke = async (channel, config) => {
            const result = await invoke(channel, config);
            if (channel.endsWith(':upload') && result.status) {
                manager.stopUpload();
            }
            return result;
        };
        await manager.uploadQueue([uploadSource('first.txt'), uploadSource('second.txt')], manager.context());
        assert.equal(fs.existsSync(path.join(rootFiles, 'first.txt')), true);
        assert.equal(fs.existsSync(path.join(rootFiles, 'second.txt')), false);
        assert.equal(manager.completed, 1);
        assert.equal(manager.busy, false);
    });
});

describe('File conflict dialog without an initially selected action', () => {
    function setupConfirmation() {
        let display;
        let focused;
        const dialog = { focus: () => { focused = 'dialog'; } };
        const parsed = compiler.parseComponent(read('app/src/components/basic-elements/Confirm.vue'));
        const context = {
            module: { exports: {} },
            document: {
                activeElement: null,
                body: {
                    classList: { add() {} },
                    addEventListener() {}
                }
            },
            setTimeout: callback => callback()
        };
        vm.runInNewContext(parsed.script.content.replace('export default', 'module.exports ='), context);
        const definition = context.module.exports;
        const instance = {
            ...definition.data.call({ $t: key => key }),
            $t: key => key,
            $bus: { $on: (event, callback) => { display = callback; } },
            $refs: {
                dialog,
                okButton: { $el: { focus: () => { focused = 'ok'; } } },
                cancelButton: { $el: { focus: () => { focused = 'cancel'; } } }
            }
        };
        definition.mounted.call(instance);
        return { definition, instance, display, focused: () => focused };
    }

    it('focuses the warning container and preserves the default for subsequent confirmations', () => {
        const harness = setupConfirmation();
        harness.display({ dialogLabel: 'File conflict', focusDialog: true, isDanger: true });
        assert.equal(harness.focused(), 'dialog');
        harness.display({ dialogLabel: 'Delete file', isDanger: true });
        assert.equal(harness.focused(), 'cancel');
        assert.equal(harness.instance.focusDialog, false);
        harness.display({ dialogLabel: 'Ordinary confirmation' });
        assert.equal(harness.focused(), 'ok');
    });

    it('does not choose an action when Enter is pressed before moving to a button', () => {
        const { definition, instance, display } = setupConfirmation();
        display({ dialogLabel: 'File conflict', focusDialog: true });
        let prevented = false;
        instance.onEnterKey = () => assert.fail('An action must be selected first');
        definition.methods.onDocumentKeyDown.call(instance, {
            key: 'Enter',
            code: 'Enter',
            target: instance.$refs.dialog,
            preventDefault: () => { prevented = true; }
        });
        assert.equal(prevented, true);
    });
});
