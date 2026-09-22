const { parseFragment } = require('parse5');

const PROTECTED_TAGS = new Set([
    'pre', 'code', 'kbd', 'samp', 'script', 'style', 'textarea', 'svg', 'math',
    'template', 'noscript', 'iframe', 'xmp', 'plaintext'
]);

function getBlockComments(html) {
    if (typeof html !== 'string' || !/<!--\s*\/?wp:/i.test(html)) {
        return [];
    }

    const root = parseFragment(html, { sourceCodeLocationInfo: true });
    const pending = [...root.childNodes];
    const comments = [];

    while (pending.length) {
        const node = pending.pop();

        if (PROTECTED_TAGS.has(node.tagName)) {
            continue;
        }

        if (node.nodeName === '#comment' && node.sourceCodeLocation) {
            const marker = node.data.match(
                /^\s*(\/?)wp:([a-z][a-z0-9_-]*(?:\/[a-z][a-z0-9_-]*)?)(?:\s+(\{[\s\S]*\}))?\s*(\/?)\s*$/i
            );

            if (!marker || (marker[1] && (marker[3] || marker[4]))) {
                continue;
            }

            if (marker[3]) {
                try {
                    JSON.parse(marker[3]);
                } catch (error) {
                    continue;
                }
            }

            const location = node.sourceCodeLocation;
            comments.push({
                name: marker[2].toLowerCase(),
                closing: Boolean(marker[1]),
                markup: html.slice(location.startOffset, location.endOffset),
                start: location.startOffset,
                end: location.endOffset
            });
        }

        pending.push(...(node.childNodes || []));
    }

    return comments.sort((a, b) => a.start - b.start);
}

function removeBlockComments(html, comments = getBlockComments(html)) {
    for (let index = comments.length - 1; index >= 0; index--) {
        const comment = comments[index];
        html = html.slice(0, comment.start) + html.slice(comment.end);
    }

    return html.trim() ? html : '';
}

module.exports = {
    getBlockComments,
    removeBlockComments
};
