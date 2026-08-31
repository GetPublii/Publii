const assert = require('assert');
const fs = require('fs-extra');
const os = require('os');
const path = require('path');
const LatexToSvg = require('../latex');

describe('LaTeX SVG renderer', function () {
    this.timeout(30000);

    it('renders inline and display placeholders as self-contained SVG', async function () {
        let inline = LatexToSvg.createPlaceholder('E = mc^2', false, '$E = mc^2$');
        let display = LatexToSvg.createPlaceholder('\\begin{bmatrix}1 & 2 \\\\ 3 & 4\\end{bmatrix}', true, '$$matrix$$');
        let result = await LatexToSvg.processContent(`<p>${inline}</p>${display}`, 'test.html');

        assert.strictEqual(result.warnings.length, 0);
        assert.ok(!result.content.includes('<publii-math'));
        assert.match(result.content, /<mjx-container[^>]+jax="SVG"/);
        assert.match(result.content, /<svg/);
        assert.match(result.content, /<math[^>]+xmlns="http:\/\/www\.w3\.org\/1998\/Math\/MathML"/);
        assert.match(result.content, /publii-math--display/);
        assert.ok(!result.content.includes('id="MJX-'));
        assert.ok(!result.content.includes('<script'));
        assert.ok(!result.content.includes('cdn.jsdelivr.net'));
    });

    it('supports AMS environments and formula-local custom macros', async function () {
        let tex = '\\newcommand{\\R}{\\mathbb{R}}\\begin{align}f &: \\R \\to \\R \\\\ f(x) &= x^2\\end{align}';
        let placeholder = LatexToSvg.createPlaceholder(tex, true, `$$${tex}$$`);
        let result = await LatexToSvg.processContent(placeholder, 'ams.html');

        assert.strictEqual(result.warnings.length, 0);
        assert.match(result.content, /<svg/);
    });

    it('preserves invalid formulas and reports a non-fatal warning', async function () {
        let placeholder = LatexToSvg.createPlaceholder('\\frac{1', false, '$\\frac{1$');
        let result = await LatexToSvg.processContent(placeholder, 'invalid.html');

        assert.strictEqual(result.warnings.length, 1);
        assert.strictEqual(result.content, '$\\frac{1$');
        assert.match(result.warnings[0].message, /Missing|Extra|Undefined|TeX/i);
    });

    it('processes HTML files only and leaves unmarked content unchanged', async function () {
        let tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'publii-latex-'));
        let htmlPath = path.join(tempDir, 'index.html');
        let xmlPath = path.join(tempDir, 'feed.xml');
        let placeholder = LatexToSvg.createPlaceholder('x^2', false, '$x^2$');

        try {
            await fs.writeFile(htmlPath, `<p>Plain $y$ ${placeholder}</p>`, 'utf8');
            await fs.writeFile(xmlPath, placeholder, 'utf8');
            let warnings = await LatexToSvg.processDirectory(tempDir);
            let html = await fs.readFile(htmlPath, 'utf8');
            let xml = await fs.readFile(xmlPath, 'utf8');

            assert.strictEqual(warnings.length, 0);
            assert.ok(html.includes('Plain $y$'));
            assert.match(html, /<svg/);
            assert.ok(xml.includes('<publii-math'));
        } finally {
            await fs.remove(tempDir);
        }
    });
});
