export default {
    selector: '#post-editor',
    file_picker_types: 'image',
    contextmenu: false,
    plugins: "advlist autolink autosave codesample link image lists hr pagebreak searchreplace media table paste autoresize emoticons textpattern toc",
    toolbar1: "bold italic underline strikethrough forecolor publiilink unlink emoticons blockquote alignleft aligncenter alignright bullist numlist image gallery media table toc",
    toolbar2: "styleselect formatselect codesample searchreplace hr readmore undo redo restoredraft removeformat sourcecode",
    toolbar3: "",
    icons: "publii",
    block_formats: 'Paragraph=p;Heading 1=h1;Heading 2=h2;Heading 3=h3;Heading 4=h4;Heading 5=h5;Heading 6=h6;Address=address;Pre=pre;Code=code;Blockquote=blockquote',
    extended_valid_elements: "img[id|accesskey|class|dir|lang|style|tabindex|title|role|src|sizes|srcset|alt|usemap|ismap|width|height|loading|decoding|fetchpriority|crossorigin|referrerpolicy],a[*],altGlyph[*],altGlyphDef[*],altGlyphItem[*],animate[*],animateColor[*],animateMotion[*],animateTransform[*],circle[*],clipPath[*],color-profile[*],cursor[*],defs[*],desc[*],discard[*],ellipse[*],feBlend[*],feColorMatrix[*],feComponentTransfer[*],feComposite[*],feConvolveMatrix[*],feDiffuseLighting[*],feDisplacementMap[*],feDistantLight[*],feDropShadow[*],feFlood[*],feFuncA[*],feFuncB[*],feFuncG[*],feFuncR[*],feGaussianBlur[*],feImage[*],feMerge[*],feMergeNode[*],feMorphology[*],feOffset[*],fePointLight[*],feSpecularLighting[*],feSpotLight[*],feTile[*],feTurbulence[*],filter[*],font[*],font-face[*],font-face-format[*],font-face-name[*],font-face-src[*],font-face-uri[*],foreignObject[*],g[*],glyph[*],glyphRef[*],hatch[*],hatchpath[*],hkern[*],iframe[*],image[*],line[*],linearGradient[*],marker[*],mask[*],mesh[*],meshgradient[*],meshpatch[*],meshrow[*],metadata[*],missing-glyph[*],mpath[*],path[*],pattern[*],polygon[*],polyline[*],radialGradient[*],rect[*],set[*],solidcolor[*],stop[*],style[*],svg[*],switch[*],symbol[*],text[*],textPath[*],title[*],tref[*],tspan[*],unknown[*],use[*],view[*],vkern[*],publii-amp,publii-non-amp,script[*],i[*],video[*],audio[*],source[*],stream[*],input[*]",
    valid_children: '+a[div|p|figure|pre|h1|h2|h3|h4|h5|h6|header|footer|article|aside|section|table|blockquote|video]',
    formats: {
        alignleft: { selector: 'p,h1,h2,h3,h4,h5,h6,td,th,div,ul,ol,li,table,img', classes: 'align-left' },
        aligncenter: { selector: 'p,h1,h2,h3,h4,h5,h6,td,th,div,ul,ol,li,table,img', classes: 'align-center' },
        alignright: { selector: 'p,h1,h2,h3,h4,h5,h6,td,th,div,ul,ol,li,table,img', classes: 'align-right' },
        alignjustify: { selector: 'p,h1,h2,h3,h4,h5,h6,td,th,div,ul,ol,li,table,img', classes: 'align-justify' }
    },
    preview_styles: false,
    resize: false,
    menubar: false,
    forced_root_block : "",
    force_br_newlines : false,
    force_p_newlines : true,
    paste_as_text: false,
    keep_styles: false,
    image_class_list: [
        {title: 'None', value: 'post__image'},
        {title: 'Full image', value: 'post__image post__image--full'},
        {title: 'Wide image', value: 'post__image post__image--wide'},
        {title: 'Left-aligned image', value: 'post__image post__image--left'},
        {title: 'Right-aligned image', value: 'post__image post__image--right'},
        {title: 'Centered image', value: 'post__image post__image--center'}
    ],
    audio_template_callback: function (data) {
        return '<figure class="post__audio"><audio controls="controls" src="' + data.source + '">' +
            (data.altsource ? '\n<source src="' + data.altsource + '"' + (data.altsourcemime ? ' type="' + data.altsourcemime + '"' : '') + ' />\n' : '') +
            '</audio></figure>';
    },
    video_template_callback: function (data) {
        return '<figure class="post__video"><video width="' + data.width + '" height="' + data.height + '"' +
            (data.poster ? ' poster="' + data.poster + '"' : '') + ' controls="controls">\n' +
            '<source src="' + data.source + '"' + (data.sourcemime ? ' type="' + data.sourcemime + '"' : '') + ' />\n' +
            (data.altsource ? '<source src="' + data.altsource + '"' + (data.altsourcemime ? ' type="' + data.altsourcemime + '"' : '') + ' />\n' : '') +
            '</video></figure>';
    },
    iframe_template_callback: function (data) {
        return '<figure class="post__video"><iframe src="' + data.source + '" width="' + data.width + '" height="' + data.height + '"' +
            (data.allowfullscreen ? ' allowFullscreen="1"' : '') + '></iframe></figure>';
    },
    media_url_resolver: function (data, resolve) {
        let patterns = [
            { regex: /youtu\.be\/([\w\-_\?&=.]+)/i, w: 560, h: 314, url: 'www.youtube.com/embed/$1', allowFullscreen: true },
            { regex: /youtube\.com(.+)v=([^&]+)(&([a-z0-9&=\-_]+))?/i, w: 560, h: 314, url: 'www.youtube.com/embed/$2?$4', allowFullscreen: true },
            { regex: /youtube.com\/embed\/([a-z0-9\?&=\-_]+)/i, w: 560, h: 314, url: 'www.youtube.com/embed/$1', allowFullscreen: true },
            { regex: /vimeo\.com\/([0-9]+)/, w: 425, h: 350, url: 'player.vimeo.com/video/$1?title=0&byline=0&portrait=0&color=8dc7dc', allowFullscreen: true },
            { regex: /vimeo\.com\/(.*)\/([0-9]+)/, w: 425, h: 350, url: 'player.vimeo.com/video/$2?title=0&amp;byline=0', allowFullscreen: true },
            { regex: /dailymotion\.com\/video\/([^_]+)/, w: 480, h: 270, url: 'www.dailymotion.com/embed/video/$1', allowFullscreen: true },
            { regex: /dai\.ly\/([^_]+)/, w: 480, h: 270, url: 'www.dailymotion.com/embed/video/$1', allowFullscreen: true }
        ];
        let pattern = patterns.find(p => p.regex.test(data.url));

        if (!pattern) {
            resolve({ html: '' });
            return;
        }

        let match = pattern.regex.exec(data.url);
        let protocolMatch = data.url.match(/^(https?:\/\/|www\.)(.+)$/i);
        let protocol = protocolMatch && protocolMatch[1] && protocolMatch[1].toLowerCase() !== 'www.' ? protocolMatch[1] : 'https://';
        let embedUrl = protocol + pattern.url;

        for (let i = 0; i < match.length; i++) {
            embedUrl = embedUrl.replace('$' + i, () => match[i] || '');
        }

        embedUrl = embedUrl.replace(/\?$/, '').replace(/"/g, '&quot;');

        resolve({
            html: '<figure class="post__video"><iframe src="' + embedUrl + '" width="' + pattern.w + '" height="' + pattern.h + '"' +
                (pattern.allowFullscreen ? ' allowFullscreen="1"' : '') + '></iframe></figure>'
        });
    },
    codesample_languages: [
        { text: 'Apache Configuration', value: 'apacheconf' },
        { text: 'ASP.NET', value: 'aspnet' },
        { text: 'Bash', value: 'bash' },
        { text: 'BASIC', value: 'basic' },
        { text: 'Batch', value: 'batch' },
        { text: 'BBcode', value: 'bbcode' },
        { text: 'C', value: 'c' },
        { text: 'C++', value: 'cpp' },
        { text: 'ColdFusion Script', value: 'cfscript' },
        { text: 'C#', value: 'csharp' },
        { text: 'C-like', value: 'clike' },
        { text: 'CSS', value: 'css' },
        { text: 'Dart', value: 'dart' },
        { text: 'Docker', value: 'docker' },
        { text: 'Elixir', value: 'elixir' },
        { text: 'Elm', value: 'elm' },
        { text: 'GDScript', value: 'gdscript' },
        { text: 'Git', value: 'git' },
        { text: 'GLSL', value: 'glsl' },
        { text: 'Go', value: 'go' },
        { text: 'GraphQL', value: 'graphql' },
        { text: 'HAML', value: 'haml' },
        { text: 'Handlebars', value: 'handlebars' },
        { text: 'Haskell', value: 'haskell' },
        { text: 'HTML', value: 'html' },
        { text: 'HTTP', value: 'http' },
        { text: 'INI', value: 'ini' },
        { text: 'Java', value: 'java' },
        { text: 'JavaScript', value: 'javascript' },
        { text: 'JSON', value: 'json' },
        { text: 'JSONP', value: 'jsonp' },
        { text: 'JSX', value: 'jsx' },
        { text: 'Kotlin', value: 'kotlin' },
        { text: 'LaTeX', value: 'latex' },
        { text: 'LESS', value: 'less' },
        { text: 'Lisp', value: 'lisp' },
        { text: 'Lua', value: 'lua' },
        { text: 'Makefile', value: 'makefile' },
        { text: 'Markdown', value: 'markdown' },
        { text: 'MATLAB', value: 'matlab' },
        { text: 'NASM', value: 'nasm' },
        { text: 'Nginx', value: 'nginx' },
        { text: 'Objective-C', value: 'objectivec' },
        { text: 'Pascal', value: 'pascal' },
        { text: 'Perl', value: 'perl' },
        { text: 'PHP', value: 'php' },
        { text: 'PowerShell', value: 'powershell' },
        { text: 'Pug', value: 'pug' },
        { text: 'Python', value: 'python' },
        { text: 'R', value: 'r' },
        { text: 'Regex', value: 'regex' },
        { text: 'Ruby', value: 'ruby' },
        { text: 'Rust', value: 'rust' },
        { text: 'Sass', value: 'sass' },
        { text: 'SCSS', value: 'scss' },
        { text: 'Scala', value: 'scala' },
        { text: 'SQL', value: 'sql' },
        { text: 'Swift', value: 'swift' },
        { text: 'Twig', value: 'twig' },
        { text: 'TypeScript', value: 'typescript' },
        { text: 'VB.NET', value: 'vbnet' },
        { text: 'Visual Basic', value: 'visual-basic' },
        { text: 'YAML', value: 'yaml' },
        { text: 'XML', value: 'markup' }
    ],
    element_format : 'html',
    fix_list_elements : true,
    image_caption: true,
    autosave_ask_before_unload: false,
    autosave_interval: "10s",
    autosave_restore_when_empty: false,
    autosave_retention: "30m",
    entity_encoding: "raw",
    allow_script_urls: true,
    convert_urls: false,
    textpattern_patterns: [
        {start: '*', end: '*', format: 'italic'},
        {start: '**', end: '**', format: 'bold'},
        {start: '##', format: 'h2'},
        {start: '###', format: 'h3'},
        {start: '####', format: 'h4'},
        {start: '#####', format: 'h5'},
        {start: '######', format: 'h6'},
        {start: '1. ', cmd: 'InsertOrderedList'},
        {start: '* ', cmd: 'InsertUnorderedList'},
        {start: '- ', cmd: 'InsertUnorderedList'}
   ],
   toc_depth: 6,
   toc_header: "h3",
   toc_class: "post__toc",
   rel_list: [
    {title: 'noreferrer', value: 'noreferrer'},
    {title: 'nofollow', value: 'nofollow'},
    {title: 'noopener', value: 'noopener'},
    {title: 'sponsored', value: 'sponsored'},
    {title: 'ugc', value: 'ugc'},
   ],
   link_context_toolbar: false,
   link_quicklink: false,
   codesample_global_prismjs: true
};
