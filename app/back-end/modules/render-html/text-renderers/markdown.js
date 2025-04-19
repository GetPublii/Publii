const marked = require('marked');

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
