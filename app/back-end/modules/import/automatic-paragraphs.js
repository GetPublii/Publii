const { parseFragment } = require('parse5');

const PROTECTED_TAGS = new Set([
    'pre', 'code', 'kbd', 'samp', 'script', 'style', 'textarea', 'svg', 'math',
    'iframe', 'video', 'audio', 'picture', 'object', 'embed', 'form', 'select',
    'button', 'template', 'noscript', 'canvas', 'map', 'figure', 'table', 'ul', 'ol'
]);
const INLINE_PROTECTED_TAGS = new Set(['code', 'kbd', 'samp']);
const BLOCK_TAGS = '(?:address|article|aside|blockquote|caption|col|colgroup|dd|details|' +
    'div|dl|dt|fieldset|figcaption|figure|footer|form|h[1-6]|header|hgroup|hr|legend|' +
    'li|main|map|menu|nav|ol|p|pre|section|summary|table|tbody|td|tfoot|th|thead|tr|ul)';

/**
 * Restore classic WordPress paragraph formatting without rewriting protected HTML.
 * Paragraph and line-break rules follow the wpautop convention:
 * https://developer.wordpress.org/reference/functions/wpautop/
 */
function automaticParagraphs(inputText) {
    if (typeof inputText !== 'string' || !inputText.trim()) {
        return '';
    }

    let prefix = '\u0000PUBLIIAUTOP';

    while (inputText.includes(prefix)) {
        prefix += '_';
    }

    const preserved = [];
    const comments = new Set();
    const preserve = value => {
        const token = prefix + preserved.length + '\u0000';
        preserved.push(value);
        return token;
    };
    const tokenPattern = new RegExp(prefix + '(\\d+)\u0000', 'g');
    const root = parseFragment(inputText, { sourceCodeLocationInfo: true });
    const pending = [...root.childNodes];
    const fragments = [];

    while (pending.length) {
        const node = pending.pop();
        const location = node.sourceCodeLocation;
        const isComment = node.nodeName === '#comment';
        const isProtected = node.tagName &&
            (PROTECTED_TAGS.has(node.tagName) || node.tagName.includes('-'));

        if ((isComment || isProtected) && location) {
            const token = preserve(inputText.slice(location.startOffset, location.endOffset));

            if (isComment) {
                comments.add(token);
            }

            fragments.push({
                start: location.startOffset,
                end: location.endOffset,
                value: isComment || INLINE_PROTECTED_TAGS.has(node.tagName)
                    ? token
                    : '<pre>' + token + '</pre>'
            });
            continue;
        }

        pending.push(...(node.childNodes || []));
    }

    let text = inputText;

    for (const fragment of fragments.sort((a, b) => b.start - a.start)) {
        text = text.slice(0, fragment.start) + fragment.value + text.slice(fragment.end);
    }

    // Keep attribute values and line breaks inside tags outside the formatting rules.
    text = text.replace(/<[^<>"']*(?:(?:"[^"]*"|'[^']*')[^<>"']*)*>/g, tag => {
        return tag
            .replace(/"[^"]*"|'[^']*'/g, preserve)
            .replace(/\r\n|\r|\n/g, preserve);
    });
    text = text.replace(/\r\n|\r/g, '\n');
    text = text.replace(/<p>\s*<\/p>/gi, '');
    text = text.replace(/<br\s*\/?>\s*<br\s*\/?>/gi, '\n\n');
    text = text.replace(new RegExp('(<' + BLOCK_TAGS + '[\\s/>])', 'gi'), '\n\n$1');
    text = text.replace(new RegExp('(</' + BLOCK_TAGS + '>)', 'gi'), '$1\n\n');
    text = text.replace(/(<hr\b[^>]*>)/gi, '$1\n\n');

    text = text.split(/\n\s*\n/)
        .filter(paragraph => paragraph.trim())
        .map(paragraph => '<p>' + paragraph.replace(/^\n+|\n+$/g, '') + '</p>')
        .join('\n');
    text = text.replace(/<p>\s*<\/p>/gi, '');
    text = text.replace(/<p>([^<]+)<\/(div|address|form)>/gi, '<p>$1</p></$2>');
    text = text.replace(new RegExp('<p>\\s*(</?' + BLOCK_TAGS + '[^>]*>)\\s*</p>', 'gi'), '$1');
    text = text.replace(/<p>(<li\b[\s\S]*?)<\/p>/gi, '$1');
    text = text.replace(/<p><blockquote([^>]*)>/gi, '<blockquote$1><p>');
    text = text.replace(/<\/blockquote><\/p>/gi, '</p></blockquote>');
    text = text.replace(new RegExp('<p>\\s*(</?' + BLOCK_TAGS + '[^>]*>)', 'gi'), '$1');
    text = text.replace(new RegExp('(</?' + BLOCK_TAGS + '[^>]*>)\\s*</p>', 'gi'), '$1');

    text = text.replace(/<br\s*\/?>/gi, '<br>');
    text = text.replace(/([^\n]*)\n/g, (match, line) => {
        return line.replace(/[\t ]+$/, '').endsWith('<br>') ? match : line + '<br>\n';
    });
    text = text.replace(new RegExp('(</?' + BLOCK_TAGS + '[^>]*>)\\s*<br>', 'gi'), '$1');
    text = text.replace(/<br>(\s*<\/?(?:p|li|div|dl|dd|dt|th|pre|td|ul|ol)[^>]*>)/gi, '$1');
    text = text.replace(/\n<\/p>/gi, '</p>');

    // Standalone comments must not acquire visible paragraph spacing.
    text = text.replace(/<p>([\s\S]*?)<\/p>/gi, (match, content) => {
        const visible = content.replace(tokenPattern, token => comments.has(token) ? '' : token);
        return visible.replace(/<br>/gi, '').trim() ? match : content.replace(/<br>/gi, '');
    });
    text = text.replace(new RegExp('<pre>(' + prefix + '\\d+\u0000)</pre>', 'g'), '$1');
    text = text.trim();
    text = text.replace(tokenPattern, (match, index) => preserved[Number(index)]);

    return text ? text + '\n' : '';
}

module.exports = automaticParagraphs;
