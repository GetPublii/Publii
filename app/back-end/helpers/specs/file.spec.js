const assert = require('node:assert/strict');
const fs = require('fs');
const fse = require('fs-extra');
const os = require('node:os');
const path = require('node:path');
const FileHelper = require('../file.js');

describe('FileHelper', function () {
    let baseDir;

    beforeEach(function () {
        baseDir = fs.mkdtempSync(path.join(os.tmpdir(), 'publii-file-helper-'));
    });

    afterEach(function () {
        fse.removeSync(baseDir);
    });

    it('passes the path to fs.readFileSync as-is (asar entries must not be read via fs.openSync)', function () {
        let originalReadFileSync = fs.readFileSync;
        let calls = [];

        fs.readFileSync = function (...args) {
            calls.push(args);
            return 'content';
        };

        try {
            let filePath = '/Applications/Publii.app/Contents/Resources/app.asar/default-files/theme-files/config.json';
            assert.equal(FileHelper.readFileSync(filePath, 'utf8'), 'content');
            assert.deepEqual(calls, [[filePath, 'utf8']]);
        } finally {
            fs.readFileSync = originalReadFileSync;
        }
    });

    it('reads file content as string or buffer', function () {
        let filePath = path.join(baseDir, 'config.json');
        fs.writeFileSync(filePath, '{"a":1}');

        assert.equal(FileHelper.readFileSync(filePath, 'utf8'), '{"a":1}');
        assert.equal(FileHelper.readFileSync(filePath, { encoding: 'utf8' }), '{"a":1}');
        assert.ok(Buffer.isBuffer(FileHelper.readFileSync(filePath)));
        assert.equal(JSON.parse(FileHelper.readFileSync(filePath)).a, 1);
    });

    it('throws ENOENT for missing files', function () {
        assert.throws(
            () => FileHelper.readFileSync(path.join(baseDir, 'missing.json'), 'utf8'),
            { code: 'ENOENT' }
        );
    });

    it('reads from a file descriptor without closing it', function () {
        let filePath = path.join(baseDir, 'data.txt');
        fs.writeFileSync(filePath, 'data');
        let fd = fs.openSync(filePath, 'r');

        try {
            assert.equal(FileHelper.readFileSync(fd, 'utf8'), 'data');
            assert.doesNotThrow(() => fs.fstatSync(fd));
        } finally {
            fs.closeSync(fd);
        }
    });
});
