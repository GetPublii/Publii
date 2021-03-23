function automaticParagraphs (inputText) {
    let rules = [
        [/<br \/>/gmi, '<br>'],
        [/<object[\s\S]+?<\/object>/g, matchingText => matchingText.replace(/[\r\n]+/g, '')],
        [/<[^<>]+>/g, matchingText => matchingText.replace(/[\r\n]+/g, ' ')],
        [/<(pre|script|style)[^>]*>[\s\S]+?<\/\1>/g, matchingText => matchingText.replace(/(\r\n|\n)/g, '<restore-line-break>')],
        [/(<(?:address|aside|blockquote|caption|dd|div|dl|dt|figcaption|figure|h1|h2|h3|h4|h5|h6|header|hr|legend|li|ol|p|pre|section|table|tbody|td|tfoot|th|thead|tr|ul)(?: [^>]*)?>)/gi, "\n$1"],
        [/(<\/(?:address|aside|blockquote|caption|dd|div|dl|dt|figcaption|figure|h1|h2|h3|h4|h5|h6|header|hr|legend|li|ol|p|pre|section|table|tbody|td|tfoot|th|thead|tr|ul)>)/gi, "$1\n\n"],
        [/([\s\S]+?)\n\n/g, "<p>$1</p>\n"],
        [/<p>\s*(<\/?(?:address|aside|blockquote|caption|dd|div|dl|dt|figcaption|figure|h1|h2|h3|h4|h5|h6|header|hr|legend|li|ol|p|pre|section|table|tbody|td|tfoot|th|thead|tr|ul)(?: [^>]*)?>)\s*<\/p>/gi, '$1'],
        [/<p>(<li.+?)<\/p>/gi, '$1'],
        [/<p>\s*(<\/?(?:address|aside|blockquote|caption|dd|div|dl|dt|figcaption|figure|h1|h2|h3|h4|h5|h6|header|hr|legend|li|ol|p|pre|section|table|tbody|td|tfoot|th|thead|tr|ul)(?: [^>]*)?>)/gi, '$1'],
        [/(<\/?(?:address|aside|blockquote|caption|dd|div|dl|dt|figcaption|figure|h1|h2|h3|h4|h5|h6|header|hr|legend|li|ol|p|pre|section|table|tbody|td|tfoot|th|thead|tr|ul)(?: [^>]*)?>)\s*<\/p>/gi, '$1'],
        [/(<\/?(?:address|aside|blockquote|caption|dd|div|dl|dt|figcaption|figure|h1|h2|h3|h4|h5|h6|header|hr|legend|li|ol|p|pre|section|table|tbody|td|tfoot|th|thead|tr|ul)[^>]*>)\s*<br>/gi, '$1'],
        [/<br>(\s*<\/?(?:dd|div|dl|dt|li|ol|p|pre|td|th|ul)>)/gi, '$1'],
        [/(<(?:dd|div|th|td)[^>]*>)(.*?)<\/p>/g, (match, offset, content) => (content.match(/<p( [^>]*)?>/)) ? match : offset + '<p>' + content + '</p>'],
        [/<restore-line-break>/g, "\n"]
        [/<p><\/p>/gi, '']
    ];

    inputText = inputText + "\n\n";

    for (let i = 0; i < rules.length; i++) {
        if (!rules[i]) {
            continue;
        }
        
        inputText = inputText.replace(rules[i][0], rules[i][1]);
    }
  
    return inputText;
}

module.exports = automaticParagraphs;
