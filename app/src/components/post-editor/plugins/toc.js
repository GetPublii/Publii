import createSlug from './../../../../back-end/helpers/slug.js';

/*
 * Table of Contents plugin for HugeRTE.
 *
 * Publii replacement for the TinyMCE 5 "toc" plugin which is not available
 * in HugeRTE. It keeps the original markup and configuration contract:
 *
 *   <div class="{toc_class}" contenteditable="false">
 *       <{toc_header} contenteditable="true">Table of Contents</{toc_header}>
 *       <ul><li><a href="#anchor">Heading</a></li>...</ul>
 *   </div>
 *
 * Unlike the original plugin it generates readable, slug-based heading
 * anchors (shared slug logic with the rest of Publii) instead of random
 * "mcetoc_..." ids; legacy "mcetoc_" ids are migrated to slugs on the next
 * insert/update of the table of contents.
 */

const LEGACY_ID_PATTERN = /^mcetoc_/;

export default function registerTocPlugin () {
    if (typeof hugerte === 'undefined' || hugerte.PluginManager.get('toc')) {
        return;
    }

    hugerte.PluginManager.add('toc', editor => {
        editor.options.register('toc_class', {
            processor: 'string',
            default: 'mce-toc'
        });

        editor.options.register('toc_header', {
            processor: value => /^h[1-6]$/.test(value),
            default: 'h2'
        });

        editor.options.register('toc_depth', {
            processor: 'number',
            default: 3
        });

        const getTocClass = () => editor.options.get('toc_class');
        const getTocHeader = () => editor.options.get('toc_header');

        const getTocDepth = () => {
            const depth = parseInt(editor.options.get('toc_depth'), 10);
            return depth >= 1 && depth <= 6 ? depth : 3;
        };

        const collectHeaders = () => {
            const tocClass = getTocClass();
            const selector = Array.from({ length: getTocDepth() }, (item, index) => 'h' + (index + 1)).join(',');

            return editor.dom.select(selector)
                .filter(header => {
                    return !editor.dom.getParent(header, '.' + tocClass) &&
                        !editor.dom.getParent(header, '.mce-offscreen-selection');
                })
                .map(header => ({
                    element: header,
                    level: parseInt(header.nodeName.substr(1), 10),
                    text: header.textContent.trim()
                }))
                .filter(header => header.text !== '');
        };

        const assignHeaderIds = headers => {
            const usedIds = new Set();

            editor.dom.select('[id]').forEach(element => {
                if (!LEGACY_ID_PATTERN.test(element.id)) {
                    usedIds.add(element.id);
                }
            });

            headers.forEach(header => {
                let id = header.element.id;

                if (!id || LEGACY_ID_PATTERN.test(id)) {
                    const base = createSlug(header.text) || 'section';
                    id = base;

                    for (let suffix = 2; usedIds.has(id); suffix++) {
                        id = base + '-' + suffix;
                    }

                    usedIds.add(id);
                    header.element.id = id;
                }

                header.id = id;
            });

            return headers;
        };

        const buildTocContent = headers => {
            const encode = value => editor.dom.encode(value);
            const tocHeader = getTocHeader();
            const minLevel = headers.reduce((level, header) => Math.min(level, header.level), 6);
            let previousLevel = minLevel - 1;
            let html = '<' + tocHeader + ' contenteditable="true">' +
                encode(editor.translate('Table of Contents')) +
                '</' + tocHeader + '>';

            headers.forEach(header => {
                if (header.level > previousLevel) {
                    for (let level = previousLevel; level < header.level; level++) {
                        html += '<ul><li>';
                    }
                } else {
                    for (let level = previousLevel; level > header.level; level--) {
                        html += '</li></ul>';
                    }

                    html += '</li><li>';
                }

                html += '<a href="#' + encode(header.id) + '">' + encode(header.text) + '</a>';
                previousLevel = header.level;
            });

            for (let level = previousLevel; level >= minLevel; level--) {
                html += '</li></ul>';
            }

            return html;
        };

        const findTocElements = () => {
            return editor.dom.select('.' + getTocClass()).filter(element => {
                return !editor.dom.getParent(element, '.mce-offscreen-selection');
            });
        };

        const updateToc = () => {
            const tocElements = findTocElements();

            if (!tocElements.length) {
                return;
            }

            editor.undoManager.transact(() => {
                const content = buildTocContent(assignHeaderIds(collectHeaders()));

                tocElements.forEach(element => {
                    element.innerHTML = content;
                });
            });
        };

        const insertToc = () => {
            if (findTocElements().length) {
                updateToc();
                return;
            }

            editor.undoManager.transact(() => {
                const content = buildTocContent(assignHeaderIds(collectHeaders()));
                editor.insertContent(
                    '<div class="' + editor.dom.encode(getTocClass()) + '" contenteditable="false">' +
                    content +
                    '</div>'
                );
            });
        };

        editor.addCommand('mceInsertToc', insertToc);
        editor.addCommand('mceUpdateToc', updateToc);

        editor.ui.registry.addButton('toc', {
            icon: 'toc',
            tooltip: 'Table of contents',
            onAction: () => editor.execCommand('mceInsertToc'),
            onSetup: api => {
                const updateState = () => {
                    api.setEnabled(!editor.mode.isReadOnly() && collectHeaders().length > 0);
                };

                updateState();
                editor.on('LoadContent SetContent change', updateState);

                return () => editor.off('LoadContent SetContent change', updateState);
            }
        });

        editor.ui.registry.addButton('tocupdate', {
            icon: 'reload',
            tooltip: 'Update',
            onAction: () => editor.execCommand('mceUpdateToc')
        });

        editor.ui.registry.addContextToolbar('toc', {
            items: 'tocupdate',
            predicate: node => node && editor.dom.is(node, '.' + getTocClass()) && editor.getBody().contains(node),
            scope: 'node',
            position: 'node'
        });

        editor.on('PreProcess', event => {
            editor.dom.select('.' + getTocClass(), event.node).forEach(element => {
                element.removeAttribute('contenteditable');

                element.querySelectorAll('[contenteditable]').forEach(child => {
                    child.removeAttribute('contenteditable');
                });
            });
        });

        editor.on('SetContent', () => {
            editor.dom.select('.' + getTocClass()).forEach(element => {
                element.setAttribute('contenteditable', 'false');

                const title = element.firstElementChild;

                if (title && /^H[1-6]$/.test(title.tagName)) {
                    title.setAttribute('contenteditable', 'true');
                }
            });
        });
    });
}
