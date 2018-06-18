const assert = require('assert');
const Handlebars = require('handlebars');
const ampLink = require('../amp-link.js').__ampLink;

describe('Handlebars - ampLink helper', function() {
    describe('#ampLink', function() {
        let context = {
            data: {
                website: {
                    ampUrl: 'https://domain.com/amp/'
                }
            }
        };

        let rendererInstance = {
            siteConfig: {
                advanced: {
                    ampIsEnabled: true
                }
            }
        };

        it('should return proper URL to AMP version of the website', function() {
            assert.equal('<link rel="amphtml" href="https://domain.com/amp/">', ampLink.call(rendererInstance, context));
        });
    });
});
