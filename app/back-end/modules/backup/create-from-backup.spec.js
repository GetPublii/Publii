/* Temp directories used when a website is created from a backup. Files are disposable fixtures in the system temp directory. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
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

    it('removes the unpacked backup of the given window only', () => {
        fs.mkdirSync(path.join(CreateFromBackup.getTempDir(app, 3), 'input'), { recursive: true });
        fs.mkdirSync(path.join(CreateFromBackup.getTempDir(app, 4), 'input'), { recursive: true });

        CreateFromBackup.removeTempDir(app, 3);
        CreateFromBackup.removeTempDir(app, 5);

        assert.equal(fs.existsSync(CreateFromBackup.getTempDir(app, 3)), false);
        assert.equal(fs.existsSync(CreateFromBackup.getTempDir(app, 4)), true);
    });
});
