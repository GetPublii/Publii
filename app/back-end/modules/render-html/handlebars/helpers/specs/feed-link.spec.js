const assert = require('assert');
const Handlebars = require('handlebars');
const feedLink = require('../feed-link.js').__feedLink;

describe('Handlebars - feedLink helper', function() {
    describe('#feedLink - both RSS and JSON', function() {
        let rendererInstance = {
            siteConfig: {
                domain: 'https://example.com',
                advanced: {
                    feed: {
                        enableRss: 1,
                        enableJson: 1
                    }
                }
            }
        };

        it('should return proper URL to feed.xml and feed.json files', function() {
            assert.equal('<link rel="alternate" type="application/atom+xml" href="https://example.com/feed.xml">' + "\n" + '<link rel="alternate" type="application/json" href="https://example.com/feed.json">' + "\n", feedLink.call(rendererInstance).string);
        });
    });

    describe('#feedLink - only RSS', function() {
        let rendererInstance = {
            siteConfig: {
                domain: 'https://example.com',
                advanced: {
                    feed: {
                        enableRss: 1,
                        enableJson: 0
                    }
                }
            }
        };

        it('should return proper URL to feed.xml file', function() {
            assert.equal('<link rel="alternate" type="application/atom+xml" href="https://example.com/feed.xml">' + "\n", feedLink.call(rendererInstance).string);
        });
    });

    describe('#feedLink - only JSON', function() {
        let rendererInstance = {
            siteConfig: {
                domain: 'https://example.com',
                advanced: {
                    feed: {
                        enableRss: 0,
                        enableJson: 1
                    }
                }
            }
        };

        it('should return proper URL to feed.json file', function() {
            assert.equal('<link rel="alternate" type="application/json" href="https://example.com/feed.json">' + "\n", feedLink.call(rendererInstance).string);
        });
    });

    describe('#feedLink - none', function() {
        let rendererInstance = {
            siteConfig: {
                domain: 'https://example.com',
                advanced: {
                    feed: {
                        enableRss: 0,
                        enableJson: 0
                    }
                }
            }
        };

        it('should return empty string', function() {
            assert.equal('', feedLink.call(rendererInstance).string);
        });
    });
});
