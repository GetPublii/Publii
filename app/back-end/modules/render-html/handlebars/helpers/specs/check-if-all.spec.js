const assert = require('assert');
const checkIfAll = require('../check-if-all.js');

describe('Handlebars - checkIfAll block helper', function() {
    // Below object emulates Handlebars behaviour
    let optionsParam = {
        fn: () => true,
        inverse: () => false
    };

    it('should return false when there is no arguments', function() {
        assert.equal(false, checkIfAll(optionsParam));
    });

    it('should return false for falsy values arguments', function() {
        assert.equal(false, checkIfAll('', optionsParam));
        assert.equal(false, checkIfAll("", optionsParam));
        assert.equal(false, checkIfAll(NaN, optionsParam));
        assert.equal(false, checkIfAll(null, optionsParam));
        assert.equal(false, checkIfAll(undefined, optionsParam));
        assert.equal(false, checkIfAll(0, optionsParam));
        assert.equal(false, checkIfAll(false, optionsParam));
    });

    it('should return true if all arguments are true', function() {
        assert.equal(true, checkIfAll('a', optionsParam));
        assert.equal(true, checkIfAll('a', 'b', optionsParam));
        assert.equal(true, checkIfAll('a', 'b', 'c', optionsParam));
        assert.equal(true, checkIfAll('a', 'b', 'c', 'd', optionsParam));
        assert.equal(true, checkIfAll('a', 1, 10, true, optionsParam));
        assert.equal(true, checkIfAll('lorem', 1, 'ipsum', [1], {a: 1}, optionsParam));
    });

    it('should return proper false when at least argument is false', function() {
        assert.equal(false, checkIfAll('a', false, optionsParam));
        assert.equal(false, checkIfAll(false, 1, true, optionsParam));
        assert.equal(false, checkIfAll(true, false, true, optionsParam));
        assert.equal(false, checkIfAll('lorem', [1], false, optionsParam));
    });

    it('should return false when all arguments are false or falsy values', function() {
        assert.equal(false, checkIfAll(false, optionsParam));
        assert.equal(false, checkIfAll(false, false, optionsParam));
        assert.equal(false, checkIfAll(false, false, false, optionsParam));
        assert.equal(false, checkIfAll(false, undefined, optionsParam));
        assert.equal(false, checkIfAll(false, null, 0, optionsParam));
        assert.equal(false, checkIfAll('', "", NaN, null, undefined, 0, false, optionsParam));
    });

});
