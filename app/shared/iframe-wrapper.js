/*
 * Normalize iframe wrappers in the editor and rendered content, respecting opt-outs.
 * Scan markup without reserializing it, preserving custom HTML and attributes.
 */

const voidElements = new Set([
    'area',
    'base',
    'br',
    'col',
    'embed',
    'hr',
    'img',
    'input',
    'link',
    'meta',
    'param',
    'source',
    'track',
    'wbr'
]);

function getAttributes (tag) {
    const attributes = {};
    const source = tag.replace(/^<[a-z][\w:-]*/i, '').replace(/\/?\s*>$/, '');
    const pattern = /([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
    let match;

    while ((match = pattern.exec(source))) {
        attributes[match[1].toLowerCase()] = match[2] ?? match[3] ?? match[4] ?? '';
    }

    return attributes;
}

function wrapIframes (html) {
    if (typeof html !== 'string' || !/<iframe\b/i.test(html)) {
        return html;
    }

    // Treat iframe contents, comments and raw-text elements as opaque. In
    // particular, an iframe in srcdoc or a script string is not another embed.
    const markup = /<!--[\s\S]*?(?:-->|$)|<!\[CDATA\[[\s\S]*?(?:\]\]>|$)|<(script|style|textarea|title|iframe)(?=[\s/>])(?:[^>"']|"[^"]*"|'[^']*')*>[\s\S]*?(?:<\/\1\s*>|$)|<\/?[a-z][\w:-]*(?:[^>"']|"[^"]*"|'[^']*')*>/gi;
    const ancestors = [];
    const changes = [];
    let match;

    while ((match = markup.exec(html))) {
        const raw = match[0];
        const tagMatch = /^<(\/?)([a-z][\w:-]*)/i.exec(raw);

        if (!tagMatch) {
            continue;
        }

        const name = tagMatch[2].toLowerCase();

        if (tagMatch[1]) {
            const index = ancestors.map(node => node.name).lastIndexOf(name);

            if (index !== -1) {
                for (const node of ancestors.slice(index)) {
                    if (node.embeds.length) {
                        const end = node.name === name ? markup.lastIndex : match.index;
                        changes.push(wrapParagraphEmbeds(html, node, match.index, end));
                    }
                }

                const node = ancestors[index];
                const optOut = node.optOutContent;

                if (
                    node.isDefaultIframeWrapper && optOut &&
                    html.slice(node.contentStart, optOut.start).trim() === '' &&
                    html.slice(optOut.end, match.index).trim() === ''
                ) {
                    changes.push({
                        start: node.start,
                        end: node.contentStart,
                        replacement: ''
                    });
                    changes.push({
                        start: match.index,
                        end: markup.lastIndex,
                        replacement: ''
                    });

                    if (index > 0) {
                        ancestors[index - 1].optOutContent = {
                            start: node.start,
                            end: markup.lastIndex
                        };
                    }
                }

                ancestors.length = index;
            }

            continue;
        }

        // HTML allows omitted paragraph end tags before another block.
        if (/^(address|article|aside|blockquote|details|div|dl|fieldset|figcaption|figure|footer|form|h[1-6]|header|hgroup|hr|main|menu|nav|ol|p|pre|section|table|ul)$/.test(name)) {
            const paragraphIndex = ancestors.map(node => node.name).lastIndexOf('p');

            if (paragraphIndex !== -1) {
                const paragraph = ancestors[paragraphIndex];

                if (paragraph.embeds.length) {
                    changes.push(wrapParagraphEmbeds(html, paragraph, match.index, match.index));
                }

                ancestors.length = paragraphIndex;
            }
        }

        const openingTag = /^<(?:[^>"']|"[^"]*"|'[^']*')*>/.exec(raw)[0];
        const attributes = getAttributes(openingTag);

        if (name === 'iframe') {
            const wrapped = ancestors.some(node => node.classes.includes('post__iframe') || node.classes.includes('post__video'));

            if (!/<\/iframe\s*>$/i.test(raw)) {
                continue;
            }

            if (attributes['data-responsive'] === 'false') {
                const parent = ancestors[ancestors.length - 1];

                if (parent) {
                    parent.optOutContent = {
                        start: match.index,
                        end: markup.lastIndex
                    };
                }

                continue;
            }

            if (wrapped) {
                continue;
            }

            const paragraphIndex = ancestors.map(node => node.name).lastIndexOf('p');
            const change = {
                start: match.index,
                end: markup.lastIndex,
                replacement: '<div class="post__iframe">' + raw + '</div>'
            };

            if (paragraphIndex !== -1) {
                const inlineAncestors = ancestors.slice(paragraphIndex + 1);
                change.closeInline = inlineAncestors.slice().reverse().map(node => '</' + node.name + '>').join('');
                change.openInline = inlineAncestors.map(node => removeId(node.openingTag)).join('');
                ancestors[paragraphIndex].embeds.push(change);
            } else {
                changes.push(change);
            }

            continue;
        }

        if (match[1] || voidElements.has(name) || /\/\s*>$/.test(raw)) {
            continue;
        }

        ancestors.push({
            name,
            classes: (attributes.class || '').split(/\s+/),
            start: match.index,
            contentStart: markup.lastIndex,
            openingTag,
            isDefaultIframeWrapper: name === 'div' &&
                (attributes.class || '').trim() === 'post__iframe' &&
                Object.keys(attributes).length === 1,
            embeds: []
        });
    }

    for (const node of ancestors) {
        if (node.embeds.length) {
            changes.push(wrapParagraphEmbeds(html, node, html.length, html.length));
        }
    }

    changes.sort((left, right) => left.start - right.start);

    for (let index = changes.length - 1; index >= 0; index--) {
        const change = changes[index];
        html = html.slice(0, change.start) + change.replacement + html.slice(change.end);
    }

    return html;
}

function wrapParagraphEmbeds (html, paragraph, closingStart, end) {
    const parts = [];
    let start = paragraph.contentStart;
    let openingTag = paragraph.openingTag;
    let hasText = false;
    let inlinePrefix = '';

    function appendText (text) {
        if (text.trim() === '') {
            parts.push(text);
            return;
        }

        hasText = true;
        parts.push(openingTag + text + '</p>');
        // Preserve formatting on split paragraphs without duplicating an id.
        openingTag = removeId(openingTag);
    }

    for (const embed of paragraph.embeds) {
        appendText(inlinePrefix + html.slice(start, embed.start) + embed.closeInline);
        parts.push(embed.replacement);
        start = embed.end;
        inlinePrefix = embed.openInline;
    }

    appendText(inlinePrefix + html.slice(start, closingStart));
    let replacement = parts.join('');

    // If the paragraph contained only embeds, retain any custom attributes on
    // a neutral container instead of discarding an anchor or layout class.
    if (!hasText && !/^<p\s*>$/i.test(openingTag)) {
        replacement = openingTag.replace(/^<p\b/i, '<div') + replacement + '</div>';
    }

    return {
        start: paragraph.start,
        end,
        replacement
    };
}

function removeId (tag) {
    return tag.replace(/\s+id\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/i, '');
}

module.exports = wrapIframes;
