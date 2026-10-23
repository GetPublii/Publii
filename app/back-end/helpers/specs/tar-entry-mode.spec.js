/* Permissions of the TAR archive entries created and unpacked by the app. */
const assert = require('node:assert/strict');
const { DIRECTORY_MODE, FILE_MODE, normalizeTarEntryMode } = require('../tar-entry-mode.js');

describe('TAR entry mode normalization', () => {
    it('makes directories from Windows archives (0666) accessible', () => {
        assert.equal(normalizeTarEntryMode({ name: 'input/config', type: 'directory', mode: 0o666 }).mode, DIRECTORY_MODE);
        assert.equal(DIRECTORY_MODE, 0o755);
    });

    it('never keeps the execute, setuid or world-writable bits of files', () => {
        assert.equal(normalizeTarEntryMode({ name: 'input/db.sqlite', type: 'file', mode: 0o4777 }).mode, FILE_MODE);
        assert.equal(normalizeTarEntryMode({ name: 'input/link', type: 'symlink', mode: 0o777 }).mode, FILE_MODE);
        assert.equal(FILE_MODE, 0o644);
    });

    it('keeps the other header fields and returns the same header', () => {
        let header = { name: 'input/media', type: 'directory', mode: 0o700, mtime: new Date(0) };

        assert.equal(normalizeTarEntryMode(header), header);
        assert.equal(header.name, 'input/media');
        assert.equal(header.mtime.getTime(), 0);
    });
});
