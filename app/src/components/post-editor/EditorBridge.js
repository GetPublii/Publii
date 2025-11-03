import EditorConfig from './../configs/postEditor.config.js';
import Utils from './../../helpers/utils';

class EditorBridge {
    constructor(itemID, itemType = 'post') {
        this.itemID = itemID;
        this.itemType = itemType;
        this.tinyMCECSSFiles = this.getTinyMCECSSFiles();
        this.customThemeEditorConfig = this.getCustomThemeEditorConfig();
        this.tinymceEditor = false;
        this.callbackForTinyMCE = false;
        this.postEditorInnerDragging = false;
        this.contentImageUploading = false;
        this.init();
    }

    updateItemID (newItemID) {
        this.itemID = newItemID;
        let contentToUpdate = this.tinymceEditor.getContent().replace(/media\/posts\/temp/gmi, 'media/posts/' + this.itemID + '/');
        this.tinymceEditor.setContent(contentToUpdate);
    }

    init() {
        let customFormats = this.loadCustomFormatsFromTheme();
        let editorConfig = Object.assign({}, EditorConfig, {
            setup: this.setupEditor.bind(this, customFormats),
            file_picker_callback: this.filePickerCallback.bind(this),
            content_css: this.tinyMCECSSFiles,
            style_formats: customFormats,
            statusbar: true,
            browser_spellcheck: window.app.spellcheckerIsEnabled()
        });

        if (window.app.wysiwygAdditionalValidElements() !== '') {
            let additionalValidElements = window.app.wysiwygAdditionalValidElements();
            editorConfig.extended_valid_elements = editorConfig.extended_valid_elements + ',' + additionalValidElements;
        }

        if (window.app.wysiwygCustomElements() !== '') {
            let customElements = window.app.wysiwygCustomElements();
            editorConfig.custom_elements = customElements;
        }

        // Remove style selector when there is no custom styles from the theme
        if(customFormats.length === 0) {
            editorConfig.toolbar2 = editorConfig.toolbar2.replace('styleselect', '');
        }

        editorConfig = Utils.deepMerge(editorConfig, window.app.tinymceCustomConfig());

        if(this.customThemeEditorConfig) {
            editorConfig = Utils.deepMerge(editorConfig, this.customThemeEditorConfig);
        }

        if (window.app.getWysiwygTranslation()) {
            tinymce.addI18n('custom', window.app.getWysiwygTranslation());
            editorConfig.language = 'custom';
        }

        tinymce.init(editorConfig);
    }

    focus () {
        this.tinymceEditor.focus();
    }

    setupEditor(customFormats, editor) {
        let self = this;
        this.tinymceEditor = editor;
        this.addEditorButtons();

        editor.on('init', async () => {
            $('.tox-tinymce').append($('<div class="tinymce-overlay"><div><svg class="upload-icon" width="24" height="24" viewbox="0 0 24 24"> <path d="M11,19h2v2h-2V19z M12,4l-7,6.6L6.5,12L11,7.7V16h2V7.7l4.5,4.3l1.5-1.4L12,4z"/></svg>Drag image here</div></div>'));
            $('.tox-tinymce').addClass('is-loaded');
            this.initEditorDragNDropImages(editor);

            // Scroll the editor to bottom in order to avoid issues
            // with the text under gradient
            let iframe = document.getElementById('post-editor_ifr');

            if (document.getElementById('app').classList.contains('use-wide-scrollbars')) {
                iframe.contentWindow.document.documentElement.classList.add('use-wide-scrollbars');
            }

            iframe.contentWindow.window.document.body.addEventListener("keydown", function(e) {
                let selectedNode = $(editor.selection.getNode());
                let selectedNodeHeight = selectedNode.outerHeight();

                if(selectedNodeHeight > iframe.contentWindow.window.outerHeight * .75) {
                    selectedNodeHeight = 0;
                }

                let cursorPos = selectedNode.position().top + selectedNodeHeight;
                let iframeContentHeight = iframe.contentWindow.window.document.body.scrollHeight;

                if(cursorPos > iframeContentHeight - 150) {
                    iframe.contentWindow.scrollTo(0, iframeContentHeight);
                }
            }, false);

            // Handle Enter key in figcaption to exit figure
            iframe.contentWindow.window.document.body.addEventListener("keydown", function (e) {
                if (e.keyCode === 13 && !e.shiftKey) { // on enter, but when shift is not pressed
                    let node = editor.selection.getNode();

                    if (node.tagName === 'FIGCAPTION' || node.parentNode.tagName === 'FIGCAPTION') {
                        let figcaption = node.tagName === 'FIGCAPTION' ? node : node.parentNode;
                        let figure = figcaption.closest('figure');

                        if (figure) {
                            e.preventDefault();
                            e.stopPropagation();

                            // check if next element is paragraph - then focus on in, instead of creating a new paragraph
                            let next = figure.nextElementSibling;
                            
                            if (next && next.tagName === 'P') {
                                let range = editor.dom.createRng();
                                range.setStart(next, 0);
                                range.collapse(true);
                                editor.selection.setRng(range);
                            } else {
                                editor.selection.select(figure); 
                                editor.selection.collapse(false);
                                editor.execCommand('mceInsertContent', false, '<p></p>');
                            }

                            return false;
                        }
                    }
                }
            }, true);

            // DblClick on IMG opens the dialog
            iframe.contentWindow.window.document.body.addEventListener("dblclick", function (e) {
                if (e.target.tagName === 'IMG') {
                    const figure = e.target.closest('figure');
                    if (figure) {
                        // Ensure selection/handles work as expected
                        if (figure.getAttribute('contenteditable') === 'false') {
                            figure.removeAttribute('contenteditable');
                            setTimeout(() => figure.setAttribute('contenteditable', 'false'), 100);
                        }
                        // Copy post__image* classes from FIGURE to IMG for better preselect
                        const figcaption = figure.querySelector('figcaption');
                        if (figcaption) {
                            const figureClasses = Array.from(figure.classList).filter(cls => cls.startsWith('post__image'));
                            figureClasses.forEach(cls => {
                                if (!e.target.classList.contains(cls)) {
                                    e.target.classList.add(cls);
                                }
                            });
                        }
                    }
                    tinymce.activeEditor.execCommand('mceImage');
                }
            }, false);

            // ---------------------- Image dialog handling (scoped) ----------------------

            const LAYOUT_CLASSES = [
                'post__image--full',
                'post__image--wide',
                'post__image--center',
                'post__image--left',
                'post__image--right'
            ];

            // State keyed by a stable token assigned on open
            const preDialogCustomImgOnly = new Map(); // token -> string[] (custom classes originally on IMG)
            const preDialogImgLayout = new Map(); // token -> { removed: string[], injected: string|null }
            const customImageClasses = new Map(); // token -> string[] (persist custom classes for Save)

            let activeToken = null;
            let dialogWasConfirmed = false;

            const makeToken = () => 'publii-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);

            const findNodesByToken = (doc, token) => {
                const figure = doc.querySelector(`figure[data-publii-token="${token}"]`);
                const img = figure ? figure.querySelector('img') : null;
                return { figure, img, figcaption: figure ? figure.querySelector('figcaption') : null };
            };

            const getLayoutFrom = (el) => {
                if (!el) return null;
                const cls = Array.from(el.classList);
                return cls.find(c => LAYOUT_CLASSES.includes(c)) || null;
            };

            const stripLayouts = (el) => {
                if (!el) return;
                LAYOUT_CLASSES.forEach(c => el.classList.remove(c));
            };

            editor.on('BeforeExecCommand', function (e) {
                if (e.command !== 'mceImage') return;

                const selNode = editor.selection.getNode();
                if (!selNode || selNode.tagName !== 'IMG') return;

                const img = selNode;
                const figure = img.closest('figure');

                // Assign token ONLY to existing figure (never to IMG)
                activeToken = makeToken();
                if (figure) figure.setAttribute('data-publii-token', activeToken);
                dialogWasConfirmed = false;

                // Snapshot current IMG classes (keep original layout info always)
                const imgClasses = Array.from(img.classList);
                const imgLayoutNow = imgClasses.filter(c => LAYOUT_CLASSES.includes(c));
                const imgCustomNow = imgClasses.filter(c => !c.startsWith('post__image'));

                // Store custom IMG classes and temporarily remove them for cleaner dialog UI
                if (imgCustomNow.length) {
                    preDialogCustomImgOnly.set(activeToken, imgCustomNow.slice());
                    customImageClasses.set(activeToken, imgCustomNow.slice());
                    imgCustomNow.forEach(c => img.classList.remove(c));
                } else {
                    customImageClasses.set(activeToken, []);
                }

                // Merge custom classes from FIGURE (keep them for Save)
                if (figure) {
                    const figCustom = Array.from(figure.classList).filter(c => !c.startsWith('post__image'));
                    if (figCustom.length) {
                        const prev = customImageClasses.get(activeToken) || [];
                        customImageClasses.set(activeToken, [...new Set([...prev, ...figCustom])]);
                    }
                }

                // Preselect layout:
                // - if FIGURE exists -> prefer FIGURE's layout and avoid duplicates on IMG
                // - if FIGURE does NOT exist -> DO NOT strip existing IMG layout (keep preselect intact)
                const layoutToUse = getLayoutFrom(figure) || (imgLayoutNow.length ? imgLayoutNow[0] : null);

                let injected = null;
                if (figure) {
                    // Figure present: remove all IMG layouts to avoid dupes, inject figure's layout for dialog preselect
                    imgLayoutNow.forEach(c => img.classList.remove(c));
                    if (layoutToUse && !img.classList.contains(layoutToUse)) {
                        img.classList.add(layoutToUse);
                        injected = layoutToUse;
                    }
                } else {
                    // No figure yet: leave IMG layouts as-is; no injection
                    injected = null;
                }

                preDialogImgLayout.set(activeToken, {
                    removed: imgLayoutNow,  // original layout classes on IMG (may be empty if none)
                    injected                // what we temporarily added to IMG (or null)
                });
            });

            // Mark that dialog confirmed a change (we'll apply it in CloseWindow to avoid races)
            editor.on('ExecCommand', function (e) {
                if (e.command === 'mceImage') {
                    dialogWasConfirmed = true;
                }
            });

            // Close dialog — single place to handle both Save and Cancel deterministically
            editor.on('CloseWindow', function () {
                setTimeout(() => {
                    const doc = iframe.contentWindow.window.document;

                    // Resolve nodes by token; if not found (node replaced), fallback to selection
                    const resolveByTokenOrSelection = () => {
                        let { figure, img } = findNodesByToken(doc, activeToken);

                        if (!img) {
                            let selNode = editor.selection.getNode();
                            if (selNode && selNode.nodeType === 1) {
                                if (selNode.tagName === 'IMG') {
                                    img = selNode;
                                    figure = img.closest('figure');
                                } else if (selNode.closest) {
                                    const f = selNode.closest('figure');
                                    if (f) {
                                        figure = f;
                                        img = f.querySelector('img');
                                    }
                                }
                            }
                            if (!figure && img && img.closest) figure = img.closest('figure');
                        }
                        return { figure, img };
                    };

                    try {
                        const { figure, img } = resolveByTokenOrSelection();
                        const hasFigure = !!figure;
                        const snap = preDialogImgLayout.get(activeToken) || { removed: [], injected: null };
                        const origCustomImg = preDialogCustomImgOnly.get(activeToken) || [];
                        const storedCustom = customImageClasses.get(activeToken) || [];

                        // FIX: treat first insert as confirmed if figure exists and IMG holds layout/post__image
                        if (!dialogWasConfirmed && hasFigure && img) {
                        // if IMG has layout/post__image but FIGURE doesn't → user intended to save
                        const imgHasLayout = LAYOUT_CLASSES.some(c => img.classList.contains(c));
                        const figHasLayout = LAYOUT_CLASSES.some(c => figure.classList.contains(c));
                        const imgHasPost   = img.classList.contains('post__image');
                        const figHasPost   = figure.classList.contains('post__image');

                        if ((imgHasLayout && !figHasLayout) || (imgHasPost && !figHasPost)) {
                            dialogWasConfirmed = true;
                        }
                        }

                        // ---- CANCEL ----
                        if (!dialogWasConfirmed) {
                            if (img) {
                                // Remove injected layout and restore original IMG layout (only if we actually removed/injected)
                                if (snap.injected) img.classList.remove(snap.injected);
                                if (snap.removed && snap.removed.length) {
                                    snap.removed.forEach(c => {
                                        if (!img.classList.contains(c)) img.classList.add(c);
                                    });
                                }
                                // Restore custom classes on IMG
                                if (origCustomImg.length) {
                                    origCustomImg.forEach(c => {
                                        if (!img.classList.contains(c)) img.classList.add(c);
                                    });
                                }
                            }
                            // Do not touch FIGURE on Cancel
                        } else {
                            // ---- SAVE ----
                            if (hasFigure && img) {
                                // Classes after dialog
                                const imgClsNow = Array.from(img.classList);
                                const figClsNow = Array.from(figure.classList);

                                // Layout chosen in dialog; null means "None"
                                let newLayout = imgClsNow.find(c => LAYOUT_CLASSES.includes(c)) || null;

                                // Detect explicit "None" when we had injected a layout into IMG
                                // (BeforeExecCommand sets snap.injected for figure edits)
                                const userSelectedNone = (newLayout === null) && (snap && snap.injected);

                                // Fallback only if no explicit "None" and we previously removed layout from IMG
                                if (!newLayout && !userSelectedNone && snap && snap.removed && snap.removed.length) {
                                newLayout = snap.removed[0]; // restore previous layout (e.g., --wide)
                                }

                                // Strip all layout classes first
                                stripLayouts(img);
                                stripLayouts(figure);

                                // Merge non-layout classes for FIGURE
                                const nonLayoutImg = imgClsNow.filter(c => !LAYOUT_CLASSES.includes(c));
                                const nonLayoutFigure = figClsNow.filter(c => !LAYOUT_CLASSES.includes(c));

                                // Include stored custom classes captured before dialog
                                const merged = new Set([
                                    ...nonLayoutFigure,
                                    ...nonLayoutImg,
                                    ...storedCustom
                                ]);

                                if (!merged.has('post__image')) merged.add('post__image');

                                figure.className = Array.from(merged).join(' ');

                                // Apply exactly one layout (if any) on FIGURE
                                if (newLayout) figure.classList.add(newLayout);

                                // IMG must be clean in caption mode
                                img.removeAttribute('class');
                            } else if (img && !hasFigure) {
                                // Plain IMG (no caption) on Save: restore custom classes we removed for dialog
                                if (origCustomImg.length) {
                                    origCustomImg.forEach(c => {
                                        if (!img.classList.contains(c)) img.classList.add(c);
                                    });
                                }
                                // Layout left as TinyMCE set it on IMG (we don't interfere here)
                            }
                        }

                        // Cleanup tokens and state (remove from FIGURE if present; we never add token to IMG)
                        if (figure && figure.removeAttribute) figure.removeAttribute('data-publii-token');

                        preDialogImgLayout.delete(activeToken);
                        preDialogCustomImgOnly.delete(activeToken);
                        customImageClasses.delete(activeToken);
                        activeToken = null;
                        dialogWasConfirmed = false;

                        // ---------- SAFE, LOCAL post-cleanup ----------
                        try {
                            // anchor: edited figure OR <p><img> OR the <img> itself
                            const anchorEl =
                                (hasFigure && figure) ||
                                (img && img.closest && img.closest('p')) ||
                                img;

                            const nextEl = anchorEl && anchorEl.nextElementSibling;

                            if (nextEl && nextEl.tagName === 'P') {
                                // Keep paragraph if it contains any media
                                const hasMedia = nextEl.querySelector('img,figure,video,iframe,svg,picture,source,canvas,audio');

                                // Visible text check (strip non-breaking spaces)
                                const text = nextEl.textContent.replace(/\u00a0/g, '').trim();

                                // Remove only TinyMCE fillers from HTML and re-check emptiness
                                const cleanedHTML = nextEl.innerHTML
                                    .replace(/&nbsp;/gi, '')
                                    .replace(/<br[^>]*data-mce-bogus="1"[^>]*>/gi, '')
                                    .trim();

                                // Remove paragraph ONLY if it has no media AND no visible text AND no real HTML
                                if (!hasMedia && text === '' && cleanedHTML === '') {
                                    nextEl.remove();
                                }
                            }
                        } catch (_) { }
                        // ---------------------------------------------

                    } catch (error) {
                        console.warn('Error during image dialog close handling:', error);
                        // Best-effort cleanup
                        preDialogImgLayout.delete(activeToken);
                        preDialogCustomImgOnly.delete(activeToken);
                        customImageClasses.delete(activeToken);
                        activeToken = null;
                        dialogWasConfirmed = false;
                    }
                }, 80); // small delay to ensure dialog DOM changes are committed
            });

            // ---------------------- END image dialog handling ----------------------

            // Support for dark mode
            let htmlElement = iframe.contentWindow.window.document.querySelector('html');
            htmlElement.setAttribute('data-theme', await window.app.getCurrentAppTheme());
            htmlElement.setAttribute('style', window.app.overridedCssVariables());

            // Add inline editors
            this.addInlineEditor(customFormats);
            this.addLinkEditor(iframe);

            this.tinymceEditor.once('keyup', e => {
                window.app.reportPossibleDataLoss();
            });

            this.tinymceEditor.on('keyup', e => {
                if(e.keyCode !== 13 && e.keyCode !== 40) {
                    return;
                }

                let node = this.tinymceEditor.selection.getNode();

                if(
                    e.keyCode === 40 &&
                    node.tagName === 'PRE' &&
                    node.nextSibling === null
                ) {
                    this.tinymceEditor.execCommand('mceInsertContent', false, '<p></p>');
                    return;
                }

                if(
                    e.keyCode === 13 &&
                    node.tagName === 'P' &&
                    node.getAttribute('class')
                ) {
                    node.removeAttribute('class');
                    return;
                }

                if(
                    e.keyCode === 13 &&
                    node.tagName === 'P' &&
                    node.parentNode.tagName === 'BLOCKQUOTE' &&
                    node.previousSibling &&
                    node.previousSibling.tagName === 'P' &&
                    node.previousSibling.childNodes &&
                    node.previousSibling.childNodes[0] &&
                    node.previousSibling.childNodes[0].tagName === 'BR' &&
                    node.previousSibling.childNodes[0].getAttribute('data-mce-bogus') === '1' &&
                    node.nextSibling === null
                ) {
                    // get the element's parent node
                    let parent = node.parentNode;

                    if(parent.nextSibling) {
                        parent.parentNode.insertBefore(node, parent.nextSibling);
                        parent.removeChild(parent.lastChild);
                    } else {
                        parent.parentNode.appendChild(node);
                        parent.removeChild(parent.lastChild);
                    }

                    setTimeout(() => {
                        this.tinymceEditor.selection.select(parent.nextSibling, true);
                    }, 0);
                }
            });

            iframe.contentWindow.window.document.body.addEventListener("click", (e) => {
                let clickedElement = e.path ? e.path[0] : e.srcElement;
                let showPopup = false;

                if(localStorage.getItem('publii-writers-panel') === null) {
                    localStorage.setItem('publii-writers-panel', 'opened');
                    window.app.writersPanelOpen();
                }

                if(clickedElement.tagName === 'FIGCAPTION') {
                    return;
                }

                if(clickedElement.tagName === 'SCRIPT') {
                    let content = this.tinymceEditor.getContent({
                        source_view: true
                    });

                    window.app.sourceCodeEditorShow(content, this.tinymceEditor);
                    return;
                }

                if(clickedElement.tagName === 'FIGURE') {
                    showPopup = true;
                } else if(e.path && e.path[1] && e.path[1].tagName === 'FIGURE') {
                    clickedElement = e.path[1];
                    showPopup = true;
                } else if(e.srcElement && e.srcElement.parentNode && e.srcElement.parentNode === 'FIGURE') {
                    clickedElement = e.srcElement.parentNode;
                    showPopup = true;
                }

                if(clickedElement.tagName === 'A' || clickedElement.parentNode.tagName === 'A') {
                    let selection = iframe.contentWindow.window.getSelection();
                    selection.removeAllRanges();
                    let range = iframe.contentWindow.window.document.createRange();

                    if (clickedElement.tagName === 'A') {
                        range.selectNode(clickedElement);
                    } else if (clickedElement.parentNode && clickedElement.parentNode.tagName === 'A') {
                        range.selectNode(clickedElement.parentNode);
                    }

                    selection.addRange(range);

                    if (this.checkInlineLinkTrigger(clickedElement)) {
                        window.app.updateLinkEditor({
                            sel: selection,
                            text: clickedElement
                        });
                    }
                } else {
                    window.app.updateLinkEditor({
                        sel: false,
                        text: false
                    });
                }

                if(
                    clickedElement.tagName === 'DIV' &&
                    clickedElement.getAttribute('class') &&
                    clickedElement.getAttribute('class').indexOf('gallery') !== -1
                ) {
                    window.app.updateGalleryPopup({
                        postID: this.itemID,
                        galleryElement: clickedElement
                    });

                    window.app.galleryPopupUpdated(this.galleryPopupUpdated.bind(this));
                }
            });

            let linkToolbar = $('#link-toolbar');
            let inlineToolbar = $('#inline-toolbar');
            let lastScroll = -1;
            let hideToolbars = function (e) {
                if (linkToolbar.css('display') !== 'block' && inlineToolbar.css('display') !== 'block') {
                    return;
                }

                let iframeScrollOffset = iframe.contentWindow.document.body.parentNode.scrollTop;

                if (lastScroll !== -1 && Math.abs(iframeScrollOffset - lastScroll) > 20) {
                    lastScroll = -1;
                    linkToolbar.css('display', 'none');
                    inlineToolbar.css('display', 'none');
                } else if (lastScroll === -1) {
                    lastScroll = iframeScrollOffset;
                }
            };

            iframe.contentWindow.window.addEventListener("scroll", hideToolbars);

            $('#post-editor-fake-image-uploader').on('change', () => {
                if (!$('#post-editor-fake-image-uploader')[0].value) {
                    return;
                }

                setTimeout(async () => {
                    if(this.callbackForTinyMCE) {
                        let filePath = false;

                        if($('#post-editor-fake-image-uploader')[0].files) {
                            filePath = await mainProcessAPI.normalizePath(await mainProcessAPI.getPathForFile($('#post-editor-fake-image-uploader')[0].files[0]));
                        }

                        if(!filePath) {
                            return;
                        }

                        mainProcessAPI.send('app-image-upload', {
                            id: this.itemID,
                            site: window.app.getSiteName(),
                            path: filePath,
                            imageType: 'contentImages'
                        });

                        mainProcessAPI.receiveOnce('app-image-uploaded', (data) => {
                            let imagePath = data.baseImage.url;
                            imagePath = imagePath.replace('file://', 'file:///');

                            this.callbackForTinyMCE(imagePath, {
                                alt: '',
                                dimensions: {
                                    height: data.baseImage.size[1],
                                    width: data.baseImage.size[0]
                                }
                            });
                        });

                        $('#post-editor-fake-image-uploader')[0].value = '';
                    }
                }, 50);
            });

            // Writers Panel
            let updateWritersPanel = function () {
                 window.app.writersPanelRefresh();
            };
            let throttledUpdate = Utils.debouncedFunction(updateWritersPanel, 1000);
            editor.on('setcontent beforeaddundo undo redo keyup', throttledUpdate);
            updateWritersPanel();

            iframe.contentWindow.window.document.addEventListener('copy', () => {
                self.hideToolbarsOnCopyOrScroll();
            });

            iframe.contentWindow.window.document.addEventListener('scroll', () => {
                self.hideToolbarsOnCopyOrScroll();
            });

            // Clean up content before saving
            editor.on('GetContent', function (e) {
                if (e.format === 'html') {
                    // Remove contenteditable from output
                    e.content = e.content.replace(/\s*contenteditable="(true|false)"/gi, '');

                    // Remove empty paragraphs after figures
                    e.content = e.content.replace(/<\/figure>\s*<p>\s*(&nbsp;|\u00a0)?\s*<\/p>/gi, '</figure>');

                    // Clean up double figures
                    e.content = e.content.replace(/<figure[^>]*>\s*<figure[^>]*>/gi, '<figure class="post__image">');
                    e.content = e.content.replace(/<\/figure>\s*<\/figure>/gi, '</figure>');
                }
            });
        });

        editor.ui.registry.addButton('gallery', {
            icon: 'gallery',
            tooltip: window.app.translate('editor.insertGallery'),
            onAction: function () {
                editor.insertContent('<div class="gallery" data-is-empty="true" contenteditable="false" data-translation="' + window.app.translate('image.addImages') + '"></div>');
            }
        });
    }

    extensionsPath () {
        return [
            'file:///',
            window.app.getSiteDir(),
            '/input/themes/',
            window.app.getSiteTheme(),
            '/'
        ].join('');
    }

    galleryPopupUpdated (response) {
        this.hideToolbarsOnCopyOrScroll();

        if(response) {
            response.gallery.innerHTML = response.html;
            response.gallery.setAttribute('data-is-empty', response.html === '&nbsp;');
        }
    }

    getTinyMCECSSFiles () {
        let pathToEditorCSS = this.extensionsPath() + 'assets/css/editor.css';
        let customEditorCSS = pathToEditorCSS;

        return [
            'css/editor.css?v=0710',
            customEditorCSS
        ].join(',');
    }

    getCustomThemeEditorConfig () {
        // Add custom editor config
        let customEditorConfig = false;

        if (window.app.hasPostEditorConfigOverride()) {
            let configOverridePath = this.extensionsPath() + 'tinymce.override.json';

            jQuery.ajax({
                url: configOverridePath,
                dataType: 'json',
                async: false,
                success: function(json) {
                    customEditorConfig = json;
                }
            });
        }

        return customEditorConfig;
    }

    loadCustomFormatsFromTheme() {
        let output = [];
        let customElements = [];
        let inlineElements = [
            'a', 'b', 'abbr', 'acronym', 'cite', 'dfn', 'kbd',
            'samp', 'time', 'var', 'bdo', 'br', 'big', 'code',
            'i', 'em', 'small','strong','span', 'tt', 'img',
            'map', 'object', 'q', 'script', 'sub', 'sup', 'button',
            'input', 'label', 'select', 'textarea'
        ];

        // Detect mode
        if (window.app.getThemeCustomElementsMode() === 'advanced') {
            output = JSON.parse(JSON.stringify(window.app.getThemeCustomElements()));
            return output;
        }

        // Load custom elements
        if (window.app.getThemeCustomElements()) {
            customElements = window.app.getThemeCustomElements();
        }

        if(customElements && customElements.length) {
            for(let i = 0; i < customElements.length; i++) {
                if(!customElements[i]) {
                    continue;
                }

                if(!customElements[i].tag && !customElements[i].selector) {
                    continue;
                }

                if(customElements[i].postEditor === false) {
                    continue;
                }

                let style = {
                    title: customElements[i].label,
                    classes: customElements[i].cssClasses
                };

                if(customElements[i].selector) {
                    style.selector = customElements[i].selector;
                } else {
                    if (inlineElements.indexOf(customElements[i].tag)) {
                        style.inline = customElements[i].tag;
                    } else {
                        style.block = customElements[i].tag;
                    }
                }

                output.push(style);
            }
        }

        return output;
    }

    filePickerCallback(callback, value, meta) {
        // Provide image and alt text for the image dialog
        if (meta.filetype == 'image') {
            this.callbackForTinyMCE = callback;
            $('#post-editor-fake-image-uploader').trigger('click');
        } else {
            this.callbackForTinyMCE = false;
        }
    }

    addEditorButtons() {
        this.tinymceEditor.ui.registry.addButton("publiilink", {
            icon: 'link',
            tooltip: window.app.translate('link.insertEditLink'),
            onAction: () => {
                let selectedNode = tinymce.activeEditor.selection.getNode();

                if (selectedNode.tagName === 'IMG' && selectedNode.parentNode && selectedNode.parentNode.tagName === 'A') {
                    window.app.initLinkPopup({
                        postID: this.itemID,
                        selection: selectedNode.parentNode.outerHTML
                    });
                } else {
                    window.app.initLinkPopup({
                        postID: this.itemID,
                        selection: tinymce.activeEditor.selection.getContent()
                    });
                }
            }
        });

        this.tinymceEditor.ui.registry.addButton("sourcecode", {
            icon: 'sourcecode',
            tooltip: window.app.translate('editor.sourceCode'),
            text: "HTML",
            onAction: () => {
                let content = this.tinymceEditor.getContent({
                    source_view: true
                });

                window.app.sourceCodeEditorShow(content, this.tinymceEditor);
            }
        });

        this.tinymceEditor.ui.registry.addButton('readmore', {
            icon: 'readmore',
            text: window.app.translate('editor.readMore'),
            onAction: () => {
                this.tinymceEditor.insertContent('<hr id="read-more" data-translation="' + window.app.translate('editor.readMore') + '">' + "\n");
            }
        });
    }

    addInlineEditor(customFormats) {
        let iframe = document.getElementById('post-editor_ifr');
        let win = iframe.contentWindow.window;
        let doc = win.document;

        window.app.initInlineEditor('init-inline-editor', customFormats);

        $(doc.querySelector('html')).on('mouseup', (e) => {
            let sel = win.getSelection();
            let text = sel.toString();

            if (this.checkInlineTrigger(e.target)) {
                window.app.updateInlineEditor({
                    sel,
                    text
                });
            }
        });
    }

    checkInlineTrigger (target) {
        let excludedTags = ['FIGURE', 'FIGCAPTION', 'IMG', 'PRE'];

        if (excludedTags.indexOf(target.tagName) > -1) {
            return false;
        }

        if (target.tagName === 'DIV' && target.classList.contains('gallery')) {
            return false;
        }

        for ( ; target && target !== document; target = target.parentNode) {
            if (target.matches && target.matches('.post__toc')) {
                return false;
            }

            if (target.matches && target.matches('pre')) {
                return false;
            }
        }

        return true;
    }

    checkInlineLinkTrigger (target) {
        for ( ; target && target !== document; target = target.parentNode) {
            if (target.matches && target.matches('.post__toc')) {
                return false;
            }
        }

        return true;
    }

    addLinkEditor(iframe) {
        window.app.initLinkEditor(iframe);
    }

    hideToolbarsOnCopyOrScroll() {
        $('#link-toolbar').css('display', 'none');
        $('#inline-toolbar').css('display', 'none');
    }

    initEditorDragNDropImages(editor) {
        let editorArea = $('.tox-tinymce');
        let postEditor = $('.post-editor');
        let hoverState = false;
        let tinymceOverlay = $('.tinymce-overlay');

        postEditor.on('dragover', () => {
            if(!this.postEditorInnerDragging && !$('.popup.gallery-popup').length) {
                hoverState = true;
                editorArea.addClass('is-hovered');
            }
        });

        tinymceOverlay.on('dragover', e => {
            if(!this.postEditorInnerDragging && !$('.popup.gallery-popup').length) {
                hoverState = true;
                editorArea.addClass('is-hovered');
            }
        });

        postEditor.on('dragleave', () => {
            hoverState = false;

            setTimeout(() => {
                if(!hoverState) {
                    editorArea.removeClass('is-hovered');
                }
            }, 250);
        });

        document.getElementById('post-editor_ifr').contentWindow.addEventListener("dragover", e => {
            if(!this.postEditorInnerDragging) {
                e.preventDefault();
                e.stopPropagation();
                editorArea.addClass('is-hovered');
            }
        }, false);

        document.getElementById('post-editor_ifr').contentWindow.addEventListener('mousedown', () => {
            this.postEditorInnerDragging = true;
        });

        document.getElementById('post-editor_ifr').contentWindow.addEventListener('mouseup', () => {
            this.postEditorInnerDragging = false;
        });

        document.getElementById('post-editor_ifr').contentWindow.addEventListener('mouseout', () => {
            this.postEditorInnerDragging = false;
        });

        editorArea.on('dragover', this.fileDragOver.bind(this));
        editorArea.on('drop', this.editorFileSelect.bind(this));
    }

    fileDragOver (e) {
        if(!this.postEditorInnerDragging) {
            e.originalEvent.stopPropagation();
            e.originalEvent.preventDefault();
            e.originalEvent.dataTransfer.dropEffect = 'copy';
        }
    }

    async editorFileSelect (e) {
        e.originalEvent.stopPropagation();
        e.originalEvent.preventDefault();

        let files = e.originalEvent.dataTransfer.files;
        let siteName = window.app.getSiteName();

        if(this.postEditorInnerDragging) {
            return;
        }

        if(!files[0]) {
            $('.tox-tinymce').removeClass('is-hovered');
            $('.tox-tinymce').removeClass('is-loading-image');
            $('.tinymce-overlay').text('Drag your image here');

            this.contentImageUploading = false;
            return;
        }

        $('.tox-tinymce').addClass('is-loading-image');
        $('.tinymce-overlay').html('<div><div class="loader"><span></span></div> ' + 'Upload in progress</div>');

        mainProcessAPI.send('app-image-upload', {
            "id": this.itemID,
            "site": siteName,
            "path": await mainProcessAPI.normalizePath(await mainProcessAPI.getPathForFile(files[0]))
        });

        this.contentImageUploading = true;

        mainProcessAPI.receiveOnce('app-image-uploaded', (data) => {
            if(data.baseImage && data.baseImage.size && data.baseImage.size[0] && data.baseImage.size[1]) {
                tinymce.activeEditor.insertContent('<p><img alt="" class="post__image" height="' + data.baseImage.size[1] + '" width="' + data.baseImage.size[0] + '" src="' + data.baseImage.url + '"/></p>');
            } else {
                tinymce.activeEditor.insertContent('<p><img alt="" src="' + data.url + '" class="post__image" /></p>');
            }

            $('.tox-tinymce').removeClass('is-hovered');
            $('.tox-tinymce').removeClass('is-loading-image');
            $('.tinymce-overlay').html('<div><svg class="upload-icon" width="24" height="24" viewbox="0 0 24 24"> <path d="M11,19h2v2h-2V19z M12,4l-7,6.6L6.5,12L11,7.7V16h2V7.7l4.5,4.3l1.5-1.4L12,4z"/></svg>Drag image here</div>');

            this.contentImageUploading = false;
        });
    }

    reloadEditor () {
        this.tinymceEditor.once('keyup', e => {
            window.app.reportPossibleDataLoss();
        });
    }
}

export default EditorBridge;
