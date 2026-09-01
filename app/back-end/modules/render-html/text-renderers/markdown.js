const marked = require('marked');
const LatexToSvg = require('./latex');

const dollarBlockPattern = /^(?: {0,3})\$\$[ \t]*(?:\r?\n([\s\S]*?)\r?\n[ \t]*\$\$[ \t]*(?:\r?\n|$)|([^\r\n]*?)\$\$[ \t]*(?:\r?\n|$))/;
const bracketBlockPattern = /^(?: {0,3})\\\[[ \t]*(?:\r?\n([\s\S]*?)\r?\n[ \t]*\\\][ \t]*(?:\r?\n|$)|([^\r\n]*?)\\\][ \t]*(?:\r?\n|$))/;

function createLatexToken (raw, tex, display, source) {
    return {
        type: display ? 'latexBlock' : 'latexInline',
        raw,
        tex,
        display,
        source
    };
}

function tokenizeDollarInline (source) {
    if (source[0] !== '$' || source[1] === '$' || !source[1] || /\s/.test(source[1])) {
        return false;
    }

    for (let index = 1; index < source.length; index++) {
        if (source[index] === '\n' || source[index] === '\r') {
            return false;
        }

        if (source[index] === '\\') {
            index++;
            continue;
        }

        if (
            source[index] === '$' &&
            source[index + 1] !== '$' &&
            !/\s/.test(source[index - 1])
        ) {
            let raw = source.substring(0, index + 1);
            return createLatexToken(raw, raw.substring(1, raw.length - 1), false, raw);
        }
    }

    return false;
}

marked.use({
    extensions: [
        {
            name: 'latexBlock',
            level: 'block',
            start (source) {
                let dollarIndex = source.search(/(?:^|\n) {0,3}\$\$/);
                let bracketIndex = source.search(/(?:^|\n) {0,3}\\\[/);
                let indexes = [dollarIndex, bracketIndex].filter(index => index > -1);
                return indexes.length ? Math.min(...indexes) : undefined;
            },
            tokenizer (source) {
                let match = dollarBlockPattern.exec(source) || bracketBlockPattern.exec(source);

                if (!match) {
                    return false;
                }

                let tex = typeof match[1] === 'string' ? match[1] : match[2];

                if (!tex || !tex.trim()) {
                    return false;
                }

                let raw = match[0];
                let sourceText = raw.trim();
                return createLatexToken(raw, tex, true, sourceText);
            },
            renderer (token) {
                return LatexToSvg.createPlaceholder(token.tex, true, token.source);
            }
        },
        {
            name: 'latexInline',
            level: 'inline',
            start (source) {
                let dollarIndex = source.indexOf('$');
                let parenthesisIndex = source.indexOf('\\(');
                let indexes = [dollarIndex, parenthesisIndex].filter(index => index > -1);
                return indexes.length ? Math.min(...indexes) : undefined;
            },
            tokenizer (source) {
                if (source.startsWith('\\(')) {
                    let match = /^\\\(([^\r\n]+?)\\\)/.exec(source);

                    if (match && match[1].trim()) {
                        return createLatexToken(match[0], match[1], false, match[0]);
                    }
                }

                return tokenizeDollarInline(source);
            },
            renderer (token) {
                return LatexToSvg.createPlaceholder(token.tex, false, token.source);
            }
        }
    ]
});

class MarkdownToHtml {
    static parse (inputText) {
        // Added support for image sizes - based on: https://github.com/markedjs/marked/issues/1279#issuecomment-1000908564
        let imageSizeLink = /^!?\[((?:\[[^\[\]]*\]|\\[\[\]]?|`[^`]*`|[^\[\]\\])*?)\]\(\s*(<(?:\\[<>]?|[^\s<>\\])*>|(?:\\[()]?|\([^\s\x00-\x1f()\\]*\)|[^\s\x00-\x1f()\\])*?(?:\s+=(?:[\w%]+)?x(?:[\w%]+)?)?)(?:\s+("(?:\\"?|[^"\\])*"|'(?:\\'?|[^'\\])*'|\((?:\\\)?|[^)\\])*\)))?\s*\)/;
        marked.Lexer.rules.inline.normal.link = imageSizeLink;
        marked.Lexer.rules.inline.gfm.link = imageSizeLink;
        marked.Lexer.rules.inline.breaks.link = imageSizeLink;
        let overridedRenderer = new marked.Renderer();
        
        overridedRenderer.image = function (href, title, text) {
            if (this.options.baseUrl && !originIndependentUrl.test(href)) {
                href = resolveUrl(this.options.baseUrl, href);
            }
        
            let size = href.match(/\s+=([\w%]+)?x([\w%]+)?$/);
            let dimensions = '';
        
            if (size) {
                href = href.substring(0, href.length - size[0].length);
                dimensions = ` width="${size[1]}" height="${size[2]}"`;
            }

            if (typeof title === 'string' && title.trim() !== '') {
                title = '<figcaption>' + title + '</figcaption>';
            } else {
                title = '';
            }
        
            return `<figure class="post__image"><img src="${href}" alt="${text}"${dimensions}>${title}</figure>`;
        };

        // Solve issues with rendering <figure> elements inside paragraphs
        overridedRenderer.paragraph = function(text) {
            if (text.startsWith('<figure') && text.endsWith('</figure>')) {
                return text;
            } else {
                return '<p>' + text + '</p>';
            }
        };
        
        marked.setOptions({
            smartLists: true,
            smartypants: true,
            xhtml: false,
            renderer: overridedRenderer
        });

        let outputText = marked.parse(inputText);
        return outputText;
    }
}

module.exports = MarkdownToHtml;
