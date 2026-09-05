/* Backup listing tests. Files are disposable fixtures in the system temp directory. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const filename = path.join(__dirname, 'backup.js');
const localRequire = createRequire(filename);
const context = { module: { exports: {} }, require: name => name === 'electron' ? { shell: {} } : localRequire(name) };
vm.runInNewContext(fs.readFileSync(filename, 'utf8'), context);
const Backup = context.module.exports;

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
