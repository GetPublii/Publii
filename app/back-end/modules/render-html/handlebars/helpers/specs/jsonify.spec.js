const assert = require('assert');
const Handlebars = require('handlebars');
const jsonify = require('../jsonify.js');

describe('Handlebars - jsonify helper', function() {
    describe('#jsonify', function() {
        it('should return proper value if string is a value', function() {
            assert.equal('"string"', jsonify('string'));
        });

        it('should return proper value if array is a value', function() {
            assert.equal('[1,2,3]', jsonify([1,2,3]));
        });

        it('should return proper value if object is a value', function() {
            assert.equal('{"a":1}', jsonify({a: 1}));
        });
    });
});
