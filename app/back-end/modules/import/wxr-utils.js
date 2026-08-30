const crypto = require('crypto');
const path = require('path');
const { decode } = require('html-entities');
const slug = require('../../helpers/slug');

const SEO_PROVIDER_DEFINITIONS = {
    yoast: {
        title: ['_yoast_wpseo_title'],
        description: ['_yoast_wpseo_metadesc'],
        canonical: ['_yoast_wpseo_canonical'],
        robots: [
            '_yoast_wpseo_meta-robots-noindex',
            '_yoast_wpseo_meta-robots-nofollow',
            '_yoast_wpseo_meta-robots-adv',
            '_yoast_wpseo_meta-robots'
        ],
        primaryTerm: ['_yoast_wpseo_primary_category']
    },
    'rank-math': {
        title: ['rank_math_title'],
        description: ['rank_math_description'],
        canonical: ['rank_math_canonical_url'],
        robots: ['rank_math_robots', 'rank_math_advanced_robots'],
        primaryTerm: ['rank_math_primary_category']
    },
    aioseo: {
        title: ['_aioseo_title', '_aioseop_title'],
        description: ['_aioseo_description', '_aioseop_description'],
        canonical: ['_aioseop_custom_link'],
        robots: ['_aioseop_noindex', '_aioseop_nofollow', '_aioseop_noarchive'],
        primaryTerm: []
    }
};

const SEO_PROVIDERS = Object.keys(SEO_PROVIDER_DEFINITIONS);

// WordPress stores editor resources, theme data and other internal records as
// post types. They are not user-facing custom post types and must never become
// regular Publii posts.
const WORDPRESS_SYSTEM_POST_TYPES = new Set([
    'revision',
    'custom_css',
    'customize_changeset',
    'oembed_cache',
    'user_request',
    'wp_block',
    'wp_template',
    'wp_template_part',
    'wp_global_styles',
    'wp_navigation',
    'wp_font_collection',
    'wp_font_family',
    'wp_font_face'
]);

/**
 * WXR parsers represent repeated XML nodes as either an object or an array.
 * Normalising that shape in one place removes a large class of one-item import
 * failures.
 */
function asArray(value) {
    if (value === null || typeof value === 'undefined' || value === '') {
        return [];
    }

    return Array.isArray(value) ? value : [value];
}

function asString(value, fallback = '') {
    if (value === null || typeof value === 'undefined') {
        return fallback;
    }

    if (typeof value === 'object' && Object.prototype.hasOwnProperty.call(value, '#text')) {
        return asString(value['#text'], fallback);
    }

    return String(value);
}

function sanitizeTitle(value) {
    let title = asString(value);

    try {
        title = decode(title);
    } catch (e) {
        // Keep the original value if it contains a malformed HTML entity.
    }

    return title
        .replace(/<br\s*\/?>/gmi, ' ')
        .replace(/<\/(?:address|article|aside|blockquote|div|h[1-6]|header|li|p|section)>/gmi, ' ')
        .replace(/<!--[\s\S]*?-->/g, ' ')
        .replace(/<\/?[a-z][a-z0-9:-]*(?:\s[^>]*)?\s*\/?>/gmi, '')
        .replace(/\s+/g, ' ')
        .trim();
}

function escapeAttribute(value) {
    return asString(value)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function createPubliiGalleryMarkup(images, columns = 3) {
    images = asArray(images).filter(image => image && image.url);

    if (!images.length) {
        return '';
    }

    columns = Math.max(1, Math.min(8, parseInt(columns, 10) || 3));
    let items = images.map(image => {
        let source = escapeAttribute(image.url);
        let alt = escapeAttribute(image.alt || '');
        let caption = asString(image.caption);
        let captionOutput = hasVisibleCaption(caption) ? '<figcaption>' + caption + '</figcaption>' : '';

        return '<figure class="gallery__item"><a href="' + source + '" data-size="">' +
            '<img src="' + source + '" alt="' + alt + '"></a>' + captionOutput + '</figure>';
    });

    return '<div class="gallery" data-is-empty="false" data-translation="Add images" data-columns="' +
        columns + '">' + items.join('') + '</div>';
}

function normalizeVideoID(value, minimumLength = 1) {
    value = asString(value).trim();

    if (value.length < minimumLength || !/^[a-zA-Z0-9_-]+$/.test(value)) {
        return '';
    }

    return value;
}

function youtubeTimeToSeconds(value) {
    value = asString(value).trim().toLowerCase();

    if (/^\d+$/.test(value)) {
        return parseInt(value, 10);
    }

    let match = value.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/);

    if (!match || !match[0]) {
        return null;
    }

    return (parseInt(match[1], 10) || 0) * 3600 +
        (parseInt(match[2], 10) || 0) * 60 +
        (parseInt(match[3], 10) || 0);
}

function getYouTubeEmbedUrl(sourceUrl) {
    let parsed;

    try {
        parsed = new URL(decode(asString(sourceUrl).trim()));
    } catch (e) {
        return '';
    }

    let hostname = parsed.hostname.toLowerCase().replace(/^www\./, '');
    let youtubeHosts = ['youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtube-nocookie.com'];

    if (hostname !== 'youtu.be' && !youtubeHosts.includes(hostname)) {
        return '';
    }

    let pathSegments = parsed.pathname.split('/').filter(Boolean);
    let videoID = '';
    let playlistID = normalizeVideoID(parsed.searchParams.get('list'), 2);

    if (hostname === 'youtu.be') {
        videoID = normalizeVideoID(pathSegments[0], 6);
    } else if (parsed.pathname === '/watch') {
        videoID = normalizeVideoID(parsed.searchParams.get('v'), 6);
    } else if (['embed', 'shorts', 'live', 'v'].includes(pathSegments[0])) {
        if (pathSegments[0] === 'embed' && pathSegments[1] === 'videoseries') {
            playlistID = normalizeVideoID(parsed.searchParams.get('list'), 2);
        } else {
            videoID = normalizeVideoID(pathSegments[1], 6);
        }
    } else if (parsed.pathname !== '/playlist') {
        return '';
    }

    if (!videoID && !playlistID) {
        return '';
    }

    let embedUrl = videoID ?
        'https://www.youtube.com/embed/' + videoID :
        'https://www.youtube.com/embed/videoseries';
    let parameters = new URLSearchParams();

    if (videoID) {
        parameters.set('feature', 'oembed');
    }

    if (playlistID) {
        parameters.set('list', playlistID);
    }

    let startValue = parsed.searchParams.get('start') ||
        parsed.searchParams.get('t') ||
        parsed.searchParams.get('time_continue');

    if (!startValue && parsed.hash) {
        let hashParameters = new URLSearchParams(parsed.hash.replace(/^#/, ''));
        startValue = hashParameters.get('t') || hashParameters.get('start');
    }

    let start = youtubeTimeToSeconds(startValue);
    let end = youtubeTimeToSeconds(parsed.searchParams.get('end'));

    if (start !== null && start > 0) {
        parameters.set('start', start);
    }

    if (end !== null && end > 0) {
        parameters.set('end', end);
    }

    let query = parameters.toString();

    return embedUrl + (query ? '?' + query : '');
}

function getVimeoEmbedUrl(sourceUrl) {
    let parsed;

    try {
        parsed = new URL(decode(asString(sourceUrl).trim()));
    } catch (e) {
        return '';
    }

    let hostname = parsed.hostname.toLowerCase().replace(/^www\./, '');

    if (!['vimeo.com', 'player.vimeo.com'].includes(hostname)) {
        return '';
    }

    let pathSegments = parsed.pathname.split('/').filter(Boolean);
    let videoIndex = pathSegments.findIndex(segment => /^\d+$/.test(segment));

    if (videoIndex === -1) {
        return '';
    }

    let videoID = pathSegments[videoIndex];
    let privacyHash = normalizeVideoID(parsed.searchParams.get('h'));
    let followingSegment = pathSegments[videoIndex + 1];

    if (!privacyHash && followingSegment && /^[a-zA-Z0-9]+$/.test(followingSegment)) {
        privacyHash = followingSegment;
    }

    let parameters = new URLSearchParams();

    if (privacyHash) {
        parameters.set('h', privacyHash);
    }

    let embedUrl = 'https://player.vimeo.com/video/' + videoID;
    let query = parameters.toString();
    let timeFragment = /^#t=[a-zA-Z0-9]+$/.test(parsed.hash) ? parsed.hash : '';

    return embedUrl + (query ? '?' + query : '') + timeFragment;
}

function createPubliiVideoEmbed(sourceUrl, caption = '') {
    let embedUrl = getYouTubeEmbedUrl(sourceUrl);
    let provider = 'youtube';

    if (!embedUrl) {
        embedUrl = getVimeoEmbedUrl(sourceUrl);
        provider = 'vimeo';
    }

    if (!embedUrl) {
        return '';
    }

    let title = provider === 'youtube' ? 'YouTube video player' : 'Vimeo video player';
    let allow = provider === 'youtube' ?
        'accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture' :
        'autoplay; fullscreen; picture-in-picture';
    let captionOutput = hasVisibleCaption(caption) ? '<figcaption>' + caption + '</figcaption>' : '';

    return '<figure class="post__video"><iframe width="560" height="315" src="' +
        escapeAttribute(embedUrl) + '" title="' + title + '" frameborder="0" allow="' + allow +
        '" allowfullscreen="allowfullscreen"></iframe>' + captionOutput + '</figure>';
}

function getVideoShortcodeSource(provider, attributes = '', body = '') {
    let value = asString(attributes) + ' ' + asString(body);

    try {
        value = decode(value);
    } catch (e) {
        // Keep the original shortcode value if it contains a malformed entity.
    }

    value = value.trim();
    let urlMatch = value.match(/https?:\/\/[^\s"'<>]+/i);

    if (urlMatch) {
        let sourceUrl = urlMatch[0];
        let validEmbedUrl = provider === 'youtube' ?
            getYouTubeEmbedUrl(sourceUrl) :
            getVimeoEmbedUrl(sourceUrl);

        return validEmbedUrl ? sourceUrl : '';
    }

    let namedID = value.match(/(?:^|\s)(?:id|video|video_id)\s*=\s*(?:(["'])(.*?)\1|([^\s]+))/i);
    let shortcodeValue = namedID ? (namedID[2] || namedID[3] || '') : '';

    if (!shortcodeValue) {
        let unassignedValue = value.replace(/^\s*=\s*/, '').trim();
        let firstValue = unassignedValue.match(/^(?:(["'])(.*?)\1|([^\s]+))/);
        shortcodeValue = firstValue ? (firstValue[2] || firstValue[3] || '') : '';
    }

    if (provider === 'youtube') {
        let videoID = normalizeVideoID(shortcodeValue, 6);
        return videoID ? 'https://www.youtube.com/watch?v=' + videoID : '';
    }

    return /^\d+$/.test(shortcodeValue) ? 'https://vimeo.com/' + shortcodeValue : '';
}

function replaceWordPressVideoShortcodes(html) {
    let protectedBlocks = [];

    html = html.replace(/<(pre|code)\b[^>]*>[\s\S]*?<\/\1>/gmi, match => {
        let marker = '\u0000PUBLIIVIDEOSHORTCODE' + protectedBlocks.length + '\u0000';
        protectedBlocks.push(match);
        return marker;
    });

    html = html.replace(
        /\[(youtube|vimeo)\b([^\]]*)\]([\s\S]*?)\[\/\1\]/gmi,
        (match, provider, attributes, body, offset, source) => {
            if (source[offset - 1] === '[' || source[offset + match.length] === ']') {
                return match;
            }

            let sourceUrl = getVideoShortcodeSource(provider.toLowerCase(), attributes, body);
            return sourceUrl ? createPubliiVideoEmbed(sourceUrl) : match;
        }
    );

    html = html.replace(/\[(youtube|vimeo)\b([^\]]*)\]/gmi,
        (match, provider, attributes, offset, source) => {
            if (source[offset - 1] === '[' || source[offset + match.length] === ']') {
                return match;
            }

            let sourceUrl = getVideoShortcodeSource(provider.toLowerCase(), attributes);
            return sourceUrl ? createPubliiVideoEmbed(sourceUrl) : match;
        }
    );

    html = html.replace(
        /<!--\s*wp:shortcode\b[^>]*-->\s*(<figure\b(?=[^>]*\bclass\s*=\s*(?:"[^"]*\bpost__video\b[^"]*"|'[^']*\bpost__video\b[^']*'))[^>]*>[\s\S]*?<\/figure>)\s*<!--\s*\/wp:shortcode\s*-->/gmi,
        '$1'
    );

    return html.replace(/\u0000PUBLIIVIDEOSHORTCODE(\d+)\u0000/g, (match, index) => {
        return protectedBlocks[parseInt(index, 10)] || match;
    });
}

function replaceStandaloneVideoEmbeds(html) {
    if (typeof html !== 'string' ||
        !/(?:youtu\.be|youtube(?:-nocookie)?\.com|vimeo\.com|\[(?:youtube|vimeo)\b)/i.test(html)) {
        return html;
    }

    html = replaceWordPressVideoShortcodes(html);

    let embedFigure = /(?:<!--\s*wp:(?:core-embed\/(?:youtube|vimeo)|embed)\b[\s\S]*?-->\s*)?<figure\b(?=[^>]*\bclass\s*=\s*(?:"[^"]*\bwp-block-embed(?:-youtube|-vimeo)?\b[^"]*"|'[^']*\bwp-block-embed(?:-youtube|-vimeo)?\b[^']*'))[^>]*>([\s\S]*?)<\/figure>(?:\s*<!--\s*\/wp:(?:core-embed\/(?:youtube|vimeo)|embed)\s*-->)?/gmi;

    html = html.replace(embedFigure, (match, body) => {
        if (/<iframe\b/i.test(body)) {
            return match;
        }

        let wrapper = body.match(/<div\b(?=[^>]*\bclass\s*=\s*(?:"[^"]*\bwp-block-embed__wrapper\b[^"]*"|'[^']*\bwp-block-embed__wrapper\b[^']*'))[^>]*>([\s\S]*?)<\/div>/i);
        let wrapperContent = wrapper ? wrapper[1] : body;
        let sourceUrl = decode(wrapperContent.replace(/<[^>]*>/g, '').trim());
        let captionMatch = body.match(/<figcaption\b[^>]*>([\s\S]*?)<\/figcaption>/i);
        let caption = captionMatch ? captionMatch[1] : '';
        let embed = createPubliiVideoEmbed(sourceUrl, caption);

        return embed || match;
    });

    html = html.replace(/\[embed(?:\s+[^\]]*)?\]\s*([^\s<>]+)\s*\[\/embed\]/gmi, (match, sourceUrl) => {
        return createPubliiVideoEmbed(sourceUrl) || match;
    });

    let protectedBlocks = [];
    html = html.replace(/<(a|iframe|script|style|pre|code)\b[^>]*>[\s\S]*?<\/\1>/gmi, match => {
        let marker = '\u0000PUBLIIVIDEO' + protectedBlocks.length + '\u0000';
        protectedBlocks.push(match);
        return marker;
    });

    html = html.replace(/<(p|div)\b[^>]*>\s*([^\s<>]+)\s*<\/\1>/gmi, (match, tag, sourceUrl) => {
        return createPubliiVideoEmbed(sourceUrl) || match;
    });

    html = html.replace(/(^|[\r\n])([ \t]*)(https?:\/\/[^\s<>]+)([ \t]*)(?=$|[\r\n])/gmi,
        (match, lineStart, indentation, sourceUrl) => {
            let embed = createPubliiVideoEmbed(sourceUrl);
            return embed ? lineStart + indentation + embed : match;
        }
    );

    return html.replace(/\u0000PUBLIIVIDEO(\d+)\u0000/g, (match, index) => {
        return protectedBlocks[parseInt(index, 10)] || match;
    });
}

function getLastUrlSegment(item) {
    let itemUrl = asString(item && item.link).trim();

    if (!itemUrl) {
        return '';
    }

    try {
        let parsedUrl = new URL(itemUrl, 'https://publii-import.invalid/');
        let segments = parsedUrl.pathname.split('/').filter(Boolean);
        let lastSegment = segments.length ? segments[segments.length - 1] : '';

        try {
            return decodeURIComponent(lastSegment);
        } catch (e) {
            return lastSegment;
        }
    } catch (e) {
        return '';
    }
}

function createItemSlug(item, strategy = 'wordpress') {
    let sourceSlug = asString(item && item['wp:post_name']).trim();
    let title = sanitizeTitle(item && item.title).replace(/[<>]/g, ' ').replace(/\s+/g, ' ').trim();
    let lastUrlSegment = getLastUrlSegment(item);

    try {
        sourceSlug = decodeURIComponent(sourceSlug);
    } catch (e) {
        // Preserve malformed legacy slugs instead of aborting the import.
    }

    if (strategy === 'title') {
        return slug(title || sourceSlug || lastUrlSegment);
    }

    return slug(sourceSlug || lastUrlSegment || title);
}

function isWordPressSystemPostType(postType) {
    return WORDPRESS_SYSTEM_POST_TYPES.has(asString(postType).trim().toLowerCase());
}

function createPubliiStatus(item, isPage = false) {
    let sourceStatus = asString(item && item['wp:status']).toLowerCase();
    let status = sourceStatus === 'publish' ? ['published'] : ['draft'];

    if (sourceStatus === 'trash') {
        status.push('trashed');
    }

    if (!isPage && status[0] === 'published' && asString(item && item['wp:is_sticky']) === '1') {
        status.push('featured');
    }

    if (isPage) {
        status.push('is-page');
    }

    return status.join(',');
}

function getPostMeta(item) {
    let result = {};

    for (let meta of asArray(item && item['wp:postmeta'])) {
        let key = asString(meta && meta['wp:meta_key']);

        if (key) {
            result[key] = asString(meta['wp:meta_value']);
        }
    }

    return result;
}

function getPostMetaValues(item, expectedKey) {
    return asArray(item && item['wp:postmeta'])
        .filter(meta => asString(meta && meta['wp:meta_key']) === expectedKey)
        .map(meta => asString(meta && meta['wp:meta_value']).trim())
        .filter(Boolean);
}

function getFirstMetaValue(meta, keys) {
    for (let key of keys) {
        if (Object.prototype.hasOwnProperty.call(meta, key)) {
            let value = asString(meta[key]).trim();

            if (value !== '') {
                return value;
            }
        }
    }

    return '';
}

function getSeoProviderMetaKeys(provider) {
    let definition = SEO_PROVIDER_DEFINITIONS[provider];

    if (!definition) {
        return [];
    }

    return [...new Set(Object.values(definition).flat())];
}

function itemHasSeoProviderData(item, provider) {
    let meta = getPostMeta(item);

    return getSeoProviderMetaKeys(provider).some(key => Object.prototype.hasOwnProperty.call(meta, key));
}

function getSeoProviderStats(items) {
    let providers = {};

    for (let provider of SEO_PROVIDERS) {
        providers[provider] = {
            items: 0,
            title: 0,
            description: 0,
            canonical: 0,
            robots: 0,
            primaryTerm: 0,
            values: 0
        };
    }

    for (let item of asArray(items)) {
        let postType = asString(item && item['wp:post_type']);

        if (!item || ['attachment', 'nav_menu_item'].includes(postType)) {
            continue;
        }

        let meta = getPostMeta(item);

        for (let provider of SEO_PROVIDERS) {
            let definition = SEO_PROVIDER_DEFINITIONS[provider];

            if (!getSeoProviderMetaKeys(provider).some(key => Object.prototype.hasOwnProperty.call(meta, key))) {
                continue;
            }

            providers[provider].items += 1;

            for (let field of ['title', 'description', 'canonical', 'robots', 'primaryTerm']) {
                if (getFirstMetaValue(meta, definition[field])) {
                    providers[provider][field] += 1;
                    providers[provider].values += 1;
                }
            }
        }
    }

    let detected = SEO_PROVIDERS.filter(provider => providers[provider].items > 0);
    let ranked = detected.slice().sort((providerA, providerB) => {
        return providers[providerB].items - providers[providerA].items ||
            providers[providerB].values - providers[providerA].values ||
            SEO_PROVIDERS.indexOf(providerA) - SEO_PROVIDERS.indexOf(providerB);
    });

    return {
        providers,
        detected,
        recommended: ranked[0] || '',
        ambiguous: detected.length > 1
    };
}

function resolveSeoProvider(items, requestedProvider = 'auto') {
    let stats = getSeoProviderStats(items);

    if (requestedProvider === 'none') {
        return { provider: 'none', stats };
    }

    if (SEO_PROVIDERS.includes(requestedProvider)) {
        return { provider: requestedProvider, stats };
    }

    return {
        provider: stats.recommended || 'none',
        stats
    };
}

function parseSerializedValues(value) {
    value = asString(value).trim();

    if (!value) {
        return [];
    }

    try {
        let parsed = JSON.parse(value);

        if (Array.isArray(parsed)) {
            return parsed.map(asString).map(item => item.trim()).filter(Boolean);
        }

        if (parsed && typeof parsed === 'object') {
            return Object.entries(parsed)
                .filter(entry => entry[1] === true || entry[1] === 1 || entry[1] === '1' || entry[1] === entry[0])
                .map(entry => entry[0]);
        }
    } catch (e) {
        // WordPress usually stores arrays as PHP serialized strings.
    }

    let serializedValues = [];
    let serializedValueRegexp = /s:\d+:"([^"]*)";/g;
    let serializedValue;

    while ((serializedValue = serializedValueRegexp.exec(value)) !== null) {
        serializedValues.push(serializedValue[1]);
    }

    if (serializedValues.length) {
        return serializedValues;
    }

    return value.split(/[\s,]+/).map(item => item.trim()).filter(Boolean);
}

function normalizeSeoTemplate(value, provider, itemType = 'post') {
    value = sanitizeTitle(value);

    if (!value) {
        return { value: '', unsupportedVariables: [] };
    }

    let unsupportedVariables = new Set();
    let variableMap = {
        title: itemType === 'page' ? '%pagetitle' : '%posttitle',
        post_title: itemType === 'page' ? '%pagetitle' : '%posttitle',
        sitename: '%sitename',
        site_title: '%sitename',
        name: '%authorname',
        author_name: '%authorname',
        sep: '-',
        separator_sa: '-'
    };
    let replaceVariable = (match, variable) => {
        variable = variable.toLowerCase();

        if (!Object.prototype.hasOwnProperty.call(variableMap, variable)) {
            unsupportedVariables.add(variable);
            return match;
        }

        return variableMap[variable];
    };

    if (provider === 'yoast') {
        value = value.replace(/%%([a-zA-Z0-9_:-]+)%%/g, replaceVariable);
    } else if (provider === 'rank-math') {
        value = value.replace(/%([a-zA-Z0-9_:-]+)%/g, replaceVariable);
    } else if (provider === 'aioseo') {
        value = value.replace(/#(post_title|site_title|author_name|separator_sa)\b/g, replaceVariable);

        for (let match of value.matchAll(/#((?:post|site|author|separator|taxonomy|custom_field|current|permalink)_[a-zA-Z0-9_]*)\b/g)) {
            unsupportedVariables.add(match[1].toLowerCase());
        }
    }

    if (unsupportedVariables.size) {
        return {
            value: '',
            unsupportedVariables: [...unsupportedVariables]
        };
    }

    return {
        value: value.replace(/\s+/g, ' ').trim(),
        unsupportedVariables: []
    };
}

function normalizeRobotsDirectives(directives) {
    let normalized = new Set();

    for (let directive of directives) {
        directive = asString(directive).trim().toLowerCase();

        if (directive === 'none') {
            normalized.add('noindex');
            normalized.add('nofollow');
        } else if (directive && directive !== 'all') {
            normalized.add(directive);
        }
    }

    let supported = new Set(['index', 'noindex', 'follow', 'nofollow', 'noarchive']);
    let unsupported = [...normalized].filter(directive => !supported.has(directive));
    let index = normalized.has('noindex') ? 'noindex' : 'index';
    let follow = normalized.has('nofollow') ? 'nofollow' : 'follow';
    let explicitlyConfigured = normalized.size > unsupported.length;
    let output = '';

    if (explicitlyConfigured) {
        output = index + ', ' + follow + (normalized.has('noarchive') ? ', noarchive' : '');
    }

    return { value: output, unsupported };
}

function getSeoRobotsData(meta, provider) {
    let directives = [];

    if (provider === 'yoast') {
        let noindex = asString(meta['_yoast_wpseo_meta-robots-noindex']).trim();
        let nofollow = asString(meta['_yoast_wpseo_meta-robots-nofollow']).trim();

        if (noindex === '1') {
            directives.push('noindex');
        } else if (noindex === '2') {
            directives.push('index');
        }

        if (nofollow === '1') {
            directives.push('nofollow');
        }

        directives.push(...parseSerializedValues(meta['_yoast_wpseo_meta-robots-adv']));
        directives.push(...parseSerializedValues(meta['_yoast_wpseo_meta-robots']));
    } else if (provider === 'rank-math') {
        directives.push(...parseSerializedValues(meta.rank_math_robots));
        directives.push(...parseSerializedValues(meta.rank_math_advanced_robots));
    } else if (provider === 'aioseo') {
        let isEnabled = value => ['1', 'on', 'true', 'yes'].includes(asString(value).trim().toLowerCase());

        if (isEnabled(meta._aioseop_noindex)) {
            directives.push('noindex');
        }

        if (isEnabled(meta._aioseop_nofollow)) {
            directives.push('nofollow');
        }

        if (isEnabled(meta._aioseop_noarchive)) {
            directives.push('noarchive');
        }
    }

    return normalizeRobotsDirectives(directives);
}

function getSeoData(item, provider = 'auto', itemType = 'post') {
    if (provider === 'auto') {
        provider = resolveSeoProvider([item], provider).provider;
    }

    if (!SEO_PROVIDER_DEFINITIONS[provider]) {
        return {
            provider: 'none',
            metaTitle: '',
            metaDesc: '',
            metaRobots: '',
            canonicalUrl: '',
            primaryTermID: '',
            issues: []
        };
    }

    let meta = getPostMeta(item);
    let definition = SEO_PROVIDER_DEFINITIONS[provider];
    let title = normalizeSeoTemplate(getFirstMetaValue(meta, definition.title), provider, itemType);
    let description = normalizeSeoTemplate(getFirstMetaValue(meta, definition.description), provider, itemType);
    let robots = getSeoRobotsData(meta, provider);
    let issues = [];

    if (title.unsupportedVariables.length) {
        issues.push({
            field: 'title',
            reason: 'unsupported-template-variables',
            value: title.unsupportedVariables.join(', ')
        });
    }

    if (description.unsupportedVariables.length) {
        issues.push({
            field: 'description',
            reason: 'unsupported-template-variables',
            value: description.unsupportedVariables.join(', ')
        });
    }

    if (robots.unsupported.length) {
        issues.push({
            field: 'robots',
            reason: 'unsupported-robots-directives',
            value: robots.unsupported.join(', ')
        });
    }

    return {
        provider,
        metaTitle: title.value,
        metaDesc: description.value,
        metaRobots: robots.value,
        canonicalUrl: getFirstMetaValue(meta, definition.canonical),
        primaryTermID: getFirstMetaValue(meta, definition.primaryTerm),
        issues
    };
}

function getImageReferences(html) {
    if (typeof html !== 'string' || html === '') {
        return [];
    }

    let galleryRanges = [];
    let galleryItemRegexp = /<figure\b(?=[^>]*\bclass\s*=\s*(?:"[^"]*\bgallery__item\b[^"]*"|'[^']*\bgallery__item\b[^']*'))[^>]*>[\s\S]*?<\/figure>/gmi;
    let galleryMatch;

    while ((galleryMatch = galleryItemRegexp.exec(html)) !== null) {
        galleryRanges.push({
            start: galleryMatch.index,
            end: galleryItemRegexp.lastIndex
        });
    }

    let references = [];
    let imageRegexp = /<img\b[^>]*?>/gmi;
    let imageMatch;

    while ((imageMatch = imageRegexp.exec(html)) !== null) {
        let attributeRegexp = /(?:^|\s)(?:src|data-src|data-lazy-src|data-original)\s*=\s*(?:(["'])(.*?)\1|([^\s>]+))/gmi;
        let attributeMatch;
        let isGalleryImage = galleryRanges.some(range => {
            return imageMatch.index >= range.start && imageMatch.index < range.end;
        });

        while ((attributeMatch = attributeRegexp.exec(imageMatch[0])) !== null) {
            let imageUrl = (attributeMatch[2] || attributeMatch[3] || '').trim();

            if (imageUrl && !imageUrl.startsWith('data:')) {
                references.push({
                    url: imageUrl,
                    gallery: isGalleryImage
                });
            }
        }
    }

    let uniqueReferences = new Map();

    for (let reference of references) {
        let key = (reference.gallery ? 'gallery|' : 'content|') + reference.url;

        if (!uniqueReferences.has(key)) {
            uniqueReferences.set(key, reference);
        }
    }

    return [...uniqueReferences.values()];
}

function getImageUrls(html) {
    return [...new Set(getImageReferences(html).map(reference => reference.url))];
}

function resolveRemoteUrl(sourceUrl, baseUrl = '') {
    try {
        sourceUrl = asString(sourceUrl).replace(/&amp;/g, '&').trim();

        if (!sourceUrl) {
            return '';
        }

        let resolved = new URL(sourceUrl, baseUrl || undefined);

        if (!['http:', 'https:'].includes(resolved.protocol)) {
            return '';
        }

        return resolved.toString();
    } catch (e) {
        return '';
    }
}

function imageDownloadUrlVariants(sourceUrl) {
    let resolvedUrl = resolveRemoteUrl(sourceUrl);

    if (!resolvedUrl) {
        return [];
    }

    let variants = new Set([resolvedUrl]);
    let parsedUrl = new URL(resolvedUrl);

    if (parsedUrl.protocol === 'http:') {
        let secureUrl = new URL(parsedUrl.toString());
        secureUrl.protocol = 'https:';
        variants.add(secureUrl.toString());
    }

    if (parsedUrl.search) {
        let urlWithoutQuery = new URL(parsedUrl.toString());
        urlWithoutQuery.search = '';
        variants.add(urlWithoutQuery.toString());

        if (urlWithoutQuery.protocol === 'http:') {
            urlWithoutQuery.protocol = 'https:';
            variants.add(urlWithoutQuery.toString());
        }
    }

    return [...variants];
}

function getDownloadErrorReason(error) {
    let message = asString(error && error.message ? error.message : error).replace(/\s+/g, ' ').trim();
    let httpStatus = message.match(/Status Code:\s*(\d{3})/i);

    if (httpStatus) {
        return 'HTTP ' + httpStatus[1];
    }

    if (error && error.code) {
        return asString(error.code);
    }

    return message || 'Unknown error';
}

function createMediaFilename(sourceUrl, usedFilenames = new Set()) {
    let parsedUrl;

    try {
        parsedUrl = new URL(sourceUrl);
    } catch (e) {
        parsedUrl = null;
    }

    let originalFilename = parsedUrl ? path.basename(parsedUrl.pathname) : path.basename(sourceUrl);

    try {
        originalFilename = decodeURIComponent(originalFilename);
    } catch (e) {
        // Keep the original name when it contains malformed percent encoding.
    }

    let filename = slug(originalFilename, false, true);

    if (!filename || filename === '.' || filename === '..') {
        filename = 'imported-image-' + crypto.createHash('sha1').update(sourceUrl).digest('hex').slice(0, 10);
    }

    if (!usedFilenames.has(filename)) {
        usedFilenames.add(filename);
        return filename;
    }

    let extension = path.extname(filename);
    let basename = extension ? filename.slice(0, -extension.length) : filename;
    let hash = crypto.createHash('sha1').update(sourceUrl).digest('hex').slice(0, 8);
    let uniqueFilename = basename + '-' + hash + extension;
    let suffix = 2;

    while (usedFilenames.has(uniqueFilename)) {
        uniqueFilename = basename + '-' + hash + '-' + suffix++ + extension;
    }

    usedFilenames.add(uniqueFilename);
    return uniqueFilename;
}

function replaceUrl(text, sourceUrl, replacementUrl) {
    if (typeof text !== 'string' || !sourceUrl || !replacementUrl) {
        return text;
    }

    return text.split(sourceUrl).join(replacementUrl);
}

function replaceContentImageUrls(text, sourceUrls, replacementUrl) {
    if (typeof text !== 'string' || !replacementUrl) {
        return text;
    }

    let galleries = [];
    let protectedText = text.replace(
        /<div\b(?=[^>]*\bclass\s*=\s*(?:"[^"]*\bgallery\b[^"]*"|'[^']*\bgallery\b[^']*'))[^>]*>[\s\S]*?<\/div>/gmi,
        gallery => {
            let marker = '<!--PUBLIIGALLERYURLS:' + galleries.length + '-->';
            galleries.push(gallery);
            return marker;
        }
    );

    protectedText = protectedText.replace(/<img\b[^>]*?>/gmi, imageTag => {
        for (let attributeName of ['src', 'data-src', 'data-lazy-src', 'data-original']) {
            let imageUrl = getAttributeValue(imageTag, attributeName);

            if (imageUrl && imageUrlMatchesSource(imageUrl, sourceUrls)) {
                imageTag = setAttributeValue(imageTag, attributeName, replacementUrl);
            }
        }

        return imageTag;
    });

    return protectedText.replace(/<!--PUBLIIGALLERYURLS:(\d+)-->/g, (marker, index) => {
        return galleries[Number(index)] || marker;
    });
}

function getComparableImageUrl(sourceUrl) {
    try {
        let parsedUrl = new URL(asString(sourceUrl).replace(/&amp;/g, '&').trim());

        if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
            return '';
        }

        return parsedUrl.host.toLowerCase() + parsedUrl.pathname;
    } catch (e) {
        return '';
    }
}

/**
 * Removes a redundant self-link only when it wraps the image that has just been
 * imported and both URLs identify the same remote image. WordPress commonly
 * adds resize query parameters to img[src] but omits them in a[href]. Links to
 * pages and other external resources are preserved.
 */
function removeSelfLinkedImageAnchor(text, sourceUrls, localUrl) {
    if (typeof text !== 'string' || !localUrl) {
        return text;
    }

    let comparableUrls = new Set(
        asArray(sourceUrls)
            .map(getComparableImageUrl)
            .filter(Boolean)
    );

    if (!comparableUrls.size) {
        return text;
    }

    return text.replace(/<a\b[^>]*>[\s\S]*?<\/a>/gmi, anchor => {
        if (!anchor.includes(localUrl) || !/<img\b/i.test(anchor)) {
            return anchor;
        }

        let openingTag = anchor.match(/^<a\b[^>]*>/i);
        let href = openingTag ? getAttributeValue(openingTag[0], 'href') : '';

        let linksToImportedImage = href === localUrl || comparableUrls.has(getComparableImageUrl(href));

        if (!href || !linksToImportedImage) {
            return anchor;
        }

        return anchor.slice(openingTag[0].length, -4);
    });
}

function replaceInternalUrl(text, sourceUrl, replacementUrl) {
    if (typeof text !== 'string' || !sourceUrl || !replacementUrl) {
        return text;
    }

    let escapedUrl = sourceUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    let boundaryRegexp = new RegExp('(^|[\\s"\\\'=\\(])' + escapedUrl + '(?=$|[\\s"\\\'#?<>\\)])', 'gm');

    return text.replace(boundaryRegexp, (match, prefix) => prefix + replacementUrl);
}

const IMAGE_LAYOUT_CLASSES = {
    alignleft: 'post__image--left',
    alignright: 'post__image--right',
    aligncenter: 'post__image--center',
    alignwide: 'post__image--wide',
    alignfull: 'post__image--full',
    'post__image--left': 'post__image--left',
    'post__image--right': 'post__image--right',
    'post__image--center': 'post__image--center',
    'post__image--wide': 'post__image--wide',
    'post__image--full': 'post__image--full'
};

function getClassNames(tag) {
    if (typeof tag !== 'string') {
        return [];
    }

    let classAttribute = tag.match(/\sclass\s*=\s*(?:(["'])(.*?)\1|([^\s>]+))/i);
    let value = classAttribute ? (classAttribute[2] || classAttribute[3] || '') : '';

    return value.split(/\s+/).filter(Boolean);
}

function setClassNames(tag, classNames) {
    let uniqueClassNames = [...new Set(classNames.filter(Boolean))];
    let classAttributeRegexp = /\sclass\s*=\s*(?:(["'])(.*?)\1|([^\s>]+))/i;

    if (classAttributeRegexp.test(tag)) {
        return tag.replace(
            classAttributeRegexp,
            uniqueClassNames.length ? ' class="' + uniqueClassNames.join(' ') + '"' : ''
        );
    }

    let closing = tag.endsWith('/>') ? '/>' : '>';
    let tagStart = tag.slice(0, -closing.length).trimEnd();

    if (!uniqueClassNames.length) {
        return tagStart + closing;
    }

    return tagStart + ' class="' + uniqueClassNames.join(' ') + '"' + closing;
}

function setAttributeValue(tag, attributeName, value) {
    let escapedName = attributeName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    let attributeRegexp = new RegExp('\\s' + escapedName + '\\s*=\\s*(?:(["\\\'])(.*?)\\1|([^\\s>]+))', 'i');
    let attribute = ' ' + attributeName + '="' + value + '"';

    if (attributeRegexp.test(tag)) {
        return tag.replace(attributeRegexp, attribute);
    }

    let closing = tag.endsWith('/>') ? '/>' : '>';
    return tag.slice(0, -closing.length).trimEnd() + attribute + closing;
}

function removeAttribute(tag, attributeName) {
    let escapedName = attributeName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    let attributeRegexp = new RegExp('\\s' + escapedName + '\\s*=\\s*(?:(["\\\'])(.*?)\\1|([^\\s>]+))', 'gi');

    return tag.replace(attributeRegexp, '');
}

function getAttributeValue(tag, attributeName) {
    let escapedName = attributeName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    let attributeRegexp = new RegExp('(?:^|\\s)' + escapedName + '\\s*=\\s*(?:(["\\\'])(.*?)\\1|([^\\s>]+))', 'i');
    let attribute = asString(tag).match(attributeRegexp);

    return attribute ? (attribute[2] || attribute[3] || '') : '';
}

function compactSnippet(value, maximumLength = 240) {
    let snippet = asString(value).replace(/\s+/g, ' ').trim();

    if (snippet.length > maximumLength) {
        return snippet.slice(0, maximumLength - 1) + '\u2026';
    }

    return snippet;
}

function extractShortcodes(html) {
    if (typeof html !== 'string' || html.indexOf('[') === -1) {
        return [];
    }

    let results = [];
    let shortcodeRegexp = /\[(?!\[|\/)([a-zA-Z][a-zA-Z0-9_-]*)(?=[\s\]\/])[^\]]*\]/g;
    let match;

    while ((match = shortcodeRegexp.exec(html)) !== null) {
        if (html[match.index - 1] === '[' || html[shortcodeRegexp.lastIndex] === ']') {
            continue;
        }

        let name = match[1].toLowerCase();
        let innerMarkup = match[0].slice(1, -1).trim();
        let argumentsMarkup = innerMarkup.slice(match[1].length).trim();
        let hasNamedAttribute = /(?:^|\s)[a-zA-Z_:][a-zA-Z0-9_:.-]*\s*=/.test(argumentsMarkup);
        let isSelfClosing = /\/\s*$/.test(innerMarkup);
        let escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        let hasClosingTag = new RegExp('\\[\\/' + escapedName + '\\s*\\]', 'i')
            .test(html.slice(shortcodeRegexp.lastIndex));

        // WXR has no shortcode registry. A bracketed phrase such as
        // "[simple boat]" is more likely prose than an executable shortcode.
        // Attribute, self-closing, paired and argument-less forms are reliable.
        if (argumentsMarkup && !hasNamedAttribute && !isSelfClosing && !hasClosingTag) {
            continue;
        }

        results.push({
            name,
            markup: compactSnippet(match[0]),
            index: match.index
        });
    }

    return results;
}

function extractWordPressBlocks(html) {
    if (typeof html !== 'string' || !/<!--\s*wp:/i.test(html)) {
        return [];
    }

    let results = [];
    let blockRegexp = /<!--\s*wp:([a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)?)\b[^>]*-->/g;
    let match;

    while ((match = blockRegexp.exec(html)) !== null) {
        results.push({
            name: match[1].toLowerCase(),
            markup: compactSnippet(match[0]),
            index: match.index
        });
    }

    return results;
}

function extractLinkUrls(html) {
    if (typeof html !== 'string' || !/<a\b/i.test(html)) {
        return [];
    }

    let urls = [];
    let anchorRegexp = /<a\b[^>]*>/gmi;
    let match;

    while ((match = anchorRegexp.exec(html)) !== null) {
        let href = getAttributeValue(match[0], 'href').replace(/&amp;/g, '&').trim();

        if (href) {
            urls.push(href);
        }
    }

    return [...new Set(urls)];
}

function getImageLayoutClass(...classNameGroups) {
    for (let classNames of classNameGroups) {
        for (let className of classNames) {
            let normalizedClassName = className.toLowerCase();

            if (normalizedClassName === 'alignnone') {
                return '';
            }

            if (IMAGE_LAYOUT_CLASSES[normalizedClassName]) {
                return IMAGE_LAYOUT_CLASSES[normalizedClassName];
            }
        }
    }

    return '';
}

function isWordPressImageClass(className) {
    let normalizedClassName = className.toLowerCase();

    return normalizedClassName === 'post__image' ||
        Object.prototype.hasOwnProperty.call(IMAGE_LAYOUT_CLASSES, normalizedClassName) ||
        /^wp-/.test(normalizedClassName) ||
        /^(?:size|attachment)-/.test(normalizedClassName) ||
        /^align(?:none|left|right|center|wide|full)$/.test(normalizedClassName) ||
        /^is-style-/.test(normalizedClassName);
}

function replaceBalancedElementsByClass(html, tagName, requiredClass, callback) {
    let openingTagRegexp = new RegExp('<' + tagName + '\\b[^>]*>', 'gi');
    let output = '';
    let cursor = 0;
    let openingMatch;

    while ((openingMatch = openingTagRegexp.exec(html)) !== null) {
        if (!getClassNames(openingMatch[0]).includes(requiredClass)) {
            continue;
        }

        let elementRegexp = new RegExp('<\\/?' + tagName + '\\b[^>]*>', 'gi');
        let depth = 0;
        let closingEnd = -1;
        let elementMatch;
        elementRegexp.lastIndex = openingMatch.index;

        while ((elementMatch = elementRegexp.exec(html)) !== null) {
            if (new RegExp('^<\\/' + tagName, 'i').test(elementMatch[0])) {
                depth--;

                if (depth === 0) {
                    closingEnd = elementRegexp.lastIndex;
                    break;
                }
            } else if (!/\/>$/.test(elementMatch[0])) {
                depth++;
            }
        }

        if (closingEnd === -1) {
            continue;
        }

        let innerStart = openingMatch.index + openingMatch[0].length;
        let closingTagLength = ('</' + tagName + '>').length;
        let innerHtml = html.slice(innerStart, closingEnd - closingTagLength);
        let fullElement = html.slice(openingMatch.index, closingEnd);

        output += html.slice(cursor, openingMatch.index);
        output += callback(fullElement, openingMatch[0], innerHtml);
        cursor = closingEnd;
        openingTagRegexp.lastIndex = closingEnd;
    }

    return output + html.slice(cursor);
}

function createPubliiGalleryItem(itemHtml) {
    let image = itemHtml.match(/<img\b[^>]*?>/i);

    if (!image) {
        return '';
    }

    let source = getAttributeValue(image[0], 'src');

    if (!source) {
        return '';
    }

    let width = getAttributeValue(image[0], 'width');
    let height = getAttributeValue(image[0], 'height');
    let dimensions = width && height ? width + 'x' + height : '';
    let caption = itemHtml.match(/<figcaption\b[^>]*>([\s\S]*?)<\/figcaption>/i);
    let normalizedImage = normalizeCaptionImageTag(image[0]);
    let normalizedCaption = caption && hasVisibleCaption(caption[1]) ?
        '<figcaption>' + caption[1] + '</figcaption>' : '';

    return '<figure class="gallery__item"><a href="' + source + '" data-size="' + dimensions + '">' +
        normalizedImage + '</a>' + normalizedCaption + '</figure>';
}

function normalizeWordPressGalleries(html) {
    return replaceBalancedElementsByClass(html, 'figure', 'wp-block-gallery', (gallery, openingTag, innerHtml) => {
        let galleryClasses = getClassNames(openingTag);
        let itemHtml = [];
        let itemRegexp;
        let itemMatch;

        if (/\bblocks-gallery-item\b/i.test(innerHtml)) {
            itemRegexp = /<li\b(?=[^>]*\bclass\s*=\s*(?:"[^"]*\bblocks-gallery-item\b[^"]*"|'[^']*\bblocks-gallery-item\b[^']*'))[^>]*>([\s\S]*?)<\/li>/gmi;
        } else {
            itemRegexp = /<figure\b(?=[^>]*\bclass\s*=\s*(?:"[^"]*\bwp-block-image\b[^"]*"|'[^']*\bwp-block-image\b[^']*'))[^>]*>([\s\S]*?)<\/figure>/gmi;
        }

        while ((itemMatch = itemRegexp.exec(innerHtml)) !== null) {
            let galleryItem = createPubliiGalleryItem(itemMatch[1]);

            if (galleryItem) {
                itemHtml.push(galleryItem);
            }
        }

        if (!itemHtml.length) {
            return gallery;
        }

        let columnsClass = galleryClasses.find(className => /^columns-\d+$/i.test(className));
        let columns = columnsClass ? columnsClass.replace(/\D/g, '') : Math.min(3, itemHtml.length);
        let layout = galleryClasses.includes('alignfull') ? 'gallery-wrapper--full' :
            (galleryClasses.includes('alignwide') ? 'gallery-wrapper--wide' : '');
        let galleryCaption = innerHtml.match(/<figcaption\b(?=[^>]*\bclass\s*=\s*(?:"[^"]*\bblocks-gallery-caption\b[^"]*"|'[^']*\bblocks-gallery-caption\b[^']*'))[^>]*>([\s\S]*?)<\/figcaption>/i);
        let captionOutput = galleryCaption && hasVisibleCaption(galleryCaption[1]) ?
            '<p>' + galleryCaption[1] + '</p>' : '';

        return '<div class="' + ['gallery', layout].filter(Boolean).join(' ') +
            '" data-is-empty="false" data-translation="Add images" data-columns="' + columns + '">' +
            itemHtml.join('') + '</div>' + captionOutput;
    });
}

function imageUrlMatchesSource(imageUrl, sourceUrls) {
    let normalizedImageUrl = asString(imageUrl).replace(/&amp;/g, '&').trim();

    for (let sourceUrl of asArray(sourceUrls)) {
        let normalizedSourceUrl = asString(sourceUrl).replace(/&amp;/g, '&').trim();

        if (normalizedImageUrl === normalizedSourceUrl) {
            return true;
        }

        try {
            let image = new URL(normalizedImageUrl);
            let source = new URL(normalizedSourceUrl);

            if (image.host.toLowerCase() === source.host.toLowerCase() &&
                image.pathname === source.pathname &&
                image.search === source.search) {
                return true;
            }
        } catch (e) {
            // Relative URLs have already been compared as strings above.
        }
    }

    return false;
}

function replaceGalleryImageUrls(text, sourceUrls, imageData) {
    if (typeof text !== 'string' || !imageData || !imageData.fullUrl || !imageData.thumbnailUrl) {
        return text;
    }

    let galleryItemRegexp = /<figure\b(?=[^>]*\bclass\s*=\s*(?:"[^"]*\bgallery__item\b[^"]*"|'[^']*\bgallery__item\b[^']*'))[^>]*>[\s\S]*?<\/figure>/gmi;

    return text.replace(galleryItemRegexp, galleryItem => {
        let imageMatch = galleryItem.match(/<img\b[^>]*?>/i);
        let source = imageMatch ? getAttributeValue(imageMatch[0], 'src') : '';

        if (!source || !imageUrlMatchesSource(source, sourceUrls)) {
            return galleryItem;
        }

        let anchorMatch = galleryItem.match(/<a\b[^>]*>/i);
        let updatedItem = galleryItem;

        if (anchorMatch) {
            let anchor = setAttributeValue(anchorMatch[0], 'href', imageData.fullUrl);

            if (imageData.fullWidth && imageData.fullHeight) {
                anchor = setAttributeValue(anchor, 'data-size', imageData.fullWidth + 'x' + imageData.fullHeight);
            }

            updatedItem = updatedItem.replace(anchorMatch[0], anchor);
        }

        let image = setAttributeValue(imageMatch[0], 'src', imageData.thumbnailUrl);
        image = removeAttribute(image, 'srcset');
        image = removeAttribute(image, 'data-srcset');
        image = removeAttribute(image, 'sizes');
        image = removeAttribute(image, 'data-sizes');

        if (imageData.thumbnailWidth && imageData.thumbnailHeight) {
            image = setAttributeValue(image, 'width', imageData.thumbnailWidth);
            image = setAttributeValue(image, 'height', imageData.thumbnailHeight);
        }

        return updatedItem.replace(imageMatch[0], image);
    });
}

function normalizeStandaloneImageTag(imageTag, forcedLayout) {
    let originalClasses = getClassNames(imageTag);
    let layout = typeof forcedLayout === 'undefined' ? getImageLayoutClass(originalClasses) : forcedLayout;
    let customClasses = originalClasses.filter(className => !isWordPressImageClass(className));

    return setClassNames(imageTag, ['post__image', layout, ...customClasses]);
}

function normalizeCaptionImageTag(imageTag) {
    let customClasses = getClassNames(imageTag).filter(className => !isWordPressImageClass(className));

    return setClassNames(imageTag, customClasses);
}

function getFigureClasses(figureTag, layout) {
    let customClasses = getClassNames(figureTag).filter(className => !isWordPressImageClass(className));

    return ['post__image', layout, ...customClasses];
}

function hasVisibleCaption(caption) {
    let text = asString(caption)
        .replace(/<!--[\s\S]*?-->/g, '')
        .replace(/<[^>]*>/g, '')
        .replace(/&nbsp;|&#160;|\u00a0/gi, '')
        .trim();

    return text !== '';
}

function normalizeCaptionShortcodes(html) {
    return html.replace(/\[caption\b([^\]]*)\]([\s\S]*?)\[\/caption\]/gmi, (match, attributes, body) => {
        let linkedImage = body.match(/<a\b[^>]*>\s*<img\b[^>]*?>\s*<\/a>/i);
        let image = body.match(/<img\b[^>]*?>/i);

        if (!image) {
            return body;
        }

        let media = linkedImage ? linkedImage[0] : image[0];
        let captionAttribute = getAttributeValue(attributes, 'caption');
        let caption = captionAttribute || body.replace(media, '').trim();
        let layout = getImageLayoutClass(
            getAttributeValue(attributes, 'align').split(/\s+/).filter(Boolean),
            getClassNames(image[0])
        );
        let normalizedMedia = media.replace(image[0], normalizeCaptionImageTag(image[0]));

        if (!hasVisibleCaption(caption)) {
            return media.replace(image[0], normalizeStandaloneImageTag(image[0], layout));
        }

        return '<figure class="' + ['post__image', layout].filter(Boolean).join(' ') + '">' +
            normalizedMedia + '<figcaption>' + caption + '</figcaption></figure>';
    });
}

function normalizeWordPressImageFigures(html) {
    let imageFigureRegexp = /<figure\b(?=[^>]*\bclass\s*=\s*(?:"[^"]*\bwp-block-image\b[^"]*"|'[^']*\bwp-block-image\b[^']*'))([^>]*)>([\s\S]*?)<\/figure>/gmi;

    return html.replace(imageFigureRegexp, (match, attributes, body) => {
        let figureTag = '<figure' + attributes + '>';
        let image = body.match(/<img\b[^>]*?>/i);
        let caption = body.match(/<figcaption\b([^>]*)>([\s\S]*?)<\/figcaption>/i);

        if (!image) {
            return match;
        }

        let layout = getImageLayoutClass(getClassNames(figureTag), getClassNames(image[0]));

        if (!caption || !hasVisibleCaption(caption[2])) {
            let normalizedBody = body.replace(image[0], normalizeStandaloneImageTag(image[0], layout));

            if (caption) {
                normalizedBody = normalizedBody.replace(caption[0], '');
            }

            return normalizedBody;
        }

        let normalizedFigureTag = setClassNames(figureTag, getFigureClasses(figureTag, layout));
        let normalizedBody = body.replace(image[0], normalizeCaptionImageTag(image[0]));
        let captionTag = '<figcaption' + caption[1] + '>';
        let captionClasses = getClassNames(captionTag).filter(className => {
            return !/^wp-(?:element-caption|caption)/i.test(className);
        });
        let normalizedCaption = setClassNames(captionTag, captionClasses) + caption[2] + '</figcaption>';

        normalizedBody = normalizedBody.replace(caption[0], normalizedCaption);
        return normalizedFigureTag + normalizedBody + '</figure>';
    });
}

function normalizeWordPressImageContainers(html) {
    let imageContainerRegexp = /<div\b(?=[^>]*\bclass\s*=\s*(?:"[^"]*\bwp-block-image\b[^"]*"|'[^']*\bwp-block-image\b[^']*'))([^>]*)>\s*<figure\b([^>]*)>([\s\S]*?)<\/figure>\s*<\/div>/gmi;

    return html.replace(imageContainerRegexp, (match, containerAttributes, figureAttributes, body) => {
        let containerTag = '<div' + containerAttributes + '>';
        let figureTag = '<figure' + figureAttributes + '>';
        let image = body.match(/<img\b[^>]*?>/i);
        let caption = body.match(/<figcaption\b[^>]*>([\s\S]*?)<\/figcaption>/i);

        if (!image) {
            return match;
        }

        let layout = getImageLayoutClass(
            getClassNames(containerTag),
            getClassNames(figureTag),
            getClassNames(image[0])
        );

        if (!caption || !hasVisibleCaption(caption[1])) {
            let media = body.replace(image[0], normalizeStandaloneImageTag(image[0], layout));
            return caption ? media.replace(caption[0], '') : media;
        }

        let media = body.replace(caption[0], '').trim();
        media = media.replace(image[0], normalizeCaptionImageTag(image[0]));

        return '<figure class="' + ['post__image', layout].filter(Boolean).join(' ') + '">' +
            media + '<figcaption>' + caption[1] + '</figcaption></figure>';
    });
}

function normalizeLegacyCaptionContainers(html) {
    let captionContainerRegexp = /<div\b(?=[^>]*\bclass\s*=\s*(?:"[^"]*\bwp-caption\b[^"]*"|'[^']*\bwp-caption\b[^']*'))([^>]*)>([\s\S]*?)<\/div>/gmi;

    return html.replace(captionContainerRegexp, (match, attributes, body) => {
        let containerTag = '<div' + attributes + '>';
        let image = body.match(/<img\b[^>]*?>/i);
        let caption = body.match(/<(p|div)\b(?=[^>]*\bclass\s*=\s*(?:"[^"]*\bwp-caption-text\b[^"]*"|'[^']*\bwp-caption-text\b[^']*'))[^>]*>([\s\S]*?)<\/\1>/i);

        if (!image) {
            return body;
        }

        let layout = getImageLayoutClass(getClassNames(containerTag), getClassNames(image[0]));

        if (!caption || !hasVisibleCaption(caption[2])) {
            let normalizedBody = body.replace(image[0], normalizeStandaloneImageTag(image[0], layout));
            return caption ? normalizedBody.replace(caption[0], '') : normalizedBody;
        }

        let media = body.replace(caption[0], '').trim();
        media = media.replace(image[0], normalizeCaptionImageTag(image[0]));

        return '<figure class="' + ['post__image', layout].filter(Boolean).join(' ') + '">' +
            media + '<figcaption>' + caption[2] + '</figcaption></figure>';
    });
}

function normalizeWordPressContentClasses(html) {
    if (typeof html !== 'string') {
        return '';
    }

    let textAlignmentClasses = {
        'has-text-align-left': 'align-left',
        'has-text-align-right': 'align-right',
        'has-text-align-center': 'align-center',
        'has-text-align-justify': 'align-justify'
    };

    return html.replace(/<[a-z][^>]*\sclass\s*=\s*(?:(["'])(.*?)\1|([^\s>]+))[^>]*>/gmi, tag => {
        let classes = getClassNames(tag);
        let mappedClasses = classes.map(className => textAlignmentClasses[className] || className);

        if (/^<hr\b/i.test(tag) && classes.includes('wp-block-separator')) {
            mappedClasses = mappedClasses.filter(className => {
                return !['wp-block-separator', 'has-alpha-channel-opacity', 'alignwide', 'alignfull', 'aligncenter',
                    'is-style-wide', 'is-style-dots'].includes(className);
            });
            mappedClasses.unshift('separator');

            if (classes.includes('is-style-dots')) {
                mappedClasses.push('separator--dot');
            } else if (classes.includes('is-style-wide')) {
                mappedClasses.push('separator--long-line');
            }
        }

        return setClassNames(tag, mappedClasses);
    });
}

function normalizeWordPressImageMarkup(html) {
    if (typeof html !== 'string' || html === '') {
        return asString(html);
    }

    let galleries = [];
    let normalizedHtml = normalizeWordPressGalleries(html).replace(
        /<div\b(?=[^>]*\bclass\s*=\s*(?:"[^"]*\bgallery\b[^"]*"|'[^']*\bgallery\b[^']*'))[^>]*>[\s\S]*?<\/div>/gmi,
        gallery => {
            let marker = '<!--PUBLIIGALLERY:' + galleries.length + '-->';
            galleries.push(gallery);
            return marker;
        }
    );

    normalizedHtml = normalizedHtml.replace(/<img\b[^>]*?>/gmi, imageTag => normalizeStandaloneImageTag(imageTag));
    normalizedHtml = normalizeCaptionShortcodes(normalizedHtml);
    normalizedHtml = normalizeWordPressImageContainers(normalizedHtml);
    normalizedHtml = normalizeWordPressImageFigures(normalizedHtml);
    normalizedHtml = normalizeLegacyCaptionContainers(normalizedHtml);
    normalizedHtml = normalizedHtml.replace(/<!--PUBLIIGALLERY:(\d+)-->/g, (match, index) => galleries[Number(index)] || match);

    return normalizeWordPressContentClasses(normalizedHtml);
}

function sourceUrlVariants(sourceUrl, baseUrl = '') {
    let variants = new Set();
    let resolved = resolveRemoteUrl(sourceUrl, baseUrl);

    if (!resolved) {
        return [];
    }

    let parsed = new URL(resolved);
    let pathname = parsed.pathname || '/';
    let absoluteWithoutTrailingSlash = resolved.replace(/\/$/, '');
    let pathWithoutTrailingSlash = pathname.replace(/\/$/, '') || '/';

    variants.add(resolved);
    variants.add(absoluteWithoutTrailingSlash);
    // A relative root URL would match the slash in every self-closing HTML tag
    // (for example <img />), corrupting imported content during link rewriting.
    if (pathname !== '/') {
        variants.add(pathname);
        variants.add(pathWithoutTrailingSlash);
    }

    if (pathname !== '/') {
        variants.add(pathname.endsWith('/') ? pathname : pathname + '/');
        variants.add(absoluteWithoutTrailingSlash + '/');
    }

    return [...variants].filter(Boolean);
}

function stripWordPressResponsiveAttributes(html, localUrl) {
    if (typeof html !== 'string' || !localUrl) {
        return html;
    }

    return html.replace(/<img\b[^>]*?>/gmi, imageTag => {
        if (!imageTag.includes(localUrl)) {
            return imageTag;
        }

        return imageTag
            .replace(/\s+(?:srcset|data-srcset|sizes|data-sizes)\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gmi, '');
    });
}

module.exports = {
    asArray,
    asString,
    createPubliiGalleryMarkup,
    createItemSlug,
    createMediaFilename,
    createPubliiStatus,
    getDownloadErrorReason,
    getImageReferences,
    getImageUrls,
    getPostMeta,
    getPostMetaValues,
    getSeoData,
    getSeoProviderStats,
    itemHasSeoProviderData,
    isWordPressSystemPostType,
    normalizeSeoTemplate,
    parseSerializedValues,
    resolveSeoProvider,
    imageDownloadUrlVariants,
    normalizeWordPressImageMarkup,
    removeSelfLinkedImageAnchor,
    replaceContentImageUrls,
    replaceGalleryImageUrls,
    replaceStandaloneVideoEmbeds,
    replaceUrl,
    replaceInternalUrl,
    resolveRemoteUrl,
    sanitizeTitle,
    sourceUrlVariants,
    stripWordPressResponsiveAttributes,
    extractLinkUrls,
    extractShortcodes,
    extractWordPressBlocks
};
