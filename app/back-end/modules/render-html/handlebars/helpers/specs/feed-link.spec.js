const assert = require('assert');
const Handlebars = require('handlebars');
const feedLink = require('../feed-link.js').__feedLink;

describe('Handlebars - feedLink helper', function() {
    describe('#feedLink', function() {
        let rendererInstance = {
            siteConfig: {
                domain: 'https://example.com'
            }
        };

        it('should return proper URL to feed.xml file', function() {
            assert.equal('<link type="application/atom+xml" rel="alternate" href="https://example.com/feed.xml"/>', feedLink.call(rendererInstance));
        });
    });
});
