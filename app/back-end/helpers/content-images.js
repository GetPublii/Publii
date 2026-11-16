/*
 * Lists the images used in the HTML of a post or page - used by the plugins API (window.app.getContentElementsDetails)
 *
 * Returns facts only, the plugin decides what is a problem. The alt is:
 *   - null - when the attribute is missing,
 *   - ''   - when it is empty: a decorative image or nobody wrote it (Publii editors insert alt="" by default).
 */

const { parseFragment } = require('parse5');

function getAttribute (node, name) {
    if (!node.attrs) {
        return null;
    }

    let attribute = node.attrs.find(item => item.name === name);
    return attribute ? attribute.value : null;
}

function hasClass (node, className) {
    let classes = getAttribute(node, 'class');
    return !!classes && classes.split(/\s+/).includes(className);
}

function getText (node) {
    if (node.nodeName === '#text') {
        return node.value;
    }

    return (node.childNodes || []).map(getText).join('');
}

function toSize (value) {
    let size = parseInt(value, 10);
    return Number.isFinite(size) && size > 0 ? size : null;
}

function findClosest (ancestors, check) {
    for (let i = ancestors.length - 1; i >= 0; i--) {
        if (check(ancestors[i])) {
            return ancestors[i];
        }
    }

    return null;
}

/*
 * Caption of the figure with the image - e.g. images with captions of the editors and gallery items
 */
function getCaption (figure) {
    if (!figure) {
        return '';
    }

    let figcaption = (figure.childNodes || []).find(child => child.tagName === 'figcaption');
    return figcaption ? getText(figcaption).replace(/\s+/g, ' ').trim() : '';
}

function describeImage (node, ancestors) {
    let link = findClosest(ancestors, ancestor => ancestor.tagName === 'a' && getAttribute(ancestor, 'href') !== null);
    let figure = findClosest(ancestors, ancestor => ancestor.tagName === 'figure');

    return {
        src: getAttribute(node, 'src') || '',
        alt: getAttribute(node, 'alt'),
        title: getAttribute(node, 'title'),
        caption: getCaption(figure),
        width: toSize(getAttribute(node, 'width')),
        height: toSize(getAttribute(node, 'height')),
        inLink: !!link,
        linkHref: link ? getAttribute(link, 'href') : null,
        role: getAttribute(node, 'role'),
        // Hidden from screen readers by the image itself or by any element around it
        ariaHidden: [node].concat(ancestors).some(element => getAttribute(element, 'aria-hidden') === 'true'),
        inGallery: ancestors.some(ancestor => hasClass(ancestor, 'gallery') || hasClass(ancestor, 'gallery__item'))
    };
}

/**
 * @param {string} html - HTML of the post or page
 *
 * @returns {Array} - [{ src, alt, title, caption, width, height, inLink, linkHref, role, ariaHidden, inGallery }] in the order of the content
 */
function extractImages (html) {
    if (typeof html !== 'string' || html.trim() === '') {
        return [];
    }

    let images = [];
    let ancestors = [];
    let walk = node => {
        if (node.tagName === 'img') {
            images.push(describeImage(node, ancestors));
        }

        let children = node.tagName === 'template' && node.content ? node.content.childNodes : node.childNodes;

        if (!children || !children.length) {
            return;
        }

        ancestors.push(node);
        children.forEach(walk);
        ancestors.pop();
    };

    walk(parseFragment(html));

    return images;
}

module.exports = {
    extractImages
};
