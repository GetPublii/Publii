const assert = require('node:assert/strict');
const addVideoReferrerPolicy = require('../video-referrer-policy');

const policy = ' referrerpolicy="strict-origin-when-cross-origin"';
const youtube = 'https://www.youtube.com/embed/SO4YuDAkplU';

describe('Video iframe referrer policy', function () {
    const supported = [
        youtube + '?si=example&amp;start=10',
        'https://youtube.com/embed/videoseries?list=example',
        'https://www.youtube-nocookie.com/embed/SO4YuDAkplU',
        'https://youtube-nocookie.com/embed/SO4YuDAkplU',
        '//WWW.YOUTUBE.COM/embed/SO4YuDAkplU',
        'http://www.youtube.com/embed/SO4YuDAkplU',
        'https://player.vimeo.com/video/12345?h=private&amp;dnt=1',
        'https://www.dailymotion.com/embed/video/x123',
        'https://dailymotion.com/embed/video/x123',
        'https://geo.dailymotion.com/player/x123.html?video=x456',
        'https://geo.dailymotion.com/player.html?video=x456',
        'https://fast.wistia.net/embed/iframe/abc123',
        'https://fast.wistia.com/embed/iframe/abc123',
        'https://player.mediadelivery.net/embed/123/abc?token=secret',
        'https://iframe.mediadelivery.net/embed/123/abc'
    ];

    for (const source of supported) {
        it('supports ' + source, function () {
            const html = '<iframe src="' + source + '"></iframe>';
            const result = addVideoReferrerPolicy(html, true);
            assert.equal(result, html.replace('<iframe', '<iframe' + policy));
            assert.equal(addVideoReferrerPolicy(result, true), result);
        });
    }

    it('leaves content unchanged unless explicitly enabled', function () {
        const html = '<iframe src="' + youtube + '"></iframe>';

        for (const value of [undefined, false, null, 0, 1, 'true']) {
            assert.equal(addVideoReferrerPolicy(html, value), html);
        }
    });

    it('preserves explicit policies, including empty values and uppercase attributes', function () {
        for (const attribute of ['referrerpolicy="no-referrer"', "REFERRERPOLICY='same-origin'", 'referrerpolicy=""', 'referrerpolicy']) {
            const html = '<iframe ' + attribute + ' src="' + youtube + '"></iframe>';
            assert.equal(addVideoReferrerPolicy(html, true), html);
        }
    });

    it('preserves source formatting, permissions, sandbox, styles and unquoted attributes', function () {
        const html = '<figure class="post__video">\n<IFRAME\n src=\'' + youtube + '\' sandbox="allow-scripts" allow="fullscreen" style="width:100%" loading=lazy></IFRAME>\n</figure>';
        assert.equal(addVideoReferrerPolicy(html, true), html.replace('<IFRAME', '<IFRAME' + policy));
        const unquoted = '<iframe src=' + youtube + '></iframe>';
        assert.equal(addVideoReferrerPolicy(unquoted, true), unquoted.replace('<iframe', '<iframe' + policy));
    });

    it('does not activate an iframe waiting for consent', function () {
        const html = '<iframe data-consent-src="' + youtube + '" data-consent-overlay-added="true"></iframe>';
        assert.equal(addVideoReferrerPolicy(html, true), html.replace('<iframe', '<iframe' + policy));
    });

    it('ignores unrelated URLs and lookalike domains', function () {
        const sources = [
            'https://www.youtube.com/watch?v=SO4YuDAkplU',
            'https://www.youtube.com.evil.example/embed/SO4YuDAkplU',
            'https://evil.example/?url=' + youtube,
            'https://www.youtube.com@evil.example/embed/SO4YuDAkplU',
            'https://user@www.youtube.com/embed/SO4YuDAkplU',
            'https://www.youtube.com:8443/embed/SO4YuDAkplU',
            'https://www.youtube.com/redirect?next=/embed/SO4YuDAkplU',
            'https://vimeo.com/12345',
            'https://fast.wistia.net/embed/channel/abc',
            'https://player.mediadelivery.net/play/123/abc',
            'https://www.google.com/maps/embed',
            '/embed/SO4YuDAkplU',
            'javascript:alert(1)',
            'not a URL'
        ];

        for (const source of sources) {
            const html = '<iframe src="' + source + '"></iframe>';
            assert.equal(addVideoReferrerPolicy(html, true), html);
        }
    });

    it('ignores comments, scripts, templates, fallback text and srcdoc content', function () {
        const frame = '<iframe src="' + youtube + '"></iframe>';
        const fragments = [
            '<!-- ' + frame + ' -->',
            '<script>const example = ' + JSON.stringify(frame) + ';</script>',
            '<template>' + frame + '</template>',
            '<textarea>' + frame + '</textarea>',
            '<iframe>' + frame + '</iframe>',
            '<iframe src="' + youtube + '" srcdoc="&lt;p&gt;Local content&lt;/p&gt;"></iframe>'
        ];

        for (const html of fragments) {
            assert.equal(addVideoReferrerPolicy(html, true), html);
        }
    });

    it('updates multiple frames without reserializing malformed surrounding HTML', function () {
        const frame = '<iframe src="' + youtube + '"></iframe>';
        const html = '<table><tr><td>' + frame + '</td></tr>' + frame + '</table>' + frame;
        assert.equal(addVideoReferrerPolicy(html, true), html.replace(/<iframe/g, '<iframe' + policy));
    });
});
