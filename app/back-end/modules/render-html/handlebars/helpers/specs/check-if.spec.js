const assert = require('assert');
const checkIf = require('../check-if.js');

describe('Handlebars - checkIf block helper', function() {
    // Below object emulates Handlebars behaviour
    let optionsParam = {
        fn: () => true,
        inverse: () => false
    };

    it('should return false for too few arguments', function() {
        assert.equal(false, checkIf('a'));
        assert.equal(false, checkIf('a', '=='));
    });

    it('should return false for non-existing operator', function() {
        assert.equal(false, checkIf('a', 'LOL', 'b'));
    });

    it('should return proper value for the `==` operator', function() {
        assert.equal(true, checkIf('a', '==', 'a', optionsParam));
        assert.equal(true, checkIf('1', '==', 1, optionsParam));
        assert.equal(false, checkIf('a', '==', 'b', optionsParam));
        assert.equal(false, checkIf(10, '==', 11, optionsParam));
    });

    it('should return proper value for the `===` operator', function() {
        assert.equal(true, checkIf('a', '===', 'a', optionsParam));
        assert.equal(false, checkIf('1', '===', 1, optionsParam));
        assert.equal(true, checkIf(10, '===', 10, optionsParam));
        assert.equal(false, checkIf(10, '===', 11, optionsParam));
    });

    it('should return proper value for the `!=` operator', function() {
        assert.equal(false, checkIf('a', '!=', 'a', optionsParam));
        assert.equal(false, checkIf('1', '!=', 1, optionsParam));
        assert.equal(true, checkIf('a', '!=', 'b', optionsParam));
        assert.equal(true, checkIf(10, '!=', 11, optionsParam));
    });

    it('should return proper value for the `!==` operator', function() {
        assert.equal(false, checkIf('a', '!==', 'a', optionsParam));
        assert.equal(true, checkIf('1', '!==', 1, optionsParam));
        assert.equal(false, checkIf(10, '!==', 10, optionsParam));
        assert.equal(true, checkIf(10, '!==', 11, optionsParam));
    });

    it('should return proper values for the `&&` operator', function() {
        assert.equal(true, checkIf(true, '&&', true, optionsParam));
        assert.equal(false, checkIf(false, '&&', true, optionsParam));
        assert.equal(false, checkIf(true, '&&', false, optionsParam));
        assert.equal(false, checkIf(false, '&&', false, optionsParam));
    });

    it('should return proper values for the `||` operator', function() {
        assert.equal(true, checkIf(true, '||', true, optionsParam));
        assert.equal(true, checkIf(false, '||', true, optionsParam));
        assert.equal(true, checkIf(true, '||', false, optionsParam));
        assert.equal(false, checkIf(false, '||', false, optionsParam));
    });

    it('should return proper values for the `<` operator', function() {
        assert.equal(true, checkIf(10, '<', 11, optionsParam));
        assert.equal(false, checkIf(10, '<', -11, optionsParam));
    });

    it('should return proper values for the `>` operator', function() {
        assert.equal(false, checkIf(10, '>', 11, optionsParam));
        assert.equal(true, checkIf(10, '>', -11, optionsParam));
    });

    it('should return proper values for the `<=` operator', function() {
        assert.equal(true, checkIf(10, '<=', 10, optionsParam));
        assert.equal(true, checkIf(10, '<=', 11, optionsParam));
        assert.equal(false, checkIf(10, '<=', -11, optionsParam));
    });

    it('should return proper values for the `>=` operator', function() {
        assert.equal(false, checkIf(10, '>=', 11, optionsParam));
        assert.equal(true, checkIf(10, '>=', -11, optionsParam));
        assert.equal(true, checkIf(10, '>=', 10, optionsParam));
    });
});
