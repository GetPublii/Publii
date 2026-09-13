const assert = require('node:assert/strict');
const ContentHelper = require('../content');
const PostPreview = require('../../contexts/post-preview');
const PagePreview = require('../../contexts/page-preview');

function createContext () {
    const siteConfig = {
        domain: 'https://example.com',
        advanced: {
            responsiveImages: false,
            mediaLazyLoad: false,
            gdpr: {
                enabled: false,
                vimeoNoTrack: false,
                ytNoCookies: false
            }
        }
    };

    return {
        siteConfig,
        renderer: { siteConfig },
        themeConfig: {},
        editor: 'tinymce'
    };
}

const renderers = {
    generation (context, html) {
        return ContentHelper.prepareContent(1, html, context.siteConfig.domain, context.themeConfig, context.renderer);
    },
    postPreview (context, html) {
        return PostPreview.prototype.prepareContent.call(context, html, 1);
    },
    pagePreview (context, html) {
        return PagePreview.prototype.prepareContent.call(context, html, 1);
    }
};

const iframe = '<iframe src="https://example.com/map" width="600" height="450"></iframe>';
const wrapped = '<div class="post__iframe">' + iframe + '</div>';

describe('Iframe wrappers in generated content and previews', function () {
    for (const [name, render] of Object.entries(renderers)) {
        describe(name, function () {
            it('renders old content and saved editor content identically', function () {
                const context = createContext();
                assert.equal(render(context, iframe), wrapped);
                assert.equal(render(context, wrapped), wrapped);
            });

            it('distinguishes a video embed from a following map', function () {
                const context = createContext();
                const video = '<figure class="post__video">' + iframe + '</figure>';
                assert.equal(render(context, video + iframe), video + wrapped);
            });

            it('removes the standard wrapper after opting out in the editor', function () {
                const context = createContext();
                const optOut = iframe.replace('<iframe ', '<iframe data-responsive="false" ');
                assert.equal(render(context, '<div class="post__iframe">' + optOut + '</div>'), optOut);
            });

            it('keeps lazy loading after removing an opted-out wrapper', function () {
                const context = createContext();
                context.siteConfig.advanced.mediaLazyLoad = true;
                const input = wrapped.replace('<iframe ', '<iframe data-responsive="false" ');
                const output = render(context, input);
                assert.doesNotMatch(output, /post__iframe/);
                assert.match(output, /data-responsive="false"/);
                assert.equal((output.match(/loading="lazy"/g) || []).length, 1);
            });

            it('retains text around an iframe in older content', function () {
                const context = createContext();
                assert.equal(
                    render(context, '<p>Before' + iframe + 'After</p>'),
                    '<p>Before</p>' + wrapped + '<p>After</p>'
                );
            });

            it('preserves opt-out and lazy loading without nesting wrappers', function () {
                const context = createContext();
                context.siteConfig.advanced.mediaLazyLoad = true;
                const optOut = iframe.replace('<iframe ', '<iframe data-responsive="false" ');
                const output = render(context, wrapped);
                const optOutOutput = render(context, optOut);
                assert.equal((output.match(/class="post__iframe"/g) || []).length, 1);
                assert.equal((output.match(/loading="lazy"/g) || []).length, 1);
                assert.doesNotMatch(optOutOutput, /post__iframe/);
                assert.match(optOutOutput, /data-responsive="false"/);
                assert.match(optOutOutput, /loading="lazy"/);
            });
        });
    }
});
