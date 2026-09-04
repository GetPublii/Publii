const assert = require('assert');
const indentHtml = require('../html-indenter.js');

const fixtureGroups = {
    'basic': [
        {
            name: 'simple nesting',
            input: '<div><section><p>Test</p></section></div>',
            expected: [
                '<div>',
                '\t<section>',
                '\t\t<p>Test</p>',
                '\t</section>',
                '</div>'
            ].join('\n')
        },
        {
            name: 'void elements',
            input: '<div><img src="x"><br><input type="text"></div>',
            expected: [
                '<div>',
                '\t<img src="x">',
                '\t<br>',
                '\t<input type="text">',
                '</div>'
            ].join('\n')
        },
        {
            name: 'self-closing element',
            input: '<div><foo /></div>',
            expected: [
                '<div>',
                '\t<foo />',
                '</div>'
            ].join('\n')
        },
        {
            name: 'doctype',
            input: '<!DOCTYPE html><html><body><p>Test</p></body></html>',
            expected: [
                '<!DOCTYPE html>',
                '<html>',
                '\t<body>',
                '\t\t<p>Test</p>',
                '\t</body>',
                '</html>'
            ].join('\n')
        },
        {
            name: 'uppercase tags keep their casing',
            input: '<DIV><SPAN>Test</SPAN></DIV>',
            expected: [
                '<DIV>',
                '\t<SPAN>Test</SPAN>',
                '</DIV>'
            ].join('\n')
        },
        {
            name: 'custom elements',
            input: '<div><publii-block><span>Test</span></publii-block></div>',
            expected: [
                '<div>',
                '\t<publii-block>',
                '\t\t<span>Test</span>',
                '\t</publii-block>',
                '</div>'
            ].join('\n')
        },
        {
            name: 'empty element',
            input: '<div></div>',
            expected: [
                '<div>',
                '</div>'
            ].join('\n')
        },
        {
            name: 'already formatted input stays unchanged',
            input: [
                '<div>',
                '\t<section>',
                '\t\t<p>Test</p>',
                '\t</section>',
                '</div>'
            ].join('\n'),
            expected: [
                '<div>',
                '\t<section>',
                '\t\t<p>Test</p>',
                '\t</section>',
                '</div>'
            ].join('\n')
        },
        {
            name: 'input formatted with spaces is re-indented with tabs',
            input: [
                '<div>',
                '    <section>',
                '        <p>Test</p>',
                '    </section>',
                '</div>'
            ].join('\n'),
            expected: [
                '<div>',
                '\t<section>',
                '\t\t<p>Test</p>',
                '\t</section>',
                '</div>'
            ].join('\n')
        }
    ],
    'nesting': [
        {
            name: 'list',
            input: '<ul><li>One</li><li>Two</li></ul>',
            expected: [
                '<ul>',
                '\t<li>One</li>',
                '\t<li>Two</li>',
                '</ul>'
            ].join('\n')
        },
        {
            name: 'table',
            input: '<table><thead><tr><th>A</th></tr></thead><tbody><tr><td>B</td></tr></tbody></table>',
            expected: [
                '<table>',
                '\t<thead>',
                '\t\t<tr>',
                '\t\t\t<th>A</th>',
                '\t\t</tr>',
                '\t</thead>',
                '\t<tbody>',
                '\t\t<tr>',
                '\t\t\t<td>B</td>',
                '\t\t</tr>',
                '\t</tbody>',
                '</table>'
            ].join('\n')
        },
        {
            name: 'a single blank line between blocks is kept',
            input: '<div><p>A</p>\n\n\n<p>B</p></div>',
            expected: [
                '<div>',
                '\t<p>A</p>',
                '',
                '\t<p>B</p>',
                '</div>'
            ].join('\n')
        },
        {
            name: 'trailing newline is preserved',
            input: '<div><p>Test</p></div>\n',
            expected: [
                '<div>',
                '\t<p>Test</p>',
                '</div>',
                ''
            ].join('\n')
        }
    ],
    'mixed content': [
        {
            name: 'inline mixed content stays on a single line',
            input: '<p>Hello <strong>world</strong>!</p>',
            expected: '<p>Hello <strong>world</strong>!</p>'
        },
        {
            name: 'nested mixed content stays on a single line',
            input: '<div><p>Hello <strong>world</strong>!</p></div>',
            expected: [
                '<div>',
                '\t<p>Hello <strong>world</strong>!</p>',
                '</div>'
            ].join('\n')
        },
        {
            name: 'html entities are kept untouched',
            input: '<p>&lt;div&gt; &amp; &nbsp;</p>',
            expected: '<p>&lt;div&gt; &amp; &nbsp;</p>'
        },
        {
            name: 'link inside text',
            input: '<p>Visit <a href="https://example.com">site</a> now</p>',
            expected: '<p>Visit <a href="https://example.com">site</a> now</p>'
        },
        {
            name: 'lone "<" inside text',
            input: '<p>a < b</p>',
            expected: '<p>a < b</p>'
        },
        {
            name: 'multiple spaces inside text are kept',
            input: '<p>foo   bar</p>',
            expected: '<p>foo   bar</p>'
        },
        {
            name: 'whitespace-only gap between inline elements may become a newline',
            input: '<p><strong>a</strong> <em>b</em></p>',
            expected: [
                '<p>',
                '\t<strong>a</strong>',
                '\t<em>b</em>',
                '</p>'
            ].join('\n')
        },
        {
            name: 'shortcode-like text is plain text',
            input: '<p>[gallery ids="1,2,3"]</p>',
            expected: '<p>[gallery ids="1,2,3"]</p>'
        },
        {
            name: 'element closed right after an inline child stays on one line',
            input: '<ul><li>Item <a href="#">link</a></li></ul>',
            expected: [
                '<ul>',
                '\t<li>Item <a href="#">link</a></li>',
                '</ul>'
            ].join('\n')
        },
        {
            name: 'text after a block child glues the rest of the element',
            input: '<div><p>A</p>trailing</div>',
            expected: [
                '<div>',
                '\t<p>A</p>trailing</div>'
            ].join('\n')
        }
    ],
    'script blocks': [
        {
            name: 'script content with html string is untouched',
            input: '<div><script>const tpl="<div></div>";</script></div>',
            expected: [
                '<div>',
                '\t<script>const tpl="<div></div>";</script>',
                '</div>'
            ].join('\n')
        },
        {
            name: 'multiline script content is untouched',
            input: '<div><script>\nconst foo={bar:1};\nif(foo){console.log(foo);}\n</script></div>',
            expected: [
                '<div>',
                '\t<script>',
                'const foo={bar:1};',
                'if(foo){console.log(foo);}',
                '</script>',
                '</div>'
            ].join('\n')
        },
        {
            name: 'external script',
            input: '<div><script src="app.js"></script><p>Test</p></div>',
            expected: [
                '<div>',
                '\t<script src="app.js"></script>',
                '\t<p>Test</p>',
                '</div>'
            ].join('\n')
        },
        {
            name: 'uppercase script tag is found case-insensitively',
            input: '<div><SCRIPT>let x=1;</SCRIPT></div>',
            expected: [
                '<div>',
                '\t<SCRIPT>let x=1;</SCRIPT>',
                '</div>'
            ].join('\n')
        },
        {
            name: 'unclosed script consumes the rest of the input',
            input: '<div><script>let x=1;',
            expected: [
                '<div>',
                '\t<script>let x=1;'
            ].join('\n')
        }
    ],
    'style blocks': [
        {
            name: 'style content is untouched',
            input: '<div><style>.foo{display:flex}</style></div>',
            expected: [
                '<div>',
                '\t<style>.foo{display:flex}</style>',
                '</div>'
            ].join('\n')
        },
        {
            name: 'multiline style content is untouched',
            input: '<div><style>\n.foo{display:flex}\n.bar   {color:red}\n</style></div>',
            expected: [
                '<div>',
                '\t<style>',
                '.foo{display:flex}',
                '.bar   {color:red}',
                '</style>',
                '</div>'
            ].join('\n')
        }
    ],
    'pre blocks': [
        {
            name: 'pre content whitespace is preserved exactly',
            input: '<div><pre>foo\n    bar\n baz</pre></div>',
            expected: [
                '<div>',
                '\t<pre>foo',
                '    bar',
                ' baz</pre>',
                '</div>'
            ].join('\n')
        },
        {
            name: 'pre with code block',
            input: '<div><pre><code>if (x) {\n    y();\n}</code></pre></div>',
            expected: [
                '<div>',
                '\t<pre><code>if (x) {',
                '    y();',
                '}</code></pre>',
                '</div>'
            ].join('\n')
        },
        {
            name: 'pre with html-like content',
            input: '<pre>&lt;div&gt;\n<b>bold</b>   spaces </pre>',
            expected: '<pre>&lt;div&gt;\n<b>bold</b>   spaces </pre>'
        }
    ],
    'textarea blocks': [
        {
            name: 'textarea content whitespace is preserved exactly',
            input: '<form><textarea>  raw\n content </textarea></form>',
            expected: [
                '<form>',
                '\t<textarea>  raw',
                ' content </textarea>',
                '</form>'
            ].join('\n')
        },
        {
            name: 'textarea with attributes',
            input: '<div><textarea rows="5" cols="30">value</textarea></div>',
            expected: [
                '<div>',
                '\t<textarea rows="5" cols="30">value</textarea>',
                '</div>'
            ].join('\n')
        }
    ],
    'malformed html': [
        {
            name: 'unclosed element does not throw',
            input: '<div><section></div>',
            expected: [
                '<div>',
                '\t<section>',
                '\t</div>'
            ].join('\n')
        },
        {
            name: 'closing tag without opening never gives negative indentation',
            input: '</div><p>Test</p>',
            expected: [
                '</div>',
                '<p>Test</p>'
            ].join('\n')
        },
        {
            name: 'multiple orphan closing tags',
            input: '</div></section></article><p>Test</p>',
            expected: [
                '</div>',
                '</section>',
                '</article>',
                '<p>Test</p>'
            ].join('\n')
        },
        {
            name: 'unclosed element at the end of input',
            input: '<div><p>Test',
            expected: [
                '<div>',
                '\t<p>Test'
            ].join('\n')
        },
        {
            name: 'plain text only',
            input: 'just some text',
            expected: 'just some text'
        },
        {
            name: 'unterminated tag at the end of input',
            input: '<div><p class="foo',
            expected: [
                '<div>',
                '\t<p class="foo'
            ].join('\n')
        },
        {
            name: 'bogus closing tag is an opaque token',
            input: '</><div><p>X</p></div>',
            expected: [
                '</>',
                '<div>',
                '\t<p>X</p>',
                '</div>'
            ].join('\n')
        }
    ],
    'attributes': [
        {
            name: '">" inside a double-quoted attribute',
            input: '<div data-expression="x > y"><span>Test</span></div>',
            expected: [
                '<div data-expression="x > y">',
                '\t<span>Test</span>',
                '</div>'
            ].join('\n')
        },
        {
            name: '"<" inside a double-quoted attribute',
            input: '<div data-expression="x < y"><span>Test</span></div>',
            expected: [
                '<div data-expression="x < y">',
                '\t<span>Test</span>',
                '</div>'
            ].join('\n')
        },
        {
            name: 'mixed quotes with tag delimiters inside',
            input: '<div data-a=\'>\' data-b="<"><p>X</p></div>',
            expected: [
                '<div data-a=\'>\' data-b="<">',
                '\t<p>X</p>',
                '</div>'
            ].join('\n')
        },
        {
            name: 'multiline tag is moved as a unit, attributes are not merged',
            input: '<div\n    class="foo"\n    data-value="bar"\n><p>Test</p></div>',
            expected: [
                '<div',
                '    class="foo"',
                '    data-value="bar"',
                '>',
                '\t<p>Test</p>',
                '</div>'
            ].join('\n')
        },
        {
            name: 'attribute values with multiple spaces are untouched',
            input: '<div class="foo   bar"><p>X</p></div>',
            expected: [
                '<div class="foo   bar">',
                '\t<p>X</p>',
                '</div>'
            ].join('\n')
        }
    ],
    'comments': [
        {
            name: 'comment content does not affect the structure',
            input: '<div><!-- <span>fake</span> --><p>Test</p></div>',
            expected: [
                '<div>',
                '\t<!-- <span>fake</span> -->',
                '\t<p>Test</p>',
                '</div>'
            ].join('\n')
        },
        {
            name: 'multiline comment content is untouched',
            input: '<div><!--\n<div>\n    fake\n</div>\n--><p>Real</p></div>',
            expected: [
                '<div>',
                '\t<!--',
                '<div>',
                '    fake',
                '</div>',
                '-->',
                '\t<p>Real</p>',
                '</div>'
            ].join('\n')
        },
        {
            name: 'unterminated comment consumes the rest of the input',
            input: '<div><!-- oops <p>X</p>',
            expected: [
                '<div>',
                '\t<!-- oops <p>X</p>'
            ].join('\n')
        }
    ],
    'real-world Publii samples': [
        {
            name: 'figure with caption',
            input: '<figure class="post__image"><img src="/media/posts/1/photo.jpg" alt="Photo" width="1200" height="800"><figcaption>Caption <em>text</em></figcaption></figure>',
            expected: [
                '<figure class="post__image">',
                '\t<img src="/media/posts/1/photo.jpg" alt="Photo" width="1200" height="800">',
                '\t<figcaption>Caption <em>text</em></figcaption>',
                '</figure>'
            ].join('\n')
        },
        {
            name: 'php-like block is a single opaque token',
            input: '<div><?php echo $foo; ?><p>Test</p></div>',
            expected: [
                '<div>',
                '\t<?php echo $foo; ?>',
                '\t<p>Test</p>',
                '</div>'
            ].join('\n')
        },
        {
            name: 'youtube embed',
            input: '<div class="post__video"><iframe width="560" height="315" src="https://www.youtube.com/embed/xyz?rel=0&amp;showinfo=0" frameborder="0" allowfullscreen></iframe></div>'
        },
        {
            name: 'svg icon',
            input: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g><path d="M12 2L2 22h20L12 2z"></path></g></svg>'
        },
        {
            name: 'form with inputs and textarea',
            input: '<form action="/subscribe" method="post"><label for="email">E-mail</label><input type="email" id="email" name="email" required><textarea name="msg">  keep\n   me </textarea><button type="submit">Send</button></form>'
        },
        {
            name: 'block editor output with data attributes',
            input: '<div class="publii-block" data-block-type="gallery" data-columns="3"><figure data-index="0"><img src="/media/a.jpg" alt=""><figcaption>A &amp; B</figcaption></figure><figure data-index="1"><img src="/media/b.jpg" alt=""></figure></div>'
        },
        {
            name: 'post with inline js and css',
            input: '<div><style>\n.widget { color: red }\n</style><div id="widget">Loading&hellip;</div><script>\ndocument.getElementById("widget").innerHTML = "<b>done</b>";\n</script></div>'
        },
        {
            name: 'pre code snippet with entities',
            input: '<p>Example:</p><pre><code class="language-js">const a = 1;\nif (a &lt; 2) {\n    run();\n}</code></pre><p>Done.</p>'
        },
        {
            name: 'blockquote with cite',
            input: '<blockquote><p>Quote with <a href="https://example.com?a=1&amp;b=2">link</a>.</p><cite>&mdash; Author</cite></blockquote>'
        },
        {
            name: 'readmore and comments markers',
            input: '<p>Intro</p><!--more--><p>Rest of the post</p>'
        },
        {
            name: 'template element',
            input: '<template><div><p>Test</p></div></template>'
        },
        {
            name: 'conditional comment',
            input: '<div><!--[if IE]><p>IE only</p><![endif]--><p>All</p></div>'
        },
        {
            name: 'cdata section',
            input: '<div><![CDATA[ raw <content> ]]><p>X</p></div>'
        }
    ]
};

function stripAllWhitespace (value) {
    return value.replace(/\s+/g, '');
}

function collapseGapsBetweenTags (value) {
    return value.trim().replace(/>\s+</g, '><');
}

describe('HTML indenter', function() {
    Object.keys(fixtureGroups).forEach(function(groupName) {
        describe(groupName, function() {
            fixtureGroups[groupName].forEach(function(fixture) {
                it(fixture.name, function() {
                    const output = indentHtml(fixture.input);

                    if (typeof fixture.expected === 'string') {
                        assert.strictEqual(output, fixture.expected);
                    }

                    assert.strictEqual(
                        indentHtml(output),
                        output,
                        'result is not idempotent'
                    );

                    assert.strictEqual(
                        stripAllWhitespace(output),
                        stripAllWhitespace(fixture.input),
                        'non-whitespace content has changed'
                    );

                    assert.strictEqual(
                        collapseGapsBetweenTags(output),
                        collapseGapsBetweenTags(fixture.input),
                        'whitespace changed outside of inter-tag gaps'
                    );
                });
            });
        });
    });
});
