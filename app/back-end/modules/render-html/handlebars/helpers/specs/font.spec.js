const assert = require('assert');
const Handlebars = require('handlebars');
const font = require('../font.js');

describe('Handlebars - font helper', function() {
    describe('#font', function() {
        it('should return proper URL to Google Fonts API', function() {
            assert.equal('https://fonts.googleapis.com/css?family&#x3D;', font.__font(''));
            assert.equal('https://fonts.googleapis.com/css?family&#x3D;Open+Sans', font.__font('Open+Sans'));
        });
    });
});
