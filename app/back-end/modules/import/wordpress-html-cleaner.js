const { parseFragment } = require('parse5');
const { transform, transformStyleAttribute } = require('lightningcss');

// Keep these contracts in sync with EditorBridge, block renderers and render-html/helpers/content.
// https://getpublii.com/dev/default-publii-classes-for-using-with-css/
const CONTENT_CLASSES = new Set([
    'align-left', 'align-right', 'align-center', 'align-justify',
    'post__image', 'post__image--left', 'post__image--right', 'post__image--center',
    'post__image--wide', 'post__image--full', 'post__image--none',
    'post__video', 'post__iframe', 'post__toc',
    'gallery', 'gallery__item', 'gallery-wrapper', 'gallery-wrapper--wide', 'gallery-wrapper--full',
    'separator', 'separator--dot', 'separator--dots', 'separator--long-line',
    'msg', 'msg--highlight', 'msg--info', 'msg--success', 'msg--warning',
    'ordered-list', 'dropcap', 'blockquote', 'screen-reader-text', 'sr-only', 'visually-hidden',
    'line-numbers', 'no-line-numbers', 'line-highlight', 'command-line', 'match-braces', 'keep-markup'
]);

const PROTECTED_TAGS = new Set([
    'pre', 'code', 'samp', 'kbd', 'textarea', 'svg', 'math', 'iframe', 'video', 'audio',
    'picture', 'object', 'embed', 'form', 'input', 'button', 'select', 'template', 'noscript',
    'canvas', 'map'
]);
const TEXT_BLOCKS = new Set([
    'p', 'div', 'h1', 'h2', 'h3', 'h4',
    'h5', 'h6', 'li', 'td', 'th', 'figcaption',
    'blockquote', 'ul', 'ol', 'table'
]);
const TECHNICAL_ATTRIBUTES = new Set([
    'data-block', 'data-type', 'data-title', 'data-id', 'data-wp-id', 'data-elementor-id',
    'data-elementor-type'
]);
const PRESENTATION_ATTRIBUTES = new Set([
    'bgcolor', 'color', 'face', 'size', 'border', 'cellpadding',
    'cellspacing'
]);
const DECORATIVE_PROPERTIES = /^(?:color|background(?:-color)?|font-family|font-size|line-height|letter-spacing|word-spacing|text-shadow|box-shadow|border(?:-(?:top|right|bottom|left))?(?:-(?:color|style|width|radius))?|margin(?:-(?:top|right|bottom|left))?|padding(?:-(?:top|right|bottom|left))?)$/;

const MEDIA_TEXT_BACKGROUND_PROPERTIES = new Set([
    'background-image', 'background-position', 'background-position-x', 'background-position-y'
]);

function createStats() {
    return {
        removedClasses: 0,
        removedStyles: 0,
        removedStyleDeclarations: 0,
        removedAttributes: 0,
        semanticConversions: 0,
        preservedBlocks: 0,
        preservedStyles: 0
    };
}

function attribute(node, name) {
    const found = (node.attrs || []).find(item => item.name === name);
    return found ? found.value : '';
}

function classNames(node) {
    return attribute(node, 'class').split(/\s+/).filter(Boolean);
}

function escapeAttribute(value) {
    return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

function isProtected(node) {
    return PROTECTED_TAGS.has(node.tagName) || node.tagName.includes('-') ||
        ['button', 'tab', 'tablist', 'switch', 'slider', 'checkbox', 'menu', 'dialog'].includes(attribute(node, 'role')) ||
        classNames(node).some(name => /^(?:pec-|wp-block-embed|twitter-|instagram-|fb-|tiktok-)/.test(name)) ||
        (node.attrs || []).some(item => /^on|^data-(?:wp-interactive|wp-on|wp-bind|consent-|mce-object)/.test(item.name));
}

function getCssProperty(declaration) {
    return declaration.property === 'unparsed'
        ? declaration.value.propertyId.property
        : declaration.property;
}

function hasProtectedBackground(declarations) {
    const backgrounds = declarations.filter(declaration => {
        return ['background', 'background-color', 'background-image'].includes(getCssProperty(declaration));
    });

    if (!backgrounds.length) {
        return false;
    }

    // Preserve foreground colors with backgrounds whose appearance cannot be safely removed.
    return declarations.some(declaration => {
        return declaration.property === 'unparsed' && getCssProperty(declaration) === 'color';
    }) || backgrounds.some(declaration => {
        if (declaration.property === 'unparsed') {
            return true;
        }

        if (declaration.property === 'background') {
            return declaration.value.some(layer => layer.image.type !== 'none' || layer.clip === 'text');
        }

        if (declaration.property === 'background-image') {
            return declaration.value.some(image => image.type !== 'none');
        }

        return false;
    });
}

function hasRedundantMediaTextBackground(node, declarations) {
    const parent = node.parentNode;

    if (node.tagName !== 'figure' || !classNames(node).includes('wp-block-media-text__media') ||
        !parent || parent.tagName !== 'div' || !classNames(parent).includes('wp-block-media-text') ||
        !classNames(parent).includes('is-image-fill')) {
        return false;
    }

    const backgrounds = declarations.filter(declaration => {
        const property = declaration.property === 'custom'
            ? declaration.value.name
            : getCssProperty(declaration);

        return property.toLowerCase().startsWith('background');
    });
    const images = backgrounds.filter(declaration => getCssProperty(declaration) === 'background-image');

    if (backgrounds.some(declaration => !MEDIA_TEXT_BACKGROUND_PROPERTIES.has(getCssProperty(declaration))) ||
        images.length !== 1 || images[0].property !== 'background-image' ||
        images[0].value.length !== 1 || images[0].value[0].type !== 'url') {
        return false;
    }

    // WordPress stores the cropped image as a background and an img fallback, whose URL may already be local.
    const pending = [...(node.childNodes || [])];
    let imageCount = 0;

    while (pending.length) {
        const child = pending.pop();

        if (child.nodeName === '#comment' || (child.nodeName === '#text' && !child.value.trim())) {
            continue;
        }

        if (!['figure', 'a', 'img'].includes(child.tagName) ||
            attribute(child, 'style') || child.attrs.some(item => item.name === 'hidden')) {
            return false;
        }

        if (child.tagName === 'img') {
            if (!attribute(child, 'src').trim()) {
                return false;
            }

            imageCount++;
        }

        pending.push(...(child.childNodes || []));
    }

    return imageCount === 1;
}

function resolveAlignmentTokens(tokens, properties, seen = new Set()) {
    if (tokens.length !== 1) {
        return '';
    }

    const token = tokens[0];

    if (token.type === 'token' && token.value.type === 'ident') {
        return token.value.value.toLowerCase();
    }

    if (token.type !== 'var') {
        return '';
    }

    const name = token.value.name.ident;
    const property = properties.get(name);

    // An undefined variable may be inherited from outside this element.
    if (!property || property.property !== 'custom' || seen.has(name)) {
        return '';
    }

    seen.add(name);
    return resolveAlignmentTokens(property.value.value, properties, seen);
}

function getCssVariables(value) {
    const names = new Set();
    const pending = [value];

    while (pending.length) {
        const item = pending.pop();

        if (!item || typeof item !== 'object') {
            continue;
        }

        if (item.type === 'var') {
            names.add(item.value.name.ident);
        }

        pending.push(...Object.values(item));
    }

    return names;
}

function getUnusedAlignmentVariables(node, declarations) {
    const names = new Set();

    // Custom properties inherit, so retain them when descendants may still need them.
    if ((node.childNodes || []).some(child => child.tagName)) {
        return names;
    }

    for (const declaration of declarations) {
        if (getCssProperty(declaration) === 'text-align') {
            for (const name of getCssVariables(declaration)) {
                names.add(name);
            }
        }
    }

    for (const declaration of declarations) {
        if (getCssProperty(declaration) !== 'text-align') {
            for (const name of getCssVariables(declaration)) {
                names.delete(name);
            }
        }
    }

    return names;
}

function cleanStyle(node, alignmentOnly) {
    const original = attribute(node, 'style');
    const result = {
        value: original,
        removed: 0,
        alignment: '',
        preserveAlignment: false,
        protectSubtree: false
    };

    if (!original) {
        return result;
    }

    try {
        // CSS parsing handles comments, escapes, functions, duplicate declarations and !important.
        const sourceDeclarations = [];
        const normalized = transformStyleAttribute({
            code: Buffer.from(original),
            minify: true,
            visitor: {
                Declaration(declaration) {
                    sourceDeclarations.push(declaration);
                }
            }
        }).code;
        const redundantMediaBackground = !alignmentOnly && hasRedundantMediaTextBackground(node, sourceDeclarations);
        result.protectSubtree = !alignmentOnly && !redundantMediaBackground && hasProtectedBackground(sourceDeclarations);

        if (result.protectSubtree) {
            return result;
        }

        let declarations;
        transform({
            code: Buffer.from('x{' + normalized.toString() + '}'),
            visitor: {
                Rule: {
                    style(rule) {
                        declarations = rule.value.declarations;
                    }
                }
            }
        });
        const effective = new Map();

        for (const declaration of [...declarations.declarations, ...declarations.importantDeclarations]) {
            const property = declaration.property === 'custom'
                ? declaration.value.name
                : getCssProperty(declaration);
            effective.set(property, declaration);
        }

        const removable = new Set(redundantMediaBackground ? MEDIA_TEXT_BACKGROUND_PROPERTIES : []);

        for (const declaration of effective.values()) {
            const property = getCssProperty(declaration);

            if (!alignmentOnly && DECORATIVE_PROPERTIES.test(property)) {
                removable.add(property);
            }
        }

        const alignmentDeclaration = effective.get('text-align');
        let alignment = '';

        if (alignmentDeclaration) {
            alignment = alignmentDeclaration.property === 'text-align'
                ? alignmentDeclaration.value
                : resolveAlignmentTokens(alignmentDeclaration.value.value, effective);
        }

        const supportedAlignment = ['left', 'right', 'center', 'justify'].includes(alignment);
        result.preserveAlignment = effective.has('all') || Boolean(alignmentDeclaration && !supportedAlignment);

        if (result.preserveAlignment) {
            result.protectSubtree = !alignmentOnly && hasProtectedBackground(sourceDeclarations);
            return result;
        }

        if (TEXT_BLOCKS.has(node.tagName) && supportedAlignment) {
            result.alignment = alignment;
            removable.add('text-align');
        }

        if (!removable.size) {
            return result;
        }

        const unusedVariables = result.alignment
            ? getUnusedAlignmentVariables(node, sourceDeclarations)
            : new Set();
        const cleaned = transformStyleAttribute({
            code: Buffer.from(original),
            visitor: {
                Declaration(declaration) {
                    const property = getCssProperty(declaration);

                    if ((!alignmentOnly && DECORATIVE_PROPERTIES.test(property)) ||
                        removable.has(property) ||
                        (declaration.property === 'custom' && unusedVariables.has(declaration.value.name))) {
                        result.removed++;
                        return [];
                    }
                }
            }
        });
        result.value = cleaned.code.toString();
        return result;
    } catch (error) {
        // Unknown or malformed CSS is safer to keep than to guess at its meaning.
        return {
            value: original,
            removed: 0,
            alignment: '',
            preserveAlignment: true,
            protectSubtree: false
        };
    }
}

/**
 * Normalize presentation markup, not security-sensitive content. Source offsets let us
 * edit attributes without changing elements, text, entities, comments or protected code.
 */
function transformHtml(html, alignmentOnly) {
    const stats = createStats();
    const unchanged = reason => ({ html, stats: createStats(), skippedReason: reason });

    try {
        let invalid = false;
        const root = parseFragment(html, {
            sourceCodeLocationInfo: true,
            onParseError() {
                invalid = true;
            }
        });

        if (invalid) {
            return unchanged('invalid-html');
        }

        const nodes = [];
        const pending = [...root.childNodes];
        const locations = new Set();

        while (pending.length) {
            const node = pending.pop();

            if (node.tagName === 'script' || node.tagName === 'style') {
                // Scripts and styles can reference any class or attribute elsewhere in this item.
                return unchanged('active-content');
            }

            if (node.tagName) {
                nodes.push(node);
                const location = node.sourceCodeLocation;

                if (location && location.startTag) {
                    if (locations.has(location.startOffset)) {
                        return unchanged('invalid-html');
                    }

                    locations.add(location.startOffset);
                }
            }

            pending.push(...(node.childNodes || []));
        }

        const protectedNodes = new Set();
        const styles = new Map();

        for (const node of nodes) {
            const style = cleanStyle(node, alignmentOnly);
            styles.set(node, style);

            if (isProtected(node) || style.protectSubtree) {
                protectedNodes.add(node);

                // Retain embed layout and widget hooks as well as the media element itself.
                if (!['pre', 'code', 'samp', 'kbd'].includes(node.tagName)) {
                    for (let parent = node.parentNode; parent && parent !== root; parent = parent.parentNode) {
                        protectedNodes.add(parent);
                    }
                }
            }
        }

        const edits = [];
        const visit = [...root.childNodes];

        while (visit.length) {
            const node = visit.pop();

            if (!node.tagName) {
                continue;
            }

            if (protectedNodes.has(node)) {
                stats.preservedBlocks++;
                continue;
            }

            visit.push(...(node.childNodes || []));
            const location = node.sourceCodeLocation;

            if (!location || !location.startTag) {
                continue;
            }

            const changes = new Map();
            const originalClasses = classNames(node);
            let keptClasses = alignmentOnly ? originalClasses.slice() : originalClasses.filter(name => {
                return CONTENT_CLASSES.has(name) || /^(?:language|lang)-[a-z0-9_-]+$/i.test(name);
            });
            stats.removedClasses += originalClasses.length - keptClasses.length;
            const style = styles.get(node);
            // A table's align attribute positions the table itself, not the text in its cells.
            const legacyAlignment = node.tagName === 'table' ? '' : attribute(node, 'align').toLowerCase();
            const alignment = style.alignment ||
                (!alignmentOnly && !style.preserveAlignment && TEXT_BLOCKS.has(node.tagName) &&
                    ['left', 'right', 'center', 'justify'].includes(legacyAlignment) ? legacyAlignment : '');

            if (alignment) {
                keptClasses = keptClasses.filter(name => !/^align-(left|right|center|justify)$/.test(name));
                keptClasses.push('align-' + alignment);
                stats.semanticConversions++;

                if (!alignmentOnly && legacyAlignment) {
                    changes.set('align', null);
                    stats.removedAttributes++;
                }
            }

            if (originalClasses.join(' ') !== keptClasses.join(' ') ||
                (!alignmentOnly && node.attrs.some(item => item.name === 'class') && !originalClasses.length)) {
                changes.set('class', keptClasses.join(' ') || null);
            }

            if (style.value !== attribute(node, 'style') ||
                (!alignmentOnly && node.attrs.some(item => item.name === 'style') && !style.value)) {
                changes.set('style', style.value || null);
                stats.removedStyleDeclarations += style.removed;

                if (!style.value) {
                    stats.removedStyles++;
                }
            }

            if (style.value) {
                stats.preservedStyles++;
            }

            for (const item of node.attrs) {
                if (!alignmentOnly && (TECHNICAL_ATTRIBUTES.has(item.name) || /^data-mce-/.test(item.name) ||
                    (PRESENTATION_ATTRIBUTES.has(item.name) && node.tagName !== 'img'))) {
                    changes.set(item.name, null);
                    stats.removedAttributes++;
                }
            }

            if (!changes.size) {
                continue;
            }

            let opening = html.slice(location.startTag.startOffset, location.startTag.endOffset);
            const attributeEdits = [];

            for (const [name, value] of changes) {
                const attrLocation = location.attrs && location.attrs[name];

                if (attrLocation) {
                    let start = attrLocation.startOffset - location.startOffset;

                    while (start > 0 && /\s/.test(opening[start - 1])) {
                        start--;
                    }

                    attributeEdits.push({
                        start,
                        end: attrLocation.endOffset - location.startOffset,
                        value: value === null ? '' : ' ' + name + '="' + escapeAttribute(value) + '"'
                    });
                } else if (value !== null) {
                    const insertion = opening.search(/\/?\s*>$/);
                    attributeEdits.push({ start: insertion, end: insertion, value: ' ' + name + '="' + escapeAttribute(value) + '"' });
                }
            }

            for (const edit of attributeEdits.sort((a, b) => b.start - a.start)) {
                opening = opening.slice(0, edit.start) + edit.value + opening.slice(edit.end);
            }

            // Rewrite attributes only; retain every existing element, its content and nesting.
            edits.push({
                start: location.startTag.startOffset,
                end: location.startTag.endOffset,
                value: opening
            });
        }

        let cleaned = html;
        let boundary = html.length;

        for (const edit of edits.sort((a, b) => b.start - a.start)) {
            if (edit.end > boundary) {
                return unchanged('invalid-html');
            }

            cleaned = cleaned.slice(0, edit.start) + edit.value + cleaned.slice(edit.end);
            boundary = edit.start;
        }

        return { html: cleaned, stats, skippedReason: null };
    } catch (error) {
        return unchanged('processing-error');
    }
}

function cleanHtml(html) {
    return transformHtml(html, false);
}

function normalizeTextAlignment(html) {
    // Avoid parsing ordinary content when there is no inline style to convert.
    if (!/\bstyle\s*=/i.test(html)) {
        return html;
    }

    return transformHtml(html, true).html;
}

module.exports = {
    cleanHtml,
    createStats,
    normalizeTextAlignment
};
