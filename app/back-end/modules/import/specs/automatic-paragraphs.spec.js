const assert = require('node:assert/strict');
const automaticParagraphs = require('../automatic-paragraphs');

describe('Automatic paragraphs for classic WordPress content', function() {
    it('creates paragraphs and visible line breaks from plain text', function() {
        assert.equal(
            automaticParagraphs('First line.\nSecond line.\n\nNext paragraph.'),
            '<p>First line.<br>\nSecond line.</p>\n<p>Next paragraph.</p>\n'
        );
    });

    for (const newline of ['\n', '\r\n', '\r']) {
        it('handles line endings ' + JSON.stringify(newline), function() {
            assert.equal(
                automaticParagraphs('One' + newline + 'Two' + newline + newline + 'Three'),
                '<p>One<br>\nTwo</p>\n<p>Three</p>\n'
            );
        });
    }

    it('treats whitespace-only lines as paragraph boundaries', function() {
        assert.equal(automaticParagraphs('One\n \t\nTwo'), '<p>One</p>\n<p>Two</p>\n');
    });

    for (const empty of ['', ' \n\t ', '<p></p>', '<p> \n </p>']) {
        it('does not leave empty paragraphs or orphan tags for ' + JSON.stringify(empty), function() {
            assert.equal(automaticParagraphs(empty), '');
        });
    }

    it('keeps existing paragraphs, inline emphasis and links', function() {
        const html = '<p class="intro"><em>One</em> <a href="/?a=1&amp;b=2">link</a></p>\n' +
            '<p><strong>Two</strong></p>';
        assert.equal(automaticParagraphs(html), html + '\n');
    });

    for (const br of ['<br>', '<br/>', '<br />']) {
        it('does not duplicate an existing ' + br + ' before a newline', function() {
            assert.equal(automaticParagraphs('One' + br + '\nTwo'), '<p>One<br>\nTwo</p>\n');
        });
    }

    it('keeps headings outside paragraphs', function() {
        assert.equal(
            automaticParagraphs('Intro\n\n<h2>Heading</h2>\n\nBody'),
            '<p>Intro</p>\n<h2>Heading</h2>\n<p>Body</p>\n'
        );
    });

    const protectedFragments = [
        '<pre><code>const a = 1;\r\n\r\nconst b = 2;</code></pre>',
        '<PRE class="language-js">first();\nsecond();</PRE>',
        '<script>const a = 1;\nconst b = 2;</script>',
        '<style>.one { color: red; }\n.two { color: blue; }</style>',
        '<textarea>One\n\nTwo</textarea>',
        '<svg viewBox="0 0 1 1">\n<path d="M0 0"/>\n</svg>',
        '<figure><iframe src="https://example.com/embed"></iframe>\n<figcaption>Caption</figcaption></figure>',
        '<ul>\n<li>One</li>\n<li>Two</li>\n</ul>',
        '<table>\n<tbody><tr><td>One</td><td>Two</td></tr></tbody>\n</table>',
        '<form><textarea>One\n\nTwo</textarea></form>',
        '<custom-widget>One\n\nTwo</custom-widget>',
        '<template><p>One</p>\n<p>Two</p></template>'
    ];

    for (const fragment of protectedFragments) {
        it('preserves ' + fragment.match(/^<[^ >]+/)[0] + ' content byte for byte', function() {
            const output = automaticParagraphs('Before\n\n' + fragment + '\n\nAfter');
            assert.equal(output, '<p>Before</p>\n' + fragment + '\n<p>After</p>\n');
            assert.doesNotMatch(output, /restore-line-break|\u0000PUBLIIAUTOP/);
        });
    }

    it('keeps inline code in its paragraph without changing its content', function() {
        assert.equal(
            automaticParagraphs('Before <code>one\n\ntwo</code> after.'),
            '<p>Before <code>one\n\ntwo</code> after.</p>\n'
        );
    });

    it('preserves quoted attributes containing newlines and markup', function() {
        const html = '<a\n title="One\n\nTwo<br><br>" href="/">Link</a>';
        assert.equal(automaticParagraphs(html), '<p>' + html + '</p>\n');
    });

    it('does not wrap standalone comments in visible paragraphs', function() {
        assert.equal(
            automaticParagraphs('Before\n\n<!-- Keep\nthis -->\n\nAfter'),
            '<p>Before</p>\n<!-- Keep\nthis -->\n<p>After</p>\n'
        );
        assert.equal(automaticParagraphs('<!-- Keep -->'), '<!-- Keep -->\n');
    });

    it('does not add more formatting when run again', function() {
        const once = automaticParagraphs('One\nTwo\n\n<pre>Three\nFour</pre>\n\nFive');
        assert.equal(automaticParagraphs(once), once);
    });
});
