const marked = require('marked');

class MarkdownToHtml {
    static parse (inputText) {
        // Added support for image sizes - based on: https://github.com/markedjs/marked/issues/1279#issuecomment-392852986
        let imageSizeLink = /^!?\[((?:\[[^\[\]]*\]|\\[\[\]]?|`[^`]*`|[^\[\]\\])*?)\]\(\s*(<(?:\\[<>]?|[^\s<>\\])*>|(?:\\[()]?|\([^\s\x00-\x1f()\\]*\)|[^\s\x00-\x1f()\\])*?(?:\s+=(?:[\w%]+)?x(?:[\w%]+)?)?)(?:\s+("(?:\\"?|[^"\\])*"|'(?:\\'?|[^'\\])*'|\((?:\\\)?|[^)\\])*\)))?\s*\)/;
        marked.InlineLexer.rules.normal.link = imageSizeLink;
        marked.InlineLexer.rules.gfm.link = imageSizeLink;
        marked.InlineLexer.rules.breaks.link = imageSizeLink;
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
        
            return `<figure class="post__image"><img src="${href}" alt="${text}"${dimensions} /></figure>`;
        };
        
        marked.setOptions({
            smartLists: true,
            smartypants: true,
            xhtml: false,
            renderer: overridedRenderer
        });

        let outputText = marked(inputText);
        return outputText;
    }
}

module.exports = MarkdownToHtml;
