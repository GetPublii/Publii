/* Temp directories used when a website is created from a backup. Files are disposable fixtures in the system temp directory. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const tar = require('tar-fs');
const CreateFromBackup = require('./create-from-backup.js');

describe('Creating a website from a backup - temp directories', () => {
    let appDir;
    let app;

    beforeEach(() => {
        appDir = fs.mkdtempSync(path.join(os.tmpdir(), 'publii-create-from-backup-'));
        app = { appDir };
    });

    afterEach(() => {
        fs.rmSync(appDir, { recursive: true, force: true });
    });

    it('uses a separate directory for every window', () => {
        assert.equal(CreateFromBackup.getTempDir(app, 3), path.join(appDir, 'temp', 'backup-to-restore-3'));
        assert.equal(CreateFromBackup.getTempDir(app, 4), path.join(appDir, 'temp', 'backup-to-restore-4'));
        assert.equal(new CreateFromBackup(app, '/backup.tar', 3).tempDir, CreateFromBackup.getTempDir(app, 3));
    });

    it('falls back to the shared directory when the window is unknown or invalid', () => {
        let sharedDir = path.join(appDir, 'temp', 'backup-to-restore');

        assert.equal(CreateFromBackup.getTempDir(app), sharedDir);
        assert.equal(CreateFromBackup.getTempDir(app, '../../outside'), sharedDir);
        assert.equal(new CreateFromBackup(app, '/backup.tar').tempDir, sharedDir);
    });

    it('never empties another location through a linked temp directory', function () {
        let outsideDir = path.join(appDir, 'documents-of-the-user');
        let creator = new CreateFromBackup(app, '/backup.tar', 3);

        fs.mkdirSync(outsideDir);
        fs.writeFileSync(path.join(outsideDir, 'important.txt'), 'keep me');
        fs.mkdirSync(path.dirname(creator.tempDir), { recursive: true });

        try {
            fs.symlinkSync(outsideDir, creator.tempDir, 'dir');
        } catch (error) {
            // Creating symbolic links requires additional privileges on Windows
            this.skip();
        }

        creator.removeBackupFilesIfNecessary();

        assert.equal(fs.readFileSync(path.join(outsideDir, 'important.txt'), 'utf8'), 'keep me');
        assert.equal(fs.existsSync(creator.tempDir), false);

        // A regular directory is still emptied, not removed
        fs.mkdirSync(path.join(creator.tempDir, 'input'), { recursive: true });
        creator.removeBackupFilesIfNecessary();

        assert.deepEqual(fs.readdirSync(creator.tempDir), []);
    });

    it('unpacks a backup created on Windows', async () => {
        let siteDir = path.join(appDir, 'windows-site');
        let archivePath = path.join(appDir, 'windows.tar');

        for (let dir of ['config', 'media', 'themes']) {
            fs.mkdirSync(path.join(siteDir, 'input', dir), { recursive: true });
        }

        fs.writeFileSync(path.join(siteDir, 'input', 'db.sqlite'), 'db');
        fs.writeFileSync(path.join(siteDir, 'input', 'config', 'site.config.json'), JSON.stringify({ name: 'demo', displayName: 'Demo' }));

        // Windows reports every entry, directories included, as 0666
        await new Promise((resolve, reject) => {
            tar.pack(siteDir, { map: header => { header.mode = 0o666; return header; } })
                .on('error', reject)
                .pipe(fs.createWriteStream(archivePath))
                .on('error', reject)
                .on('close', resolve);
        });

        let creator = new CreateFromBackup(app, archivePath, 3);
        let result = await creator.prepareBackupToRestore();

        assert.equal(result.status, 'success');
        assert.deepEqual(result.data, { displayName: 'Demo', catalogName: 'demo' });

        if (process.platform !== 'win32') {
            assert.equal(fs.statSync(path.join(creator.tempDir, 'input', 'config')).mode & 0o700, 0o700);
        }
    });

    it('reports an invalid archive instead of crashing', async () => {
        let archivePath = path.join(appDir, 'broken.tar');
        fs.writeFileSync(archivePath, Buffer.alloc(1024, 0x41));

        let result = await new CreateFromBackup(app, archivePath, 3).prepareBackupToRestore();

        assert.deepEqual(result, { status: 'error', type: 'unpack-error' });
    });

    it('removes the unpacked backup of the given window only', () => {
        fs.mkdirSync(path.join(CreateFromBackup.getTempDir(app, 3), 'input'), { recursive: true });
        fs.mkdirSync(path.join(CreateFromBackup.getTempDir(app, 4), 'input'), { recursive: true });

        CreateFromBackup.removeTempDir(app, 3);
        CreateFromBackup.removeTempDir(app, 5);

        assert.equal(fs.existsSync(CreateFromBackup.getTempDir(app, 3)), false);
        assert.equal(fs.existsSync(CreateFromBackup.getTempDir(app, 4)), true);
    });
});
