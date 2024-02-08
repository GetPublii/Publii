const assert = require('assert');
const checkIf = require('../check-if.js');

describe('Handlebars - checkIf block helper', function() {
    // Below object emulates Handlebars behaviour
    let optionsParam = {
        fn: () => true,
        inverse: () => false
    };

    it('should return false for too few arguments', function() {
        assert.equal(undefined, checkIf('a'));
        assert.equal(undefined, checkIf('a', '=='));
    });

    it('should return false for non-existing operator', function() {
        assert.equal(undefined, checkIf('a', 'LOL', 'b'));
    });

    it('should return proper value for the `==` operator', function() {
        assert.equal(true, checkIf('a', '==', 'a', optionsParam));
        assert.equal(true, checkIf('1', '==', 1, optionsParam));
        assert.equal(false, checkIf('a', '==', 'b', optionsParam));
        assert.equal(false, checkIf(10, '==', 11, optionsParam));
    });

    it('should return proper value for the `equal` operator', function() {
        assert.equal(true, checkIf('a', 'equal', 'a', optionsParam));
        assert.equal(true, checkIf('1', 'equal', 1, optionsParam));
        assert.equal(false, checkIf('a', 'equal', 'b', optionsParam));
        assert.equal(false, checkIf(10, 'equal', 11, optionsParam));
    });

    it('should return proper value for the `===` operator', function() {
        assert.equal(true, checkIf('a', '===', 'a', optionsParam));
        assert.equal(false, checkIf('1', '===', 1, optionsParam));
        assert.equal(true, checkIf(10, '===', 10, optionsParam));
        assert.equal(false, checkIf(10, '===', 11, optionsParam));
    });

    it('should return proper value for the `strictEqual` operator', function() {
        assert.equal(true, checkIf('a', 'strictEqual', 'a', optionsParam));
        assert.equal(false, checkIf('1', 'strictEqual', 1, optionsParam));
        assert.equal(true, checkIf(10, 'strictEqual', 10, optionsParam));
        assert.equal(false, checkIf(10, 'strictEqual', 11, optionsParam));
    });

    it('should return proper value for the `!=` operator', function() {
        assert.equal(false, checkIf('a', '!=', 'a', optionsParam));
        assert.equal(false, checkIf('1', '!=', 1, optionsParam));
        assert.equal(true, checkIf('a', '!=', 'b', optionsParam));
        assert.equal(true, checkIf(10, '!=', 11, optionsParam));
    });

    it('should return proper value for the `different` operator', function() {
        assert.equal(false, checkIf('a', 'different', 'a', optionsParam));
        assert.equal(false, checkIf('1', 'different', 1, optionsParam));
        assert.equal(true, checkIf('a', 'different', 'b', optionsParam));
        assert.equal(true, checkIf(10, 'different', 11, optionsParam));
    });

    it('should return proper value for the `!==` operator', function() {
        assert.equal(false, checkIf('a', '!==', 'a', optionsParam));
        assert.equal(true, checkIf('1', '!==', 1, optionsParam));
        assert.equal(false, checkIf(10, '!==', 10, optionsParam));
        assert.equal(true, checkIf(10, '!==', 11, optionsParam));
    });

    it('should return proper value for the `strictDifferent` operator', function() {
        assert.equal(false, checkIf('a', 'strictDifferent', 'a', optionsParam));
        assert.equal(true, checkIf('1', 'strictDifferent', 1, optionsParam));
        assert.equal(false, checkIf(10, 'strictDifferent', 10, optionsParam));
        assert.equal(true, checkIf(10, 'strictDifferent', 11, optionsParam));
    });

    it('should return proper values for the `&&` operator', function() {
        assert.equal(true, checkIf(true, '&&', true, optionsParam));
        assert.equal(false, checkIf(false, '&&', true, optionsParam));
        assert.equal(false, checkIf(true, '&&', false, optionsParam));
        assert.equal(false, checkIf(false, '&&', false, optionsParam));
    });

    it('should return proper values for the `and` operator', function() {
        assert.equal(true, checkIf(true, 'and', true, optionsParam));
        assert.equal(false, checkIf(false, 'and', true, optionsParam));
        assert.equal(false, checkIf(true, 'and', false, optionsParam));
        assert.equal(false, checkIf(false, 'and', false, optionsParam));
    });

    it('should return proper values for the `||` operator', function() {
        assert.equal(true, checkIf(true, '||', true, optionsParam));
        assert.equal(true, checkIf(false, '||', true, optionsParam));
        assert.equal(true, checkIf(true, '||', false, optionsParam));
        assert.equal(false, checkIf(false, '||', false, optionsParam));
    });

    it('should return proper values for the `or` operator', function() {
        assert.equal(true, checkIf(true, 'or', true, optionsParam));
        assert.equal(true, checkIf(false, 'or', true, optionsParam));
        assert.equal(true, checkIf(true, 'or', false, optionsParam));
        assert.equal(false, checkIf(false, 'or', false, optionsParam));
    });

    it('should return proper values for the `<` operator', function() {
        assert.equal(true, checkIf(10, '<', 11, optionsParam));
        assert.equal(false, checkIf(10, '<', -11, optionsParam));
    });

    it('should return proper values for the `lesser` operator', function() {
        assert.equal(true, checkIf(10, 'lesser', 11, optionsParam));
        assert.equal(false, checkIf(10, 'lesser', -11, optionsParam));
    });

    it('should return proper values for the `>` operator', function() {
        assert.equal(false, checkIf(10, '>', 11, optionsParam));
        assert.equal(true, checkIf(10, '>', -11, optionsParam));
    });

    it('should return proper values for the `greater` operator', function() {
        assert.equal(false, checkIf(10, 'greater', 11, optionsParam));
        assert.equal(true, checkIf(10, 'greater', -11, optionsParam));
    });

    it('should return proper values for the `<=` operator', function() {
        assert.equal(true, checkIf(10, '<=', 10, optionsParam));
        assert.equal(true, checkIf(10, '<=', 11, optionsParam));
        assert.equal(false, checkIf(10, '<=', -11, optionsParam));
    });

    it('should return proper values for the `lesserEqual` operator', function() {
        assert.equal(true, checkIf(10, 'lesserEqual', 10, optionsParam));
        assert.equal(true, checkIf(10, 'lesserEqual', 11, optionsParam));
        assert.equal(false, checkIf(10, 'lesserEqual', -11, optionsParam));
    });

    it('should return proper values for the `>=` operator', function() {
        assert.equal(false, checkIf(10, '>=', 11, optionsParam));
        assert.equal(true, checkIf(10, '>=', -11, optionsParam));
        assert.equal(true, checkIf(10, '>=', 10, optionsParam));
    });

    it('should return proper values for the `greaterEqual` operator', function() {
        assert.equal(false, checkIf(10, 'greaterEqual', 11, optionsParam));
        assert.equal(true, checkIf(10, 'greaterEqual', -11, optionsParam));
        assert.equal(true, checkIf(10, 'greaterEqual', 10, optionsParam));
    });

    it('should return proper values for the `contains` operator', function() {
        assert.equal(false, checkIf('10', 'contains', 11, optionsParam));
        assert.equal(false, checkIf('10,11', 'contains', 12, optionsParam));
        assert.equal(true, checkIf('10,11', 'contains', 11, optionsParam));
        assert.equal(true, checkIf('10,11,12', 'contains', 12, optionsParam));
        assert.equal(false, checkIf('10', 'contains', '11', optionsParam));
        assert.equal(false, checkIf('10,11', 'contains', '12', optionsParam));
        assert.equal(true, checkIf('10,11', 'contains', '11', optionsParam));
        assert.equal(true, checkIf('10,11,12', 'contains', '12', optionsParam));
    });

    it('should return proper values for the `notContains` operator', function() {
        assert.equal(true, checkIf('10', 'notContains', 11, optionsParam));
        assert.equal(true, checkIf('10,11', 'notContains', 12, optionsParam));
        assert.equal(false, checkIf('10,11', 'notContains', 11, optionsParam));
        assert.equal(false, checkIf('10,11,12', 'notContains', 12, optionsParam));
        assert.equal(true, checkIf('10', 'notContains', '11', optionsParam));
        assert.equal(true, checkIf('10,11', 'notContains', '12', optionsParam));
        assert.equal(false, checkIf('10,11', 'notContains', '11', optionsParam));
        assert.equal(false, checkIf('10,11,12', 'notContains', '12', optionsParam));
    });
});
