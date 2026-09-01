const assert = require('assert');
const MarkdownToHtml = require('../markdown');

describe('Markdown LaTeX tokens', function () {
    it('marks inline dollar and parenthesis formulas', function () {
        let output = MarkdownToHtml.parse('Energy is $E = mc^2$ and \\(a + b\\).');
        let placeholders = output.match(/<publii-math data-publii-latex=/g) || [];

        assert.strictEqual(placeholders.length, 2);
        assert.match(output, /Energy is <publii-math/);
    });

    it('marks single-line and multiline display formulas', function () {
        let output = MarkdownToHtml.parse([
            '$$E = mc^2$$',
            '',
            '\\[',
            '\\begin{bmatrix}1 & 2 \\\\ 3 & 4\\end{bmatrix}',
            '\\]'
        ].join('\n'));
        let placeholders = output.match(/<publii-math data-publii-latex=/g) || [];

        assert.strictEqual(placeholders.length, 2);
        assert.ok(!output.includes('<p><publii-math'));
    });

    it('does not mark escaped, currency, unmatched, code, or raw HTML formulas', function () {
        let output = MarkdownToHtml.parse([
            'Escaped \\$5 and currency $5 and $10 and unmatched $x.',
            '',
            '`$inline_code$`',
            '',
            '```latex',
            '$display_code$',
            '```',
            '',
            '<div>',
            '$raw_html$',
            '</div>'
        ].join('\n'));

        assert.ok(!output.includes('<publii-math'));
        assert.match(output, /<code>\$inline_code\$<\/code>/);
        assert.match(output, /<div>\n\$raw_html\$\n<\/div>/);
    });
});
