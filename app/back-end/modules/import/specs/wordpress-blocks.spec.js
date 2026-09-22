const assert = require('node:assert/strict');
const { getBlockComments, removeBlockComments } = require('../wordpress-blocks');

describe('Gutenberg block metadata', function() {
    it('removes nested block delimiters while preserving their HTML', function() {
        const html = '<!-- wp:group {"layout":{"type":"constrained"}} -->' +
            '<div><!-- wp:paragraph --><p>Text</p><!-- /wp:paragraph --></div>' +
            '<!-- /wp:group -->';
        assert.equal(removeBlockComments(html), '<div><p>Text</p></div>');
        assert.deepEqual(getBlockComments(html).map(comment => comment.name), [
            'group', 'paragraph', 'paragraph', 'group'
        ]);
    });

    it('retains self-closing dynamic block metadata before removing the comment', function() {
        const html = '<!-- wp:latest-posts {"postsToShow":5} /-->';
        const comments = getBlockComments(html);
        assert.equal(comments[0].markup, html);
        assert.equal(comments[0].name, 'latest-posts');
        assert.equal(comments[0].closing, false);
        assert.equal(removeBlockComments(html, comments), '');
    });

    it('handles greater-than characters in JSON attributes', function() {
        const html = '<!-- wp:example/card {"label":"A > B"} --><p>Text</p><!-- /wp:example/card -->';
        assert.equal(removeBlockComments(html), '<p>Text</p>');
    });

    it('preserves unrelated and malformed comments', function() {
        const html = '<!-- Keep this -->\n<!--more-->\n<!-- wp:paragraph explanation -->\n' +
            '<!-- wp:paragraph {invalid} -->\n<!-- wp:paragraph-extra-note: no -->';
        assert.equal(removeBlockComments(html), html);
        assert.deepEqual(getBlockComments(html), []);
    });

    for (const tag of ['pre', 'code', 'textarea', 'script', 'style', 'template', 'svg']) {
        it('preserves block-comment examples inside ' + tag, function() {
            const html = '<' + tag + '><!-- wp:latest-posts /--></' + tag + '>';
            assert.equal(removeBlockComments(html), html);
            assert.deepEqual(getBlockComments(html), []);
        });
    }

    it('preserves escaped examples and comments inside attributes', function() {
        const html = '<p>&lt;!-- wp:paragraph --&gt;</p>' +
            '<span title="<!-- wp:latest-posts /-->">Text</span>';
        assert.equal(removeBlockComments(html), html);
        assert.deepEqual(getBlockComments(html), []);
    });

    it('removes real delimiters around a protected code example only', function() {
        const example = '<pre><code><!-- wp:paragraph --></code></pre>';
        const html = '<!-- wp:code -->' + example + '<!-- /wp:code -->';
        assert.equal(removeBlockComments(html), example);
        assert.deepEqual(getBlockComments(html).map(comment => comment.name), ['code', 'code']);
    });
});
