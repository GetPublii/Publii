const assert = require('node:assert/strict');
const VersionComparator = require('../../../shared/version-comparator');

describe('Version comparator', () => {
    it('compares versions part by part as numbers', () => {
        assert.equal(VersionComparator('1.0.1', '1.0.0'), 1);
        assert.equal(VersionComparator('1.0.0', '1.0.1'), -1);
        assert.equal(VersionComparator('0.48.0', '0.48.0'), 0);
        assert.equal(VersionComparator('2.10.0', '2.9.0'), 1);
    });

    it('supports four-part theme versions', () => {
        assert.equal(VersionComparator('3.3.0.1', '3.3.0.0'), 1);
        assert.equal(VersionComparator('3.2.9.9', '3.3.0.0'), -1);
    });

    it('treats missing parts as zero', () => {
        assert.equal(VersionComparator('1.0', '1.0.0'), 0);
        assert.equal(VersionComparator('1.0.1', '1.0'), 1);
    });

    it('handles undefined and numeric versions', () => {
        assert.equal(VersionComparator(undefined, '0.48.0'), -1);
        assert.equal(VersionComparator('0.46.0', undefined), 1);
        assert.equal(VersionComparator(1, '1'), 0);
        assert.equal(VersionComparator(2, '1.9'), 1);
    });
});
