const fs = require('fs-extra');
const path = require('path');
const { pathToFileURL } = require('url');

const PLACEHOLDER_PATTERN = /<publii-math data-publii-latex="([A-Za-z0-9_-]+)">[\s\S]*?<\/publii-math>/g;

class LatexToSvg {
    static createPlaceholder (tex, display, source) {
        let payload = Buffer.from(JSON.stringify({
            tex,
            display,
            source
        }), 'utf8').toString('base64url');

        return `<publii-math data-publii-latex="${payload}">${LatexToSvg.escapeHtml(source)}</publii-math>`;
    }

    static async processDirectory (outputDir) {
        LatexToSvg.formulaCache.clear();
        let htmlFiles = await LatexToSvg.findHtmlFiles(outputDir);
        let warnings = [];

        for (let htmlFile of htmlFiles) {
            let content = await fs.readFile(htmlFile, 'utf8');

            if (content.indexOf('<publii-math data-publii-latex=') === -1) {
                continue;
            }

            let result = await LatexToSvg.processContent(content, htmlFile);
            warnings.push(...result.warnings);

            if (result.content !== content) {
                await fs.writeFile(htmlFile, result.content, 'utf8');
            }
        }

        return warnings;
    }

    static async processContent (content, sourceName = '') {
        let matches = Array.from(content.matchAll(PLACEHOLDER_PATTERN));
        let warnings = [];

        for (let match of matches) {
            let replacement = match[0];

            try {
                let payload = LatexToSvg.decodePayload(match[1]);
                replacement = await LatexToSvg.renderFormula(payload.tex, payload.display);
            } catch (error) {
                let payload = LatexToSvg.decodePayloadSafely(match[1]);
                let originalSource = payload ? payload.source : '';
                replacement = LatexToSvg.escapeHtml(originalSource);
                warnings.push({
                    source: sourceName,
                    formula: originalSource,
                    message: error.message
                });
            }

            content = content.replace(match[0], replacement);
        }

        return { content, warnings };
    }

    static async renderFormula (tex, display) {
        let mathJax = await LatexToSvg.getMathJax();
        let cacheKey = `${display ? 'display' : 'inline'}:${tex}`;

        if (LatexToSvg.formulaCache.has(cacheKey)) {
            return LatexToSvg.formulaCache.get(cacheKey);
        }

        mathJax.texReset();
        let node = await mathJax.tex2svgPromise(tex, { display });
        let svg = mathJax.startup.adaptor.serializeXML(node);
        mathJax.texReset();
        let mathMl = await mathJax.tex2mmlPromise(tex, { display });
        let className = display ? 'publii-math publii-math--display' : 'publii-math publii-math--inline';
        let style = display ? ' style="display:block;overflow-x:auto;overflow-y:hidden;text-align:center;margin:1em 0"' : '';
        let assistiveStyle = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0';
        let assistiveMathMl = `<span class="publii-math__assistive" style="${assistiveStyle}">${mathMl}</span>`;
        let output = `<${display ? 'div' : 'span'} class="${className}"${style}>${svg}${assistiveMathMl}</${display ? 'div' : 'span'}>`;

        LatexToSvg.formulaCache.set(cacheKey, output);
        return output;
    }

    static getMathJax () {
        if (!LatexToSvg.mathJaxPromise) {
            let importComponent = file => import(path.isAbsolute(file) ? pathToFileURL(file).href : file);

            global.MathJax = global.MathJax || {};
            global.MathJax.loader = Object.assign({}, global.MathJax.loader, {
                require: importComponent
            });
            const MathJax = require('mathjax');

            LatexToSvg.mathJaxPromise = MathJax.init({
                loader: {
                    load: ['input/tex', 'output/svg'],
                    require: importComponent
                },
                svg: {
                    fontCache: 'none'
                },
                tex: {
                    formatError: (jax, error) => {
                        throw error;
                    }
                }
            });
        }

        return LatexToSvg.mathJaxPromise;
    }

    static decodePayload (payload) {
        let decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));

        if (
            typeof decoded.tex !== 'string' ||
            typeof decoded.display !== 'boolean' ||
            typeof decoded.source !== 'string'
        ) {
            throw new Error('Invalid LaTeX placeholder data.');
        }

        return decoded;
    }

    static decodePayloadSafely (payload) {
        try {
            return LatexToSvg.decodePayload(payload);
        } catch (error) {
            return false;
        }
    }

    static async findHtmlFiles (directory) {
        let entries = await fs.readdir(directory, { withFileTypes: true });
        let files = [];

        for (let entry of entries) {
            let entryPath = path.join(directory, entry.name);

            if (entry.isDirectory()) {
                files.push(...await LatexToSvg.findHtmlFiles(entryPath));
            } else if (entry.isFile() && path.extname(entry.name).toLowerCase() === '.html') {
                files.push(entryPath);
            }
        }

        return files;
    }

    static escapeHtml (value) {
        return value
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
}

LatexToSvg.mathJaxPromise = null;
LatexToSvg.formulaCache = new Map();

module.exports = LatexToSvg;
