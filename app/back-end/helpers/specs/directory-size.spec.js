const assert = require('node:assert/strict');
const fs = require('fs-extra');
const os = require('node:os');
const path = require('node:path');
const getDirectorySize = require('../directory-size.js');

describe('Directory size', function () {
    let baseDir;

    beforeEach(function () {
        baseDir = fs.mkdtempSync(path.join(os.tmpdir(), 'publii-directory-size-'));
    });

    afterEach(function () {
        fs.removeSync(baseDir);
    });

    it('sums files from all subdirectories', async function () {
        fs.outputFileSync(path.join(baseDir, 'index.html'), '12345');
        fs.outputFileSync(path.join(baseDir, 'media', 'posts', '1', 'image.jpg'), '1234567890');
        fs.outputFileSync(path.join(baseDir, 'assets', 'empty.css'), '');
        fs.ensureDirSync(path.join(baseDir, 'empty-directory'));

        assert.equal(await getDirectorySize(baseDir), 15);
    });

    it('returns 0 for missing and empty directories', async function () {
        assert.equal(await getDirectorySize(path.join(baseDir, 'missing')), 0);
        assert.equal(await getDirectorySize(baseDir), 0);
    });

    it('does not follow symlinks', async function () {
        let outsideDir = fs.mkdtempSync(path.join(os.tmpdir(), 'publii-directory-size-outside-'));

        try {
            fs.outputFileSync(path.join(outsideDir, 'big.bin'), '1234567890');
            fs.outputFileSync(path.join(baseDir, 'index.html'), '12345');

            try {
                fs.symlinkSync(outsideDir, path.join(baseDir, 'linked-directory'));
                fs.symlinkSync(path.join(outsideDir, 'big.bin'), path.join(baseDir, 'linked-file.bin'));
            } catch (error) {
                // Windows without the permission to create symlinks
                this.skip();
            }

            assert.equal(await getDirectorySize(baseDir), 5);
        } finally {
            fs.removeSync(outsideDir);
        }
    });
});
