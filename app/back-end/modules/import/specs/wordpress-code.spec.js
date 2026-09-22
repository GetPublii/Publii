const assert = require('node:assert/strict');
const { cleanHtml, normalizeTextAlignment } = require('../wordpress-html-cleaner');
const codeLanguages = require('../../../../shared/code-languages');

describe('WordPress code and preformatted cleanup', function() {
    it('makes unlabelled code editable as plain text without changing its source', function() {
        const code = '\n\t&lt;!-- wp:code --&gt;\r\n  &lt;?php echo "&amp;lt;"; ?&gt;<br><br>  ';
        const result = cleanHtml('<pre class="wp-block-code"><code>' + code + '</code></pre>');

        assert.equal(result.html, '<pre class="language-none"><code>' + code + '</code></pre>');
        assert.equal(result.stats.removedClasses, 1);
        assert.equal(result.stats.semanticConversions, 0);
        assert.equal(cleanHtml(result.html).html, result.html);
    });

    for (const blockClass of ['wp-block-preformatted', 'wp-block-verse']) {
        it('removes ' + blockClass + ' without turning text or ASCII art into code', function() {
            const content = '\n    (\\_/) &nbsp;<br>\t<strong>Keep</strong> &amp; &lt;tag&gt;\n\n';
            const result = cleanHtml('<PRE id="poem" class="' + blockClass + '">' + content + '</PRE>');

            assert.equal(result.html, '<PRE id="poem">' + content + '</PRE>');
            assert.equal(result.stats.removedClasses, 1);
            assert.equal(cleanHtml(result.html).html, result.html);
        });
    }

    for (const { value } of codeLanguages) {
        it('places the editor language ' + value + ' on pre', function() {
            const input = '<pre class="wp-block-code"><code class="language-' + value + '">  a &amp; b\n</code></pre>';
            const output = '<pre class="language-' + value + '"><code>  a &amp; b\n</code></pre>';

            assert.equal(cleanHtml(input).html, output);
            assert.equal(cleanHtml(output).html, output);
        });
    }

    for (const [source, target] of [
        ['js', 'javascript'],
        ['py', 'python'],
        ['sh', 'bash'],
        ['xml', 'markup'],
        ['c++', 'cpp'],
        ['c#', 'csharp'],
        ['text', 'none'],
        ['plaintext', 'none']
    ]) {
        it('normalizes the explicitly declared alias ' + source, function() {
            const input = '<pre class="wp-block-code line-numbers"><code class="lang-' + source + '">Code</code></pre>';

            assert.equal(cleanHtml(input).html,
                '<pre class="line-numbers language-' + target + '"><code>Code</code></pre>');
        });
    }

    it('retains language position, line numbering, anchors and custom attributes', function() {
        const input = '<pre id="sample" class="wp-block-code language-js line-numbers" data-start="3" ' +
            'style="tab-size:8"><code class="language-javascript custom-code">const a = 1;</code></pre>';

        assert.equal(cleanHtml(input).html,
            '<pre id="sample" class="language-javascript line-numbers" data-start="3" ' +
            'style="tab-size:8"><code class="custom-code">const a = 1;</code></pre>');
    });

    it('respects an inherited language instead of overriding it with plain text', function() {
        const input = '<div class="language-js"><pre class="wp-block-code"><code>Code</code></pre></div>';

        assert.equal(cleanHtml(input).html,
            '<div class="language-js"><pre class="language-javascript"><code>Code</code></pre></div>');
    });

    it('does not guess when an inherited language is unsupported', function() {
        const input = '<div class="language-future"><pre class="wp-block-code"><code>Code</code></pre></div>';

        assert.equal(cleanHtml(input).html,
            '<div class="language-future"><pre><code>Code</code></pre></div>');
    });

    for (const input of [
        '<pre class="wp-block-code"><code class="language-future">Code</code></pre>',
        '<pre class="wp-block-code language-php"><code class="language-python">Code</code></pre>',
        '<pre class="wp-block-code"><code><span class="token keyword">const</span> a = 1;</code></pre>',
        '<pre class="wp-block-code"><code><a href="docs.html">Link</a></code></pre>',
        '<pre class="wp-block-code">Before<code>Code</code></pre>',
        '<pre class="wp-block-code"><code>One</code><code>Two</code></pre>',
        '<pre class="wp-block-code"><!-- Keep --><code>Code</code></pre>'
    ]) {
        it('removes only the WP marker when code cannot be normalized: ' + input.slice(0, 70), function() {
            const expected = input.replace(' class="wp-block-code"', '').replace('wp-block-code ', '');

            assert.equal(cleanHtml(input).html, expected);
        });
    }

    for (const input of [
        '<pre class="wp-block-code" onclick="run()"><code>Code</code></pre>',
        '<pre class="wp-block-code" data-widget="code"><code>Code</code></pre>',
        '<pre class="wp-block-code" contenteditable="true"><code>Code</code></pre>',
        '<pre class="wp-block-code"><code data-widget="code">Code</code></pre>',
        '<pre class="wp-block-code"><code><img src="image.jpg" onclick="run()"></code></pre>',
        '<pre class="wp-block-code"><code><iframe src="widget.html"></iframe></code></pre>',
        '<div data-wp-interactive="widget"><pre class="wp-block-code"><code>Code</code></pre></div>',
        '<pre class="wp-block-preformatted" style="background-image:url(image.jpg)">Text</pre>',
        '<script>init()</script><pre class="wp-block-code"><code>Code</code></pre>',
        '<pre class="wp-block-code" class="language-js"><code>Code</code></pre>',
        '<pre><code>&lt;pre class="wp-block-code"&gt;Example&lt;/pre&gt;</code></pre>',
        '<pre><code><pre class="wp-block-code"><code>Nested sample</code></pre></code></pre>'
    ]) {
        it('keeps protected and ambiguous source unchanged: ' + input.slice(0, 70), function() {
            assert.equal(cleanHtml(input).html, input);
        });
    }

    it('does not convert code when only text alignment is requested', function() {
        const input = '<pre class="wp-block-code" style="color:red"><code class="lang-js">Code</code></pre>';

        assert.equal(normalizeTextAlignment(input), input);
    });
});
