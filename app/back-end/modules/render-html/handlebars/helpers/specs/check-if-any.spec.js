const assert = require('assert');
const checkIfAny = require('../check-if-any.js');

describe('Handlebars - checkIfAny block helper', function() {
    // Below object emulates Handlebars behaviour
    let optionsParam = {
        fn: () => true,
        inverse: () => false
    };

    it('should return false when there is no arguments', function() {
        assert.equal(false, checkIfAny(optionsParam));
    });

    it('should return false for falsy values arguments', function() {
        assert.equal(false, checkIfAny('', optionsParam));
        assert.equal(false, checkIfAny("", optionsParam));
        assert.equal(false, checkIfAny(NaN, optionsParam));
        assert.equal(false, checkIfAny(null, optionsParam));
        assert.equal(false, checkIfAny(undefined, optionsParam));
        assert.equal(false, checkIfAny(0, optionsParam));
        assert.equal(false, checkIfAny(false, optionsParam));
    });

    it('should return true if all arguments are true', function() {
        assert.equal(true, checkIfAny('a', optionsParam));
        assert.equal(true, checkIfAny('a', 'b', optionsParam));
        assert.equal(true, checkIfAny('a', 'b', 'c', optionsParam));
        assert.equal(true, checkIfAny('a', 'b', 'c', 'd', optionsParam));
        assert.equal(true, checkIfAny('a', 1, 10, true, optionsParam));
        assert.equal(true, checkIfAny('lorem', 1, 'ipsum', [1], {a: 1}, optionsParam));
    });

    it('should return true when at least argument is true', function() {
        assert.equal(true, checkIfAny('a', false, optionsParam));
        assert.equal(true, checkIfAny(false, 1, true, optionsParam));
        assert.equal(true, checkIfAny(true, false, true, optionsParam));
        assert.equal(true, checkIfAny('lorem', [1], false, optionsParam));
    });

    it('should return false when all arguments are false or falsy values', function() {
        assert.equal(false, checkIfAny(false, optionsParam));
        assert.equal(false, checkIfAny(false, false, optionsParam));
        assert.equal(false, checkIfAny(false, false, false, optionsParam));
        assert.equal(false, checkIfAny(false, undefined, optionsParam));
        assert.equal(false, checkIfAny(false, null, 0, optionsParam));
        assert.equal(false, checkIfAny('', "", NaN, null, undefined, 0, false, optionsParam));
    });

});
