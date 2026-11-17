const { parseFragment } = require('parse5');

const videoPlayers = [
    {
        hosts: [
            'youtube.com',
            'www.youtube.com',
            'youtube-nocookie.com',
            'www.youtube-nocookie.com'
        ],
        path: /^\/embed\/[^/]+\/?$/
    },
    {
        hosts: ['player.vimeo.com'],
        path: /^\/video\/[^/]+\/?$/
    },
    {
        hosts: ['dailymotion.com', 'www.dailymotion.com'],
        path: /^\/embed\/video\/[^/]+\/?$/
    },
    {
        hosts: ['geo.dailymotion.com'],
        path: /^\/player(?:\/[^/]+)?\.html$/
    },
    {
        hosts: ['fast.wistia.net', 'fast.wistia.com'],
        path: /^\/embed\/iframe\/[^/]+\/?$/
    },
    {
        hosts: ['player.mediadelivery.net', 'iframe.mediadelivery.net'],
        path: /^\/embed\/[^/]+\/[^/]+\/?$/
    }
];

function isSupportedPlayer (source) {
    try {
        const url = new URL(source.startsWith('//') ? 'https:' + source : source);

        if (
            !['https:', 'http:'].includes(url.protocol) ||
            url.username ||
            url.password ||
            url.port
        ) {
            return false;
        }

        return videoPlayers.some(player => (
            player.hosts.includes(url.hostname) && player.path.test(url.pathname)
        ));
    } catch (error) {
        return false;
    }
}

/**
 * Add a referrer policy to supported video frames without rewriting their HTML.
 * Explicit policies and deferred consent sources remain under the author's control.
 */
function addVideoReferrerPolicy (html, enabled) {
    if (enabled !== true || typeof html !== 'string' || !/<iframe[\s/>]/i.test(html)) {
        return html;
    }

    const fragment = parseFragment(html, { sourceCodeLocationInfo: true });
    const pending = [fragment];
    const insertions = [];

    while (pending.length) {
        const node = pending.pop();

        // Template contents and iframe-like strings in scripts are not active embeds.
        if (node.childNodes) {
            pending.push(...node.childNodes);
        }

        if (
            node.tagName !== 'iframe' ||
            node.namespaceURI !== 'http://www.w3.org/1999/xhtml' ||
            !node.sourceCodeLocation?.startTag
        ) {
            continue;
        }

        if (node.attrs.some(attribute => ['referrerpolicy', 'srcdoc'].includes(attribute.name))) {
            continue;
        }

        const source = node.attrs.find(attribute => attribute.name === 'src');
        const consentSource = node.attrs.find(attribute => attribute.name === 'data-consent-src');
        const url = (source?.value || consentSource?.value || '').trim();

        if (isSupportedPlayer(url)) {
            insertions.push(node.sourceCodeLocation.startTag.startOffset + '<iframe'.length);
        }
    }

    // Source order can differ from tree order in malformed HTML (e.g. inside tables).
    insertions.sort((first, second) => second - first);

    for (const offset of insertions) {
        html = html.slice(0, offset) + ' referrerpolicy="strict-origin-when-cross-origin"' + html.slice(offset);
    }

    return html;
}

module.exports = addVideoReferrerPolicy;
