/* Backup listing tests. Files are disposable fixtures in the system temp directory. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const filename = path.join(__dirname, 'backup.js');
const localRequire = createRequire(filename);
const context = { console, module: { exports: {} }, require: name => name === 'electron' ? { shell: {} } : localRequire(name) };
vm.runInNewContext(fs.readFileSync(filename, 'utf8'), context);
const Backup = context.module.exports;
const tar = localRequire('tar-fs');

function createSiteFiles (siteDir) {
    for (const dir of ['config', 'media', 'themes']) {
        fs.mkdirSync(path.join(siteDir, 'input', dir), { recursive: true });
    }

    fs.writeFileSync(path.join(siteDir, 'input', 'db.sqlite'), 'db');
    fs.writeFileSync(path.join(siteDir, 'input', 'config', 'site.config.json'), JSON.stringify({ name: 'demo', displayName: 'Demo' }));
}

// Windows reports every entry, directories included, as 0666
function packAsOnWindows (sourceDir, archivePath) {
    return new Promise((resolve, reject) => {
        tar.pack(sourceDir, { map: header => { header.mode = 0o666; return header; } })
            .on('error', reject)
            .pipe(fs.createWriteStream(archivePath))
            .on('error', reject)
            .on('close', resolve);
    });
}

function readEntryModes (archivePath, targetDir) {
    const modes = {};

    return new Promise((resolve, reject) => {
        fs.createReadStream(archivePath).pipe(tar.extract(targetDir, {
            map: header => {
                modes[header.name.replace(/\/$/, '')] = header.mode & 0o7777;
                return header;
            },
            finish: () => resolve(modes)
        })).on('error', reject);
    });
}

describe('Backup listing sort metadata', () => {
    it('exposes exact bytes and numeric dates while preserving existing display fields and initial order', () => {
        const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'publii-backup-list-'));
        try {
            const site = path.join(directory, 'demo'); fs.mkdirSync(site);
            fs.writeFileSync(path.join(site, 'small.tar'), 'a');
            fs.writeFileSync(path.join(site, 'larger.tar'), 'abc');
            fs.writeFileSync(path.join(site, 'ignored.txt'), 'not a backup');
            const files = Backup.loadList('demo', directory);
            assert.equal(files.length, 2);
            for (const file of files) {
                const stat = fs.statSync(file.url);
                assert.equal(file.sizeBytes, stat.size);
                assert.equal(file.createdAtTimestamp, Date.parse(stat.birthtime || stat.mtime));
                assert.equal(typeof file.size, 'string');
                assert.match(file.createdAt, /^\d{2}-\d{2}-\d{4} \d{2}:\d{2}$/);
            }
            assert.ok(files[0].createdAtTimestamp >= files[1].createdAtTimestamp);
            assert.deepEqual(Array.from(files, file => file.sizeBytes).sort((a,b) => a-b), [1,3]);
        } finally { fs.rmSync(directory, { recursive: true, force: true }); }
    });
});

describe('Backup archive permissions', () => {
    let directory;

    beforeEach(() => {
        directory = fs.mkdtempSync(path.join(os.tmpdir(), 'publii-backup-modes-'));
    });

    afterEach(() => {
        fs.rmSync(directory, { recursive: true, force: true });
    });

    it('stores fixed modes in the archive instead of the ones reported by the system', async () => {
        const siteDir = path.join(directory, 'site');
        const backupsDir = path.join(directory, 'backups');
        createSiteFiles(siteDir);
        fs.mkdirSync(backupsDir);

        if (process.platform !== 'win32') {
            fs.chmodSync(path.join(siteDir, 'input', 'media'), 0o700);
            fs.chmodSync(path.join(siteDir, 'input', 'db.sqlite'), 0o755);
        }

        const result = await Backup.create('demo', 'modes', backupsDir, siteDir);
        assert.equal(result.type, 'app-backup-create-success');

        const modes = await readEntryModes(path.join(backupsDir, 'demo', 'modes.tar'), path.join(directory, 'unpacked'));
        assert.equal(modes['input/media'], 0o755);
        assert.equal(modes['input/config'], 0o755);
        assert.equal(modes['input/db.sqlite'], 0o644);
        assert.equal(modes['input/config/site.config.json'], 0o644);
    });

    it('restores a backup created on Windows', async () => {
        const backupsDir = path.join(directory, 'backups');
        const sitesDir = path.join(directory, 'sites');
        const tempDir = path.join(directory, 'temp');
        createSiteFiles(path.join(directory, 'windows-site'));
        fs.mkdirSync(path.join(backupsDir, 'demo'), { recursive: true });
        fs.mkdirSync(sitesDir);
        await packAsOnWindows(path.join(directory, 'windows-site'), path.join(backupsDir, 'demo', 'windows.tar'));

        const result = await Backup.restore('demo', 'windows.tar', backupsDir, sitesDir, tempDir, null);
        assert.equal(result.type, 'app-backup-restore-success');

        const configDir = path.join(sitesDir, 'demo', 'input', 'config');
        assert.equal(JSON.parse(fs.readFileSync(path.join(configDir, 'site.config.json'), 'utf8')).name, 'demo');

        if (process.platform !== 'win32') {
            assert.equal(fs.statSync(configDir).mode & 0o700, 0o700);
            assert.equal(fs.statSync(path.join(configDir, 'site.config.json')).mode & 0o111, 0);
        }
    });

    it('reports an invalid archive instead of crashing', async () => {
        const backupsDir = path.join(directory, 'backups');
        const sitesDir = path.join(directory, 'sites');
        fs.mkdirSync(path.join(backupsDir, 'demo'), { recursive: true });
        fs.mkdirSync(path.join(sitesDir, 'demo', 'input'), { recursive: true });
        fs.writeFileSync(path.join(sitesDir, 'demo', 'input', 'db.sqlite'), 'current');
        fs.writeFileSync(path.join(backupsDir, 'demo', 'broken.tar'), Buffer.alloc(1024, 0x41));

        const result = await Backup.restore('demo', 'broken.tar', backupsDir, sitesDir, path.join(directory, 'temp'), null);
        assert.equal(result.type, 'app-backup-restore-error');
        assert.equal(result.error, 'core.backup.errorDuringReadingBackupFile');
        // The current website is not touched
        assert.equal(fs.readFileSync(path.join(sitesDir, 'demo', 'input', 'db.sqlite'), 'utf8'), 'current');
    });
});
