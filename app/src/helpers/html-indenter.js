/*
 * Lightweight HTML indenter used by the source code in post editor
 */

const indentConfig = {
    voidElements: new Set([
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
    ]),
    preservedBlocks: new Set([
        'script',
        'style',
        'pre',
        'textarea'
    ]),
    indent: '\t'
};

function indentHtml (source) {
    if (typeof source !== 'string' || source.trim() === '') {
        return source;
    }

    const eol = source.indexOf('\r\n') > -1 ? '\r\n' : '\n';
    const tokens = tokenizeHtml(source);
    const lines = [];
    let level = 0;
    let pendingBlankLine = false;
    let index = 0;

    while (index < tokens.length) {
        const token = tokens[index];

        if (token.type === 'text' && token.isWhitespace) {
            if (lines.length > 0 && countNewlines(token.raw) >= 2) {
                pendingBlankLine = true;
            }

            index++;
            continue;
        }

        let groupEnd = index;
        let groupBalance = applyBalance(token, 0);
        let groupContainsText = token.type === 'text' && !token.isWhitespace;

        while (groupEnd + 1 < tokens.length) {
            const nextToken = tokens[groupEnd + 1];
            const isGlued = isGluedBoundary(tokens[groupEnd], nextToken);
            const needsClosing = groupContainsText && groupBalance > 0;

            if (!isGlued && !needsClosing) {
                break;
            }

            groupEnd++;
            groupBalance = applyBalance(nextToken, groupBalance);

            if (nextToken.type === 'text' && !nextToken.isWhitespace) {
                groupContainsText = true;
            }
        }

        let raw = '';
        let lineLevel = level;
        let inLeadingCloses = true;

        for (let i = index; i <= groupEnd; i++) {
            const groupToken = tokens[i];
            raw += groupToken.raw;

            if (groupToken.type === 'close') {
                level = Math.max(0, level - 1);

                if (inLeadingCloses) {
                    lineLevel = level;
                }
            } else {
                inLeadingCloses = false;

                if (groupToken.type === 'open') {
                    level++;
                }
            }
        }

        if (pendingBlankLine) {
            lines.push('');
            pendingBlankLine = false;
        }

        lines.push(indentConfig.indent.repeat(lineLevel) + raw);
        index = groupEnd + 1;
    }

    if (lines.length === 0) {
        return source;
    }

    let result = lines.join(eol);

    if (/\r?\n[\t ]*$/.test(source)) {
        result += eol;
    }

    return result;
}

function applyBalance (token, balance) {
    if (token.type === 'open') {
        return balance + 1;
    }

    if (token.type === 'close') {
        return Math.max(0, balance - 1);
    }

    return balance;
}

function isGluedBoundary (leftToken, rightToken) {
    return (leftToken.type === 'text' && !leftToken.isWhitespace) ||
           (rightToken.type === 'text' && !rightToken.isWhitespace);
}

function countNewlines (text) {
    return (text.match(/\n/g) || []).length;
}

function tokenizeHtml (source) {
    const tokens = [];
    const length = source.length;
    const lowerSource = source.toLowerCase();
    let position = 0;

    while (position < length) {
        let nextPosition;

        if (source[position] === '<' && isTagLikeStart(source[position + 1])) {
            nextPosition = readMarkup(source, lowerSource, position, tokens);
        } else {
            nextPosition = readText(source, position, tokens);
        }

        if (nextPosition <= position) {
            nextPosition = position + 1;
        }

        position = nextPosition;
    }

    return tokens;
}

function isTagLikeStart (character) {
    return character === '/' || character === '!' || character === '?' || isTagNameStart(character);
}

function isTagNameStart (character) {
    return typeof character === 'string' && /[a-zA-Z]/.test(character);
}

function readMarkup (source, lowerSource, position, tokens) {
    const nextCharacter = source[position + 1];

    if (nextCharacter === '!') {
        if (source.startsWith('<!--', position)) {
            return readUntilMarker(source, position, '-->', 'comment', tokens);
        }

        if (source.startsWith('<![CDATA[', position)) {
            return readUntilMarker(source, position, ']]>', 'declaration', tokens);
        }

        return readUntilMarker(source, position, '>', 'declaration', tokens);
    }

    if (nextCharacter === '?') {
        const markerEnd = source.indexOf('?>', position + 2);

        if (markerEnd > -1) {
            tokens.push({ type: 'declaration', raw: source.slice(position, markerEnd + 2) });
            return markerEnd + 2;
        }

        return readUntilMarker(source, position, '>', 'declaration', tokens);
    }

    const tagEnd = readTag(source, position);
    const raw = source.slice(position, tagEnd);
    const tagNameMatch = raw.match(/^<\/?([a-zA-Z][^\s/>]*)/);
    const tagName = tagNameMatch ? tagNameMatch[1].toLowerCase() : '';
    const isSelfClosing = /\/\s*>$/.test(raw);

    if (raw[1] === '/') {
        tokens.push({ type: tagName ? 'close' : 'declaration', tagName, raw });
        return tagEnd;
    }

    if (tagName && indentConfig.preservedBlocks.has(tagName) && !isSelfClosing) {
        const blockEnd = findPreservedBlockEnd(source, lowerSource, tagName, tagEnd);
        tokens.push({ type: 'preserved', tagName, raw: source.slice(position, blockEnd) });
        return blockEnd;
    }

    if (isSelfClosing) {
        tokens.push({ type: 'selfclosing', tagName, raw });
    } else if (indentConfig.voidElements.has(tagName)) {
        tokens.push({ type: 'void', tagName, raw });
    } else {
        tokens.push({ type: 'open', tagName, raw });
    }

    return tagEnd;
}

function readUntilMarker (source, position, marker, type, tokens) {
    const markerStart = source.indexOf(marker, position + 2);
    const end = markerStart === -1 ? source.length : markerStart + marker.length;
    tokens.push({ type, raw: source.slice(position, end) });
    return end;
}

function readTag (source, position) {
    let insideSingleQuote = false;
    let insideDoubleQuote = false;
    let scan = position + 1;

    while (scan < source.length) {
        const character = source[scan];

        if (character === '\'' && !insideDoubleQuote) {
            insideSingleQuote = !insideSingleQuote;
        } else if (character === '"' && !insideSingleQuote) {
            insideDoubleQuote = !insideDoubleQuote;
        } else if (character === '>' && !insideSingleQuote && !insideDoubleQuote) {
            return scan + 1;
        }

        scan++;
    }

    return source.length;
}

function findPreservedBlockEnd (source, lowerSource, tagName, from) {
    const closeMarker = '</' + tagName;
    let scan = from;

    while (scan < source.length) {
        const markerStart = lowerSource.indexOf(closeMarker, scan);

        if (markerStart === -1) {
            return source.length;
        }

        const characterAfterMarker = source[markerStart + closeMarker.length];

        if (
            characterAfterMarker === undefined ||
            characterAfterMarker === '>' ||
            /\s/.test(characterAfterMarker)
        ) {
            const tagCloseIndex = source.indexOf('>', markerStart);
            return tagCloseIndex === -1 ? source.length : tagCloseIndex + 1;
        }

        scan = markerStart + 1;
    }

    return source.length;
}

function readText (source, position, tokens) {
    let scan = position;

    while (scan < source.length) {
        scan = source.indexOf('<', scan);

        if (scan === -1) {
            scan = source.length;
            break;
        }

        if (isTagLikeStart(source[scan + 1])) {
            break;
        }

        scan++;
    }

    if (scan <= position) {
        scan = position + 1;
    }

    const raw = source.slice(position, scan);

    tokens.push({
        type: 'text',
        raw,
        isWhitespace: /^\s*$/.test(raw)
    });

    return scan;
}

module.exports = indentHtml;
