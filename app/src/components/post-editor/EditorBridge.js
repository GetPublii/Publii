import Vue from 'vue';
import UploadProgress from '../basic-elements/UploadProgress.vue';
import EditorConfig from './../configs/postEditor.config.js';
import { accept as imageAccept } from './../../../config/image-upload-formats.js';
import { applyAppAppearance } from './../../helpers/app-appearance';
import Utils from './../../helpers/utils';
import wrapIframes from './../../../shared/iframe-wrapper';

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
        this.imageUploadProgressView = null;
        this.init();
    }

    updateItemID (newItemID) {
        this.itemID = newItemID;
        this.updateAutosavePrefix();
        let contentToUpdate = this.tinymceEditor.getContent().replace(/media\/posts\/temp/gmi, 'media/posts/' + this.itemID + '/');
        this.tinymceEditor.setContent(contentToUpdate);
    }

    getAutosavePrefix () {
        return 'tinymce-autosave-' + this.itemID + '-';
    }

    updateAutosavePrefix () {
        if (!this.tinymceEditor) {
            return;
        }

        if (this.tinymceEditor.options && this.tinymceEditor.options.set) {
            this.tinymceEditor.options.set('autosave_prefix', this.getAutosavePrefix());
        } else {
            this.tinymceEditor.settings.autosave_prefix = this.getAutosavePrefix();
        }
    }

    init() {
        let customFormats = this.loadCustomFormatsFromTheme();
        let editorConfig = Object.assign({}, EditorConfig, {
            setup: this.setupEditor.bind(this, customFormats),
            file_picker_callback: this.filePickerCallback.bind(this),
            content_css: this.tinyMCECSSFiles,
            style_formats: customFormats,
            statusbar: true,
            browser_spellcheck: window.app.spellcheckerIsEnabled(),
            autosave_prefix: this.getAutosavePrefix()
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

    setupImageFigureClassTranslation (editor) {
        editor.on('OpenWindow', event => {
            const dialog = event.dialog;

            if (!dialog || !dialog.getData || !dialog.setData) {
                return;
            }

            const data = dialog.getData();

            if (typeof data.classes !== 'string' || typeof data.caption !== 'boolean' || !data.src) {
                return;
            }

            const selected = editor.selection.getNode();
            const figure = selected.closest('figure.image');
            const image = figure ? figure.querySelector('img') : selected;

            if (!image || image.tagName !== 'IMG' || image.hasAttribute('data-mce-object') || image.hasAttribute('data-mce-placeholder')) {
                return;
            }

            const classes = new Set(image.classList);
            const options = editor.getParam('image_class_list', []);
            let matchingOption;
            let matchingClassCount = -1;

            // The native list requires an exact class string. Match configured
            // options by their tokens so custom classes do not select None.
            options.forEach(option => {
                const optionClasses = (option.value || '').split(/\s+/).filter(Boolean);

                if (optionClasses.length > matchingClassCount && optionClasses.every(className => classes.has(className))) {
                    matchingOption = option;
                    matchingClassCount = optionClasses.length;
                }
            });

            if (matchingOption) {
                dialog.setData({ classes: matchingOption.value });
            }
        });

        editor.on('BeforeExecCommand', event => {
            if (event.command !== 'mceUpdateImage' || !event.value) {
                return;
            }

            const selected = editor.selection.getNode();
            const figure = selected.closest('figure.image');
            const image = figure ? figure.querySelector('img') : selected;

            if (!image || image.tagName !== 'IMG' || image.hasAttribute('data-mce-object') || image.hasAttribute('data-mce-placeholder')) {
                return;
            }

            const imageClasses = Array.from(image.classList);
            const figureClasses = figure ? Array.from(figure.classList) : [];
            const customClasses = imageClasses.concat(figureClasses).filter(className => {
                return className !== 'image' && !className.startsWith('post__image');
            });
            const selectedClasses = (event.value.class || '').split(/\s+/).filter(Boolean);

            // Preserve custom classes before the native image command replaces
            // the class attribute, within the command's existing undo step.
            event.value.class = Array.from(new Set(selectedClasses.concat(customClasses))).join(' ');
        });

        editor.on('SetContent', () => {
            this.normalizeImageFigures();
        });

        editor.on('CloseWindow', () => {
            setTimeout(() => this.normalizeImageFigures(), 80);
        });

        editor.on('PreInit', () => {
            editor.serializer.addNodeFilter('figure', figures => {
                figures.forEach(figure => {
                    let images = figure.getAll('img');

                    if (!images.length) {
                        return;
                    }

                    let image = images[0];

                    if (image.attr('data-mce-object') || image.attr('data-mce-placeholder')) {
                        return;
                    }

                    let figureClasses = (figure.attr('class') || '').split(/\s+/).filter(cls => cls !== '');
                    let imageClasses = (image.attr('class') || '').split(/\s+/).filter(cls => cls !== '');
                    let figurePostClasses = figureClasses.filter(cls => cls.indexOf('post__image') === 0);
                    let imagePostClasses = imageClasses.filter(cls => cls.indexOf('post__image') === 0);

                    if (figureClasses.indexOf('image') === -1 && !figurePostClasses.length && !imagePostClasses.length) {
                        return;
                    }

                    let postClasses = (imagePostClasses.length ? imagePostClasses : figurePostClasses).filter(cls => cls !== 'post__image');
                    postClasses.unshift('post__image');

                    let otherClasses = [];
                    figureClasses.concat(imageClasses).forEach(cls => {
                        if (cls !== 'image' && cls.indexOf('post__image') !== 0 && otherClasses.indexOf(cls) === -1) {
                            otherClasses.push(cls);
                        }
                    });

                    figure.attr('class', postClasses.concat(otherClasses).join(' '));
                    image.attr('class', null);
                });
            });

            editor.serializer.addNodeFilter('img', images => {
                images.forEach(image => {
                    let imageClasses = image.attr('class');

                    if (typeof imageClasses !== 'string') {
                        return;
                    }

                    let cleanedClasses = imageClasses.split(/\s+/).filter(cls => cls !== '' && cls !== 'image').join(' ');
                    image.attr('class', cleanedClasses !== '' ? cleanedClasses : null);
                });
            });
        });
    }

    setupMediaDoubleClick (editor) {
        editor.on('dblclick', event => {
            const target = event.target;
            const media = target.closest('[data-mce-object="iframe"], [data-mce-object="video"], [data-mce-object="audio"]');

            if (media) {
                event.preventDefault();
                editor.selection.select(media);
                editor.execCommand('mceMedia');
                return;
            }

            if (target.tagName === 'IMG' && !target.hasAttribute('data-mce-object') && !target.hasAttribute('data-mce-placeholder')) {
                const figure = target.closest('figure');

                if (figure && figure.getAttribute('contenteditable') === 'false') {
                    figure.removeAttribute('contenteditable');
                    setTimeout(() => figure.setAttribute('contenteditable', 'false'), 100);
                }

                editor.execCommand('mceImage');
            }
        });
    }

    setupIframeWrappers (editor) {
        const unwrapOptOutIframes = root => {
            Array.from(root.querySelectorAll('div.post__iframe')).reverse().forEach(wrapper => {
                const embed = wrapper.firstElementChild;
                const isOptOut = embed && (
                    (embed.tagName === 'IFRAME' && embed.getAttribute('data-responsive') === 'false') ||
                    (embed.getAttribute('data-mce-object') === 'iframe' && embed.getAttribute('data-mce-p-data-responsive') === 'false')
                );
                const hasCustomAttributes = Array.from(wrapper.attributes).some(attribute => {
                    return attribute.name !== 'class' && !attribute.name.startsWith('data-mce-');
                });
                const containsOnlyEmbed = Array.from(wrapper.childNodes).every(node => {
                    return node === embed || (node.nodeType === 3 && node.textContent.trim() === '');
                });

                if (wrapper.className.trim() === 'post__iframe' && !hasCustomAttributes && isOptOut && containsOnlyEmbed) {
                    editor.dom.remove(wrapper, true);
                }
            });
        };

        // Normalize source HTML before TinyMCE turns media into editable
        // placeholders. This also covers insertion, paste and source editing.
        editor.on('BeforeSetContent', event => {
            if (event.format === 'raw') {
                return;
            }

            // The media dialog replaces the selected placeholder, keeping its
            // parent wrapper. Normalizing that fragment would nest a new div.
            const selected = editor.selection.getNode();

            if (
                event.selection &&
                selected.getAttribute('data-mce-object') === 'iframe' &&
                selected.closest('.post__iframe, .post__video')
            ) {
                return;
            }

            event.content = wrapIframes(event.content);
        });

        // Media-dialog updates replace the placeholder but retain its parent.
        editor.on('SetContent', event => {
            if (event.format !== 'raw') {
                unwrapOptOutIframes(editor.getBody());
            }
        });

        // TinyMCE can leave an empty block after deleting its media placeholder.
        // Clean the serialization clone while leaving the editing caret alone.
        editor.on('PreProcess', event => {
            unwrapOptOutIframes(event.node);
            event.node.querySelectorAll('div.post__iframe').forEach(wrapper => {
                const hasCustomAttributes = Array.from(wrapper.attributes).some(attribute => {
                    return attribute.name !== 'class' && !attribute.name.startsWith('data-mce-');
                });
                const isEmpty = wrapper.textContent.trim() === '' &&
                    Array.from(wrapper.children).every(child => child.tagName === 'BR');

                if (wrapper.className === 'post__iframe' && !hasCustomAttributes && isEmpty) {
                    wrapper.remove();
                }
            });
        });
    }

    normalizeImageFigures () {
        if (!this.tinymceEditor || !this.tinymceEditor.getBody || !this.tinymceEditor.getBody()) {
            return;
        }

        this.tinymceEditor.getBody().querySelectorAll('figure').forEach(figure => {
            let img = figure.querySelector('img');

            if (!img || img.hasAttribute('data-mce-object') || img.hasAttribute('data-mce-placeholder')) {
                return;
            }

            let figureClasses = Array.from(figure.classList);
            let imgClasses = Array.from(img.classList);
            let figurePostClasses = figureClasses.filter(cls => cls.indexOf('post__image') === 0);
            let imgPostClasses = imgClasses.filter(cls => cls.indexOf('post__image') === 0);

            if (figureClasses.indexOf('image') === -1 && !figurePostClasses.length && !imgPostClasses.length) {
                return;
            }

            let postClasses = (imgPostClasses.length ? imgPostClasses : figurePostClasses).filter(cls => cls !== 'post__image');
            postClasses.unshift('post__image');

            let figureOtherClasses = figureClasses.filter(cls => cls !== 'image' && cls.indexOf('post__image') !== 0);
            let imgOtherClasses = imgClasses.filter(cls => cls.indexOf('post__image') !== 0 && cls !== 'image');

            const customClasses = Array.from(new Set(figureOtherClasses.concat(imgOtherClasses)));

            figure.className = ['image'].concat(postClasses, customClasses).join(' ');
            img.className = postClasses.join(' ');
            figure.setAttribute('contenteditable', 'false');

            let figcaption = figure.querySelector('figcaption');

            if (figcaption) {
                figcaption.setAttribute('contenteditable', 'true');
            }
        });
    }

    setupEditor(customFormats, editor) {
        let self = this;
        this.tinymceEditor = editor;
        this.addEditorButtons();
        this.setupImageFigureClassTranslation(editor);
        this.setupIframeWrappers(editor);
        this.setupMediaDoubleClick(editor);
        editor.on('remove', () => this.hideImageUploadProgress());

        editor.on('init', async () => {
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

            // Support for dark mode
            let iframeDocument = iframe.contentWindow.window.document;
            let htmlElement = iframeDocument.querySelector('html');
            applyAppAppearance(
                iframeDocument,
                await window.app.getCurrentAppTheme(),
                window.app.getCurrentAppAppearance(),
                window.app.getCurrentWorkspaceAccent()
            );
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
                            imageType: 'contentImages',
                            imagesOnly: true
                        });

                        mainProcessAPI.receiveOnce('app-image-uploaded', (data) => {
                            if (data && data.error) {
                                window.app.showAlert({
                                    message: window.app.translate(data.translation || 'core.images.imageUnprocessable').replace('{file}', data.file || ''),
                                    buttonStyle: 'danger'
                                });
                                return;
                            }

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

                    // Remove empty class attributes left by image plugin
                    e.content = e.content.replace(/\s*class=""/gi, '');

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
            onAction: () => this.openNewGalleryPopup(editor)
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

    openNewGalleryPopup (editor) {
        const bookmark = editor.selection.getBookmark(2, true);
        const gallery = editor.getDoc().createElement('div');
        gallery.className = 'gallery';
        gallery.setAttribute('contenteditable', 'false');
        gallery.setAttribute('data-translation', window.app.translate('image.addImages'));

        // Keep the draft outside the editor until the gallery is confirmed.
        window.app.galleryPopupUpdated(response => {
            if (this.tinymceEditor !== editor || !editor.getBody()) {
                return;
            }

            editor.focus();
            editor.selection.moveToBookmark(bookmark);

            if (response && response.gallery === gallery && response.html !== '&nbsp;' && response.html.trim() !== '') {
                this.galleryPopupUpdated(response, gallery);
            }
        });
        window.app.updateGalleryPopup({
            postID: this.itemID,
            galleryElement: gallery,
            autoSelectFiles: false
        });
    }

    galleryPopupUpdated (response, newGallery = null) {
        this.hideToolbarsOnCopyOrScroll();

        const editor = this.tinymceEditor;

        if (!response || !editor || !editor.getBody()) {
            return;
        }

        const isNewGallery = newGallery !== null && response.gallery === newGallery;

        if (!isNewGallery && !editor.getBody().contains(response.gallery)) {
            return;
        }

        const gallery = response.gallery;
        const updatedGallery = gallery.cloneNode(false);
        updatedGallery.setAttribute('data-columns', response.columns);
        updatedGallery.classList.remove('gallery-wrapper--wide', 'gallery-wrapper--full');

        if (response.layout !== '') {
            updatedGallery.classList.add(response.layout);
        }

        updatedGallery.innerHTML = response.html;
        updatedGallery.setAttribute('data-is-empty', response.html === '&nbsp;');
        editor.focus();

        // Ignore unchanged content even when TinyMCE adds internal image attributes.
        if (!isNewGallery && editor.serializer.serialize(gallery) === editor.serializer.serialize(updatedGallery)) {
            return;
        }

        const undoLevel = editor.undoManager.transact(() => {
            if (isNewGallery) {
                editor.insertContent(editor.serializer.serialize(updatedGallery));
                return;
            }

            gallery.setAttribute('data-columns', response.columns);
            gallery.className = updatedGallery.className;
            gallery.innerHTML = response.html;
            gallery.setAttribute('data-is-empty', response.html === '&nbsp;');
        });

        editor.nodeChanged();

        if (undoLevel) {
            window.app.reportPossibleDataLoss();
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
            $('#post-editor-fake-image-uploader').attr('accept', imageAccept).trigger('click');
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
        const editorArea = editor.getContainer();
        const contentArea = editor.getContentAreaContainer();
        const iframeWindow = editor.getWin();
        $(contentArea).append($('<div class="tinymce-overlay"><div><svg class="upload-icon" width="24" height="24" viewbox="0 0 24 24"> <path d="M11,19h2v2h-2V19z M12,4l-7,6.6L6.5,12L11,7.7V16h2V7.7l4.5,4.3l1.5-1.4L12,4z"/></svg>Drag image here</div></div>'));
        const listeners = [];
        let leaveTimer = null;

        const listen = (target, event, callback, capture = false) => {
            target.addEventListener(event, callback, capture);
            listeners.push(() => target.removeEventListener(event, callback, capture));
        };
        const hasFiles = event => Array.from(event.dataTransfer?.types || []).includes('Files');
        const hide = () => {
            clearTimeout(leaveTimer);
            editorArea.classList.remove('is-hovered');
        };
        const canUpload = () => !this.postEditorInnerDragging &&
            !this.contentImageUploading && !$('.popup.gallery-popup').length;
        const dragOver = event => {
            if (this.postEditorInnerDragging || !hasFiles(event)) {
                return;
            }

            event.preventDefault();
            event.stopPropagation();
            clearTimeout(leaveTimer);
            event.dataTransfer.dropEffect = canUpload() ? 'copy' : 'none';
            editorArea.classList.toggle('is-hovered', canUpload());
        };
        const dragLeave = event => {
            if (event.relatedTarget && event.currentTarget.contains?.(event.relatedTarget)) {
                return;
            }

            clearTimeout(leaveTimer);
            leaveTimer = setTimeout(hide, 80);
        };
        const drop = event => {
            if (this.postEditorInnerDragging || !hasFiles(event)) {
                return;
            }

            event.preventDefault();
            event.stopPropagation();
            hide();

            if (canUpload()) {
                this.editorFileSelect({ originalEvent: event });
            }
        };
        const rejectOutsideContent = event => {
            if (this.postEditorInnerDragging || !hasFiles(event)) {
                return;
            }

            // Do not upload or navigate to a file dropped on the toolbar/status bar.
            event.preventDefault();
            event.stopPropagation();
            event.dataTransfer.dropEffect = 'none';
            hide();
        };

        listen(contentArea, 'dragover', dragOver);
        listen(contentArea, 'dragleave', dragLeave);
        listen(contentArea, 'drop', drop);
        listen(iframeWindow, 'dragover', dragOver, true);
        listen(iframeWindow, 'dragleave', dragLeave);
        listen(iframeWindow, 'drop', drop, true);
        listen(iframeWindow, 'dragstart', () => {
            this.postEditorInnerDragging = true;
            hide();
        });
        listen(iframeWindow, 'dragend', () => {
            this.postEditorInnerDragging = false;
            hide();
        });
        listen(editorArea, 'dragover', rejectOutsideContent);
        listen(editorArea, 'drop', rejectOutsideContent);

        editor.on('remove', () => {
            clearTimeout(leaveTimer);
            listeners.forEach(removeListener => removeListener());
            this.postEditorInnerDragging = false;
        });
    }

    showImageUploadProgress () {
        this.hideImageUploadProgress();
        const overlay = this.tinymceEditor.getContainer().querySelector('.tinymce-overlay');

        if (!overlay) {
            return;
        }

        const message = window.app.translate('ui.uploadInProgress');
        this.imageUploadProgressView = new Vue({
            render: createElement => createElement(UploadProgress, {
                class: 'tinymce-upload-progress',
                props: { message }
            })
        }).$mount();
        overlay.appendChild(this.imageUploadProgressView.$el);
    }

    hideImageUploadProgress () {
        if (!this.imageUploadProgressView) {
            return;
        }

        const element = this.imageUploadProgressView.$el;
        this.imageUploadProgressView.$destroy();
        element.remove();
        this.imageUploadProgressView = null;
    }

    async editorFileSelect (e) {
        e.originalEvent.stopPropagation();
        e.originalEvent.preventDefault();

        let files = e.originalEvent.dataTransfer.files;
        let siteName = window.app.getSiteName();
        const editor = this.tinymceEditor;
        const editorArea = $(editor.getContainer());
        const overlay = $(editor.getContainer().querySelector('.tinymce-overlay'));

        if (this.postEditorInnerDragging || this.contentImageUploading) {
            return;
        }

        if(!files[0]) {
            editorArea.removeClass('is-hovered');
            editorArea.removeClass('is-loading-image');
            overlay.text('Drag your image here');

            this.contentImageUploading = false;
            return;
        }

        const bookmark = editor.selection.getBookmark(2, true);
        this.contentImageUploading = true;
        editorArea.addClass('is-loading-image');
        this.showImageUploadProgress();

        mainProcessAPI.send('app-image-upload', {
            "id": this.itemID,
            "site": siteName,
            "path": await mainProcessAPI.normalizePath(await mainProcessAPI.getPathForFile(files[0])),
            "imagesOnly": true
        });

        mainProcessAPI.receiveOnce('app-image-uploaded', (data) => {
            if (this.tinymceEditor !== editor || !editor.getBody()) {
                this.contentImageUploading = false;
                return;
            }

            this.hideImageUploadProgress();
            if (data && data.error) {
                editorArea.removeClass('is-hovered');
                editorArea.removeClass('is-loading-image');
                overlay.html('<div><svg class="upload-icon" width="24" height="24" viewbox="0 0 24 24"> <path d="M11,19h2v2h-2V19z M12,4l-7,6.6L6.5,12L11,7.7V16h2V7.7l4.5,4.3l1.5-1.4L12,4z"/></svg>Drag image here</div>');
                this.contentImageUploading = false;

                window.app.showAlert({
                    message: window.app.translate(data.translation || 'core.images.imageUnprocessable').replace('{file}', data.file || ''),
                    buttonStyle: 'danger'
                });
                return;
            }

            editor.focus();
            editor.selection.moveToBookmark(bookmark);

            if(data.baseImage && data.baseImage.size && data.baseImage.size[0] && data.baseImage.size[1]) {
                editor.insertContent('<p><img alt="" class="post__image" height="' + data.baseImage.size[1] + '" width="' + data.baseImage.size[0] + '" src="' + data.baseImage.url + '"/></p>');
            } else {
                editor.insertContent('<p><img alt="" src="' + data.url + '" class="post__image" /></p>');
            }

            editorArea.removeClass('is-hovered');
            editorArea.removeClass('is-loading-image');
            overlay.html('<div><svg class="upload-icon" width="24" height="24" viewbox="0 0 24 24"> <path d="M11,19h2v2h-2V19z M12,4l-7,6.6L6.5,12L11,7.7V16h2V7.7l4.5,4.3l1.5-1.4L12,4z"/></svg>Drag image here</div>');

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
