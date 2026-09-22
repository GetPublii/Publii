const { parseFragment } = require('parse5');
const { transformStyleAttribute } = require('lightningcss');
const { contentStructure, isProtected } = require('./wordpress-html-cleaner');

const COVER_PRESENTATION = /^(?:min-height|height|width|aspect-ratio|background-color|color|opacity|filter|object-fit|object-position|margin(?:-(?:top|right|bottom|left))?|padding(?:-(?:top|right|bottom|left))?)$/;
const IMAGE_LAYOUTS = new Set(['alignwide', 'alignfull', 'alignleft', 'alignright', 'aligncenter']);
const BACKGROUND_PRESENTATION = new Set([
    'background-image', 'background-position', 'background-position-x', 'background-position-y',
    'background-size', 'background-repeat', 'background-attachment', 'width', 'height', 'min-height', 'filter'
]);

function attribute(node, name) {
    const item = node.attrs.find(item => item.name === name);
    return item ? item.value : '';
}

function classes(node) {
    return attribute(node, 'class').split(/\s+/).filter(Boolean);
}

function escapeAttribute(value) {
    return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function renderAttributes(attributes) {
    return attributes.map(item => ' ' + item.name + '="' + escapeAttribute(item.value) + '"').join('');
}

function cssProperty(declaration) {
    return declaration.property === 'unparsed'
        ? declaration.value.propertyId.property
        : declaration.property;
}

function presentationAttributes(node) {
    const attributes = node.attrs.filter(item => {
        return !['class', 'style', 'data-object-fit', 'data-object-position'].includes(item.name);
    });
    const style = attribute(node, 'style');

    if (style) {
        const cleaned = transformStyleAttribute({
            code: Buffer.from(style),
            visitor: {
                Declaration(declaration) {
                    return COVER_PRESENTATION.test(cssProperty(declaration)) ? [] : undefined;
                }
            }
        }).code.toString();

        if (cleaned.trim()) {
            attributes.push({ name: 'style', value: cleaned });
        }
    }

    return attributes;
}

function unwrap(node, body) {
    const attributes = presentationAttributes(node);
    return attributes.length ? '<div' + renderAttributes(attributes) + '>' + body + '</div>' : body;
}

function isEmpty(node) {
    return (node.childNodes || []).every(child => {
        return child.nodeName === '#text' && /^[\t\n\f\r ]*$/.test(child.value);
    });
}

function backgroundUrl(node) {
    const declarations = [];
    transformStyleAttribute({
        code: Buffer.from(attribute(node, 'style')),
        visitor: {
            Declaration(declaration) {
                declarations.push(declaration);
            }
        }
    });
    const backgrounds = declarations.filter(declaration => {
        return ['background', 'background-image', 'all'].includes(cssProperty(declaration));
    });

    // Ambiguous cascades, multiple layers and CSS variables keep their original markup.
    if (declarations.some(declaration => !BACKGROUND_PRESENTATION.has(cssProperty(declaration))) ||
        backgrounds.length !== 1 || backgrounds[0].property !== 'background-image' ||
        backgrounds[0].value.length !== 1 || backgrounds[0].value[0].type !== 'url') {
        return '';
    }

    const url = backgrounds[0].value[0].value.url;
    const resolved = new URL(url, 'https://publii.invalid/');
    return ['http:', 'https:'].includes(resolved.protocol) && url.trim() ? url : '';
}

function isOverlay(node) {
    if (node.tagName !== 'span' || !classes(node).includes('wp-block-cover__background') ||
        !isEmpty(node) || attribute(node, 'aria-hidden') !== 'true' ||
        node.attrs.some(item => !['class', 'style', 'aria-hidden'].includes(item.name))) {
        return false;
    }

    // Preserve layers that might contain another image or a custom visual component.
    let decorative = true;
    transformStyleAttribute({
        code: Buffer.from(attribute(node, 'style')),
        visitor: {
            Declaration(declaration) {
                const images = declaration.property === 'background'
                    ? declaration.value.map(layer => layer.image)
                    : declaration.property === 'background-image' ? declaration.value : null;

                if (images ? images.some(image => !['none', 'gradient'].includes(image.type)) :
                    !['background-color', 'opacity'].includes(declaration.property)) {
                    decorative = false;
                }
            }
        }
    });
    return decorative;
}

function hasHooks(node) {
    return isProtected(node) || node.attrs.some(item => {
        return ['contenteditable', 'tabindex', 'hidden'].includes(item.name) ||
            (item.name.startsWith('data-') && !['data-object-fit', 'data-object-position'].includes(item.name));
    });
}

function convertCover(node, html) {
    const children = (node.childNodes || []).filter(child => child.tagName);
    const media = children.filter(child => classes(child).includes('wp-block-cover__image-background'));
    const contents = children.filter(child => child.tagName === 'div' && classes(child).includes('wp-block-cover__inner-container'));
    const location = node.sourceCodeLocation;

    if (media.length !== 1 || contents.length !== 1 || !location || !location.endTag ||
        !contents[0].sourceCodeLocation || !contents[0].sourceCodeLocation.endTag ||
        !['img', 'div'].includes(media[0].tagName) || children.indexOf(media[0]) > children.indexOf(contents[0])) {
        return null;
    }

    for (const child of children) {
        if (child !== media[0] && child !== contents[0] && !isOverlay(child)) {
            return null;
        }
    }

    const pending = [node];

    while (pending.length) {
        const child = pending.pop();

        if (child.tagName && (hasHooks(child) ||
            (child !== node && classes(child).includes('wp-block-cover')))) {
            return null;
        }

        pending.push(...(child.childNodes || []));
    }

    let imageAttributes;

    if (media[0].tagName === 'div') {
        if (!isEmpty(media[0]) || attribute(media[0], 'role') !== 'img') {
            return null;
        }

        const url = backgroundUrl(media[0]);

        if (!url) {
            return null;
        }

        imageAttributes = media[0].attrs.filter(item => {
            return !['class', 'style', 'role', 'data-object-fit', 'data-object-position'].includes(item.name);
        });
        imageAttributes.push({ name: 'src', value: url });
        imageAttributes.push({ name: 'alt', value: attribute(media[0], 'aria-label') });
    } else {
        if (!attribute(media[0], 'src').trim()) {
            return null;
        }

        imageAttributes = presentationAttributes(media[0]);

        if (!imageAttributes.some(item => item.name === 'alt')) {
            imageAttributes.push({ name: 'alt', value: '' });
        }
    }

    const layout = classes(node).find(name => IMAGE_LAYOUTS.has(name));

    if (layout) {
        imageAttributes.push({ name: 'class', value: layout });
    }

    let offset = location.startTag.endOffset;
    let body = '';

    for (const child of node.childNodes || []) {
        const source = child.sourceCodeLocation;

        // Refuse source ranges repaired or moved by the HTML parser.
        if (!source || source.startOffset !== offset || source.endOffset > location.endTag.startOffset) {
            return null;
        }

        if (child === media[0]) {
            body += '<img' + renderAttributes(imageAttributes) + '>';
        } else if (child === contents[0]) {
            body += unwrap(child, html.slice(source.startTag.endOffset, source.endTag.startOffset));
        } else if (!child.tagName) {
            body += html.slice(source.startOffset, source.endOffset);
        }

        offset = source.endOffset;
    }

    return offset === location.endTag.startOffset ? unwrap(node, body) : null;
}

function convertCovers(html) {
    const unchanged = () => ({ html, convertedCovers: 0 });

    if (typeof html !== 'string' || !html.includes('wp-block-cover')) {
        return unchanged();
    }

    try {
        let invalid = false;
        const options = {
            sourceCodeLocationInfo: true,
            onParseError() {
                invalid = true;
            }
        };
        const root = parseFragment(html, options);
        const scan = [...root.childNodes];

        while (scan.length) {
            const node = scan.pop();

            if (node.tagName === 'script' || node.tagName === 'style') {
                return unchanged();
            }

            scan.push(...(node.childNodes || []));
        }

        if (invalid) {
            return unchanged();
        }

        const pending = [...root.childNodes];
        const edits = [];

        while (pending.length) {
            const node = pending.pop();

            if (!node.tagName || hasHooks(node)) {
                continue;
            }

            if (node.tagName === 'div' && classes(node).includes('wp-block-cover')) {
                let replacement;

                try {
                    replacement = convertCover(node, html);
                } catch (error) {
                    // Unknown CSS or an unsupported Cover remains available for manual review.
                    continue;
                }

                if (replacement !== null) {
                    const replacementRoot = parseFragment(replacement, options);
                    const siblings = node.parentNode.childNodes;
                    siblings.splice(siblings.indexOf(node), 1, ...replacementRoot.childNodes);
                    edits.push({
                        start: node.sourceCodeLocation.startOffset,
                        end: node.sourceCodeLocation.endOffset,
                        value: replacement
                    });
                }

                continue;
            }

            pending.push(...(node.childNodes || []));
        }

        let converted = html;
        let boundary = html.length;

        for (const edit of edits.sort((first, second) => second.start - first.start)) {
            if (edit.end > boundary) {
                return unchanged();
            }

            converted = converted.slice(0, edit.start) + edit.value + converted.slice(edit.end);
            boundary = edit.start;
        }

        if (edits.length) {
            const convertedRoot = parseFragment(converted, options);

            if (invalid || contentStructure(root) !== contentStructure(convertedRoot)) {
                return unchanged();
            }
        }

        return { html: converted, convertedCovers: edits.length };
    } catch (error) {
        return unchanged();
    }
}

module.exports = { convertCovers };
