const assert = require('assert');
const checkIfNone = require('../check-if-none.js');

describe('Handlebars - checkIfNone block helper', function() {
    // Below object emulates Handlebars behaviour
    let optionsParam = {
        fn: () => true,
        inverse: () => false
    };

    it('should return true when there is no arguments', function() {
        assert.equal(true, checkIfNone(optionsParam));
    });

    it('should return true for falsy values arguments', function() {
        assert.equal(true, checkIfNone('', optionsParam));
        assert.equal(true, checkIfNone("", optionsParam));
        assert.equal(true, checkIfNone(NaN, optionsParam));
        assert.equal(true, checkIfNone(null, optionsParam));
        assert.equal(true, checkIfNone(undefined, optionsParam));
        assert.equal(true, checkIfNone(0, optionsParam));
        assert.equal(true, checkIfNone(false, optionsParam));
    });

    it('should return false if all arguments are true', function() {
        assert.equal(false, checkIfNone('a', optionsParam));
        assert.equal(false, checkIfNone('a', 'b', optionsParam));
        assert.equal(false, checkIfNone('a', 'b', 'c', optionsParam));
        assert.equal(false, checkIfNone('a', 'b', 'c', 'd', optionsParam));
        assert.equal(false, checkIfNone('a', 1, 10, true, optionsParam));
        assert.equal(false, checkIfNone('lorem', 1, 'ipsum', [1], {a: 1}, optionsParam));
    });

    it('should return false when at least argument is true', function() {
        assert.equal(false, checkIfNone('a', false, optionsParam));
        assert.equal(false, checkIfNone(false, 1, true, optionsParam));
        assert.equal(false, checkIfNone(true, false, true, optionsParam));
        assert.equal(false, checkIfNone('lorem', [1], false, optionsParam));
    });

    it('should return true when all arguments are false or falsy values', function() {
        assert.equal(true, checkIfNone(false, optionsParam));
        assert.equal(true, checkIfNone(false, false, optionsParam));
        assert.equal(true, checkIfNone(false, false, false, optionsParam));
        assert.equal(true, checkIfNone(false, undefined, optionsParam));
        assert.equal(true, checkIfNone(false, null, 0, optionsParam));
        assert.equal(true, checkIfNone('', "", NaN, null, undefined, 0, false, optionsParam));
    });

});
