const assert = require('assert');
const isEmpty = require('../is-empty.js');

describe('Handlebars - isEmpty block helper', function() {
    // Below object emulates Handlebars behaviour
    let optionsParam = {
        fn: () => true,
        inverse: () => false
    };

    it('should return true for empty array', function() {
        assert.equal(true, isEmpty([], optionsParam));
    });

    it('should return false for non-empty array', function() {
        assert.equal(false, isEmpty([1,2,3], optionsParam));
    });

    it('should return true for empty object', function() {
        assert.equal(true, isEmpty({}, optionsParam));
    });

    it('should return false for non-empty object', function() {
        assert.equal(false, isEmpty({a:1, b:2}, optionsParam));
    });
});
