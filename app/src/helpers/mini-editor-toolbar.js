import Utils from './utils';

export function registerMiniEditorSelectionToolbar (editor, {
    internalLinks,
    isLinkDialogOpen,
    translate,
    openExternal
}) {
    const linkButton = internalLinks ? 'publiilink' : 'link';
    const getSelectedLink = () => editor.dom.getParent(editor.selection.getNode(), 'a[href]', editor.getBody());
    const getPreviewUrl = () => {
        const anchor = getSelectedLink();
        const href = anchor && anchor.getAttribute('href');

        if (!href || href.includes('#INTERNAL_LINK#')) {
            return false;
        }

        return Utils.getValidUrl(href);
    };

    editor.ui.registry.addButton('publiiminipreview', {
        icon: 'preview',
        tooltip: translate('link.previewLinkInBrowser'),
        onAction: () => {
            const url = getPreviewUrl();

            if (url) {
                editor.dispatch('contexttoolbar-hide');
                openExternal(url);
            }
        },
        onSetup: api => {
            const updateState = () => api.setEnabled(!!getPreviewUrl());
            updateState();
            editor.on('NodeChange', updateState);

            return () => editor.off('NodeChange', updateState);
        }
    });

    editor.ui.registry.addContextToolbar('publii-mini-link', {
        items: linkButton + ' unlink publiiminipreview',
        position: 'node',
        scope: 'node',
        predicate: node => {
            return !isLinkDialogOpen() &&
                !editor.mode.isReadOnly() &&
                editor.selection.isCollapsed() &&
                editor.dom.isEditable(node) &&
                node.nodeName === 'A' &&
                node.hasAttribute('href');
        }
    });
    editor.ui.registry.addContextToolbar('publii-mini-selection', {
        items: 'bold italic underline strikethrough ' + linkButton + ' unlink',
        position: 'selection',
        scope: 'editor',
        predicate: node => {
            if (isLinkDialogOpen() || editor.mode.isReadOnly() || editor.selection.isCollapsed()) {
                return false;
            }

            if (!editor.dom.isEditable(node) || editor.dom.getParent(node, 'pre, figure, figcaption, img', editor.getBody())) {
                return false;
            }

            return editor.selection.getContent({ format: 'text' }).trim() !== '';
        }
    });

    editor.on('init', () => {
        const container = editor.getContainer();
        const ownerDocument = container.ownerDocument;
        const onAncestorScroll = event => {
            if (event.target.contains && event.target.contains(container)) {
                editor.dispatch('contexttoolbar-hide');
            }
        };

        // Settings and sidebars scroll inside the document, outside the editor iframe.
        ownerDocument.addEventListener('scroll', onAncestorScroll, true);
        editor.on('remove', () => {
            ownerDocument.removeEventListener('scroll', onAncestorScroll, true);
        });
    });
}
