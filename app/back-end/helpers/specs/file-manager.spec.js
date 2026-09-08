/* File Manager regression tests. All filesystem operations use disposable fixtures,
 * never the user's websites. Included in npm test. */
const assert = require('node:assert/strict');
const os = require('node:os');
const path = require('node:path');
const fs = require('fs-extra');
const FileManager = require('../file-manager');

describe('File Manager filesystem operations', () => {
    let base, root, media, source, manager;
    const context = { siteName: 'demo', dirPath: 'root-files' };
    beforeEach(async () => {
        base = await fs.mkdtemp(path.join(os.tmpdir(), 'publii-file-manager-test-'));
        root = path.join(base, 'demo/input/root-files');
        media = path.join(base, 'demo/input/media/files');
        source = path.join(base, 'download.pdf');
        await fs.ensureDir(root); await fs.ensureDir(media); await fs.writeFile(source, 'new PDF');
        manager = new FileManager({ sitesDir: base }, (ext, directory) => directory ? 'catalog' : ext.slice(1));
    });
    afterEach(async () => { await fs.remove(base); });
    const entry = async (name, manager) => (await manager.list(context)).files.find(file => file.name === name);
    it('lists raw sizes, timestamps, folders and stable revisions without touching files', async () => {
        await fs.writeFile(path.join(root, 'a.pdf'), 'abc'); await fs.ensureDir(path.join(root, 'folder'));
        await fs.writeFile(path.join(root, '.DS_Store'), 'ignored');
        const result = await manager.list(context);
        assert.equal(result.status, true); assert.equal(result.files.length, 2);
        const file = result.files.find(file => file.name === 'a.pdf');
        assert.equal(file.size, 3); assert.equal(file.isFile, true); assert.ok(file.revision);
        assert.equal(+file.createdAt, +(await fs.stat(file.fullPath)).birthtime);
        assert.equal(result.files.find(file => file.name === 'folder').isCatalog, true);
    });
    it('rejects traversal, absolute paths and directories outside the two managed locations', async () => {
        for (const config of [null, {}, {...context, siteName:'../demo'}, {...context, dirPath:'../'}, {...context, dirPath:'/tmp'}, {...context, dirPath:'media/posts'}]) {
            assert.equal((await manager.list(config)).status, false);
            assert.equal((await manager.create({...config, name:'test.txt'})).status, false);
        }
    });
    it('blocks unsafe destination names consistently on Windows, macOS and Linux', () => {
        for (const name of ['', '..', '../file', 'a/b', 'a\\b', 'CON', 'nul.txt', 'com1.txt', 'LPT9', 'COM¹.txt', 'a:stream', 'a?.pdf', 'a\0b', 'test.', 'test ']) assert.equal(FileManager.validNewName(name), false, name);
        for (const name of ['.htaccess', 'CNAME', 'Zażółć gęślą.pdf', 'price #1%.pdf', 'my-file.txt']) assert.equal(FileManager.validNewName(name), true, name);
    });
    it('creates empty files exclusively and never truncates an existing one', async () => {
        assert.equal((await manager.create({...context, name:'a.txt'})).status, true);
        await fs.writeFile(path.join(root, 'a.txt'), 'keep me');
        assert.equal((await manager.create({...context, name:'a.txt'})).code, 'exists');
        assert.equal(await fs.readFile(path.join(root, 'a.txt'), 'utf8'), 'keep me');
    });
    it('adds into the requested directory and detects duplicates without overwriting', async () => {
        const result = await manager.upload({...context, source}); assert.equal(result.status, true);
        await fs.writeFile(source, 'changed');
        const duplicate = await manager.upload({...context, source}); assert.equal(duplicate.code, 'exists'); assert.ok(duplicate.revision);
        assert.equal(await fs.readFile(path.join(root, 'download.pdf'), 'utf8'), 'new PDF');
        assert.equal((await fs.readdir(media)).length, 0);
    });
    it('keeps both by finding the next available filename, including multi-dot and hidden files', async () => {
        for (const name of ['archive.tar.gz', '.htaccess']) {
            const input = path.join(base, name); await fs.writeFile(input, 'new');
            await manager.upload({...context, source:input});
            const copy = await manager.upload({...context, source:input, policy:'keep-both'});
            const parsed = path.parse(name);
            assert.equal(copy.name, parsed.name + ' (2)' + parsed.ext);
            assert.equal((await manager.upload({...context, source:input, policy:'keep-both'})).name, parsed.name + ' (3)' + parsed.ext);
        }
    });
    it('replaces contents, preserves URL/name and permissions, and removes staging files', async () => {
        const target = path.join(root, 'price-list.pdf'); await fs.writeFile(target, 'old', {mode:0o644});
        const file = await entry('price-list.pdf', manager);
        const mode = (await fs.stat(target)).mode & 0o777;
        const result = await manager.upload({...context, source, name:file.name, revision:file.revision, policy:'replace'});
        assert.equal(result.status, true); assert.equal(await fs.readFile(target, 'utf8'), 'new PDF');
        assert.equal((await fs.stat(target)).mode & 0o777, mode);
        assert.deepEqual(await fs.readdir(path.join(base, 'demo')), ['input']);
    });
    it('duplicates a listed file into an independent copy without changing the original', async () => {
        for (const dirPath of ['root-files', 'media/files']) {
            const config = { ...context, dirPath };
            await manager.upload({ ...config, source });
            const original = (await manager.list(config)).files[0];
            const result = await manager.upload({ ...config, source: original.fullPath, name: original.name,
                policy: 'keep-both', sourceRevision: original.revision });
            assert.equal(result.status, true); assert.equal(result.name, 'download (2).pdf');
            const copy = path.join(path.dirname(original.fullPath), result.name);
            assert.equal(await fs.readFile(copy, 'utf8'), 'new PDF');
            await fs.writeFile(copy, 'changed copy');
            assert.equal(await fs.readFile(original.fullPath, 'utf8'), 'new PDF');
            assert.equal(FileManager.revision(await fs.stat(original.fullPath)), original.revision);
            const next = await manager.upload({ ...config, source: original.fullPath, name: original.name,
                policy: 'keep-both', sourceRevision: original.revision });
            assert.equal(next.name, 'download (3).pdf');
            assert.equal(await fs.readFile(copy, 'utf8'), 'changed copy');
        }
    });
    it('refuses to duplicate a source that changed or disappeared after listing', async () => {
        await manager.upload({ ...context, source });
        const original = await entry('download.pdf', manager);
        const config = { ...context, source: original.fullPath, name: original.name, policy: 'keep-both', sourceRevision: original.revision };
        await fs.writeFile(original.fullPath, 'external edit');
        assert.equal((await manager.upload(config)).code, 'changed');
        await fs.unlink(original.fullPath);
        assert.equal((await manager.upload(config)).code, 'changed');
        assert.deepEqual(await fs.readdir(root), []);
    });
    it('does not publish a duplicate when the source changes while copying', async () => {
        await manager.upload({ ...context, source });
        const original = await entry('download.pdf', manager); const copyFile = fs.copyFile;
        fs.copyFile = async (...args) => { await copyFile(...args); await fs.writeFile(original.fullPath, 'external edit'); };
        try {
            assert.equal((await manager.upload({ ...context, source: original.fullPath, name: original.name,
                policy: 'keep-both', sourceRevision: original.revision })).code, 'changed');
        } finally { fs.copyFile = copyFile; }
        assert.deepEqual(await fs.readdir(root), ['download.pdf']);
        assert.equal(await fs.readFile(original.fullPath, 'utf8'), 'external edit');
        assert.deepEqual(await fs.readdir(path.join(base, 'demo')), ['input']);
    });
    it('publishes only a complete new file and supports filesystems without hard links', async () => {
        const link = fs.link;
        fs.link = async (staged, target) => {
            assert.equal(await fs.readFile(staged, 'utf8'), 'new PDF');
            assert.equal(await fs.pathExists(target), false);
            assert.equal(path.relative(path.join(base, 'demo/input'), staged).startsWith('..'), true);
            throw Object.assign(new Error('no hard links'), { code: 'ENOTSUP' });
        };
        try { assert.equal((await manager.upload({...context, source})).status, true); }
        finally { fs.link = link; }
        assert.equal(await fs.readFile(path.join(root, 'download.pdf'), 'utf8'), 'new PDF');
        assert.deepEqual(await fs.readdir(path.join(base, 'demo')), ['input']);
    });
    it('exclusive publication does not overwrite a file created by another window', async () => {
        const link = fs.link; const target = path.join(root, 'download.pdf');
        fs.link = async (staged, destination) => {
            await fs.writeFile(destination, 'other window');
            return link(staged, destination);
        };
        try { assert.equal((await manager.upload({...context, source})).code, 'exists'); }
        finally { fs.link = link; }
        assert.equal(await fs.readFile(target, 'utf8'), 'other window');
    });
    it('refuses replacement if the file changed or disappeared after confirmation', async () => {
        const target = path.join(root, 'price.pdf'); await fs.writeFile(target, 'old');
        const original = await entry('price.pdf', manager);
        await fs.writeFile(target, 'edited externally');
        assert.equal((await manager.upload({...context, source, name:original.name, revision:original.revision, policy:'replace'})).code, 'changed');
        assert.equal(await fs.readFile(target, 'utf8'), 'edited externally');
        await fs.unlink(target);
        assert.equal((await manager.upload({...context, source, name:original.name, revision:original.revision, policy:'replace'})).code, 'changed');
        assert.equal(await fs.pathExists(target), false);
    });
    it('preserves the original after a failed copy or rename', async () => {
        const target = path.join(root, 'price.pdf'); await fs.writeFile(target, 'old');
        for (const method of ['copyFile', 'rename']) {
            const file = await entry('price.pdf', manager); const original = fs[method];
            fs[method] = async () => { throw Object.assign(new Error('fixture failure'), {code:'EACCES'}); };
            try { assert.equal((await manager.upload({...context, source, name:file.name, revision:file.revision, policy:'replace'})).code, 'permission'); }
            finally { fs[method] = original; }
            assert.equal(await fs.readFile(target, 'utf8'), 'old');
            assert.deepEqual(await fs.readdir(path.join(base, 'demo')), ['input']);
        }
    });
    it('does not replace files edited while the replacement is being copied', async () => {
        const target = path.join(root, 'price.pdf'); await fs.writeFile(target, 'old');
        const file = await entry('price.pdf', manager); const copy = fs.copyFile;
        fs.copyFile = async (...args) => { await copy(...args); await fs.writeFile(target, 'external edit'); };
        try { assert.equal((await manager.upload({...context, source, name:file.name, revision:file.revision, policy:'replace'})).code, 'changed'); }
        finally { fs.copyFile = copy; }
        assert.equal(await fs.readFile(target, 'utf8'), 'external edit');
    });
    it('rejects folders, same-file replacement and mismatched extensions', async () => {
        const folderResult = await manager.upload({
            ...context,
            source: media
        });
        assert.equal(folderResult.code, 'folder-upload-unsupported');
        await manager.upload({...context, source}); const file = await entry('download.pdf', manager);
        assert.equal((await manager.upload({...context, source:file.fullPath})).code, 'same-file');
        const image = path.join(base, 'image.png'); await fs.writeFile(image, 'PNG');
        assert.equal((await manager.upload({...context, source:image, name:file.name, revision:file.revision, policy:'replace'})).code, 'extension');
    });
    it('deletes only named unchanged files and reports partial failures accurately', async () => {
        for (const name of ['a.pdf','b.pdf','c.pdf']) await fs.writeFile(path.join(root, name), name);
        const files = (await manager.list(context)).files;
        await fs.writeFile(path.join(root, 'b.pdf'), 'external edit');
        const result = await manager.remove({...context, files:files.filter(file => file.name !== 'c.pdf')});
        assert.equal(result.status, false); assert.deepEqual(result.deleted, ['a.pdf']);
        assert.deepEqual(result.failed, [{name:'b.pdf',code:'changed'}]);
        assert.deepEqual((await fs.readdir(root)).sort(), ['b.pdf','c.pdf']);
    });
    it('refuses directory deletion and unsafe names without touching other files', async () => {
        await fs.ensureDir(path.join(root, 'folder')); const folder = await entry('folder', manager);
        const result = await manager.remove({...context, files:[folder, {name:'../download.pdf', revision:'x'}]});
        assert.equal(result.status, false); assert.equal(result.failed.length, 2);
        assert.equal(await fs.pathExists(source), true); assert.equal(await fs.pathExists(folder.fullPath), true);
    });
    it('does not follow destination symlinks', async function () {
        try { await fs.symlink(source, path.join(root, 'alias.pdf')); } catch (error) { if (error.code === 'EPERM') this.skip(); else throw error; }
        const file = await entry('alias.pdf', manager); assert.equal(file.isSymbolicLink, true); assert.equal(file.isFile, false);
        assert.equal((await manager.upload({...context, source, name:'alias.pdf'})).code, 'files-only');
        assert.equal((await manager.remove({...context, files:[file]})).status, false);
        assert.equal(await fs.readFile(source, 'utf8'), 'new PDF');
    });
});
