const marked = require('marked');

class MarkdownToHtml {
    static parse (inputText) {
        marked.setOptions({
            smartLists: true,
            smartypants: true
        });

        let outputText = marked(inputText);
        return outputText;
    }
}

module.exports = MarkdownToHtml;
