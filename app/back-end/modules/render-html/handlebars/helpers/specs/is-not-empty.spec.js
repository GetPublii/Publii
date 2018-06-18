const assert = require('assert');
const isNotEmpty = require('../is-not-empty.js');

describe('Handlebars - isNotEmpty block helper', function() {
    // Below object emulates Handlebars behaviour
    let optionsParam = {
        fn: () => true,
        inverse: () => false
    };

    it('should return false for empty array', function() {
        assert.equal(false, isNotEmpty([], optionsParam));
    });

    it('should return true for non-empty array', function() {
        assert.equal(true, isNotEmpty([1,2,3], optionsParam));
    });

    it('should return false for empty object', function() {
        assert.equal(false, isNotEmpty({}, optionsParam));
    });

    it('should return true for non-empty object', function() {
        assert.equal(true, isNotEmpty({a:1, b:2}, optionsParam));
    });
});
