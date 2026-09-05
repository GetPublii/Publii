/**
 * Keep a link dialog tied to its originating editor and selection.
 * Popup fields contain plain text; unchanged selections retain their HTML formatting.
 */
export function createMiniEditorLinkSession (editor) {
    const node = editor.selection.getNode();
    const anchor = editor.dom.getParent(node, 'a[href]');
    const bookmark = editor.selection.getBookmark(2, true);
    const html = anchor ? anchor.innerHTML : editor.selection.getContent();
    const label = anchor ? anchor.textContent : editor.selection.getContent({ format: 'text' });
    let finished = false;

    return {
        config: {
            selection: anchor ? anchor.outerHTML : html,
            label,
            attributes: anchor ? Object.fromEntries(
                ['href', 'title', 'class', 'target', 'rel', 'download'].map(name => [name, anchor.getAttribute(name)])
            ) : null
        },
        getContent: () => editor.getContent(),
        finish (response) {
            if (finished || editor.removed) return;
            finished = true;
            editor.focus();
            editor.selection.moveToBookmark(bookmark);
            if (!response) return;

            editor.undoManager.transact(() => {
                if (anchor && editor.getBody().contains(anchor)) {
                    editor.dom.setAttribs(anchor, response.attributes);
                    if (response.text !== label) {
                        anchor.textContent = response.text || response.url;
                    }
                    editor.selection.select(anchor);
                    editor.selection.collapse(false);
                } else {
                    const content = response.text === label && html ? html :
                        editor.dom.encode(response.text || response.url);
                    editor.insertContent(editor.dom.createHTML('a', response.attributes, content));
                }
            });
            editor.nodeChanged();
        }
    };
}
