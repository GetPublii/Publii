<template>
    <div
        id="link-toolbar"
        contenteditable="false">
        <button
            id="link-toolbar-url"
            @click.stop="showLinkPopup"
            class="tox-icon tox-tbtn__icon-wrap">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
        </button>
        <button
            id="link-toolbar-unurl"
            @click.stop="unlink"
            class="tox-icon tox-tbtn__icon-wrap">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m18.84 12.25 1.72-1.71h-.02a5.004 5.004 0 0 0-.12-7.07 5.006 5.006 0 0 0-6.95 0l-1.72 1.71"></path><path d="m5.17 11.75-1.71 1.71a5.004 5.004 0 0 0 .12 7.07 5.006 5.006 0 0 0 6.95 0l1.71-1.71"></path><line x1="8" y1="2" x2="8" y2="5"></line><line x1="2" y1="8" x2="5" y2="8"></line><line x1="16" y1="19" x2="16" y2="22"></line><line x1="19" y1="16" x2="22" y2="16"></line></svg>
        </button>
        <button
            id="link-toolbar-preview"
            @click.stop="showPreview"
            class="tox-icon tox-tbtn__icon-wrap">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path><circle cx="12" cy="12" r="3"></circle></svg>
        </button>
    </div>
</template>

<script>
import Utils from './../../helpers/utils.js';

export default {
    name: 'link-toolbar',
    data () {
        return {
            win: null
        };
    },
    mounted () {
        this.$bus.$on('init-link-editor', iframe => {
            this.init(iframe);
        });

        this.$bus.$on('update-link-editor', config => {
            this.update(config.sel, config.text);
        });

        this.$bus.$on('link-popup-updated', response => {
            if ($('#link-toolbar').css('display') === 'none') {
                return false;
            }

            if(response) {
                let relAttr = [];
                let downloadAttr = '';

                if (response.rel && response.rel.nofollow) {
                    relAttr.push('nofollow');
                }

                if (response.rel && response.rel.sponsored) {
                    relAttr.push('sponsored');
                }

                if (response.rel && response.rel.ugc) {
                    relAttr.push('ugc');
                }

                if (response.target.indexOf('_blank') > -1) {
                    relAttr.push('noopener');
                    relAttr.push('noreferrer');
                }

                if (relAttr.length) {
                    relAttr = ' rel="' + relAttr.join(' ') + '"';
                }

                if (response.downloadAttr && response.url.indexOf('#INTERNAL_LINK#/file/') > -1) {
                    downloadAttr = ' download="download" '
                }

                let linkHTML = `<a href="${response.url}"${response.title}${response.target}${relAttr}${downloadAttr}>${response.text}</a>`;
                tinymce.activeEditor.selection.setContent(linkHTML);
            } else {
                let sel = this.win.getSelection();
                sel.removeAllRanges();
            }

            $('#link-toolbar').css('display', 'none');
            tinymce.activeEditor.selection.collapse();
        });
    },
    methods: {
        init(iframe) {
            this.win = iframe.contentWindow.window;
            $('#link-toolbar').css('display', 'none');
        },

        showLinkPopup () {
            let selectedNode = tinymce.activeEditor.selection.getNode();

            if (selectedNode.tagName === 'IMG' && selectedNode.parentNode && selectedNode.parentNode.tagName === 'A') {
                this.$bus.$emit('init-link-popup', {
                    postID: this.postID,
                    selection: selectedNode.parentNode.outerHTML
                });
            } else {
                this.$bus.$emit('init-link-popup', {
                    postID: this.postID,
                    selection: tinymce.activeEditor.selection.getContent()
                });
            }
        },

        showPreview () {
            let selectedText = tinymce.activeEditor.selection.getContent();
            let link = selectedText.match(/href="(.*?)"/);

            if (link && link[1] && link[1].indexOf('#INTERNAL_LINK#') === -1) {
                let urlToOpen = Utils.getValidUrl(link[1]);

                if (urlToOpen) {
                    mainProcessAPI.shellOpenExternal(urlToOpen);
                } else {
                    alert(this.$t('link.linkInvalidMsg'));
                }
            }
        },

        unlink () {
            tinymce.activeEditor.execCommand('Unlink', false);
            $('#link-toolbar').css('display', 'none');
            tinymce.activeEditor.selection.collapse();
        },

        update(selection, link) {
            if ($('#inline-toolbar').css('display') !== 'none') {
                return;
            }

            if(link) {
                let range = selection.getRangeAt(0);
                let rect = range.getBoundingClientRect();

                $('#link-toolbar').css({
                    display: 'flex',
                    left: this.calculateLeft(rect) + "px",
                    top: (this.calculateTop(rect) + 10) + "px"
                });

                let url = link.outerHTML.match(/href="(.*?)"/);
                let previewButton = $('#link-toolbar-preview')

                if(url && url[1] && url[1].indexOf('#INTERNAL_LINK#') === -1) {
                    previewButton.css('opacity', 1);
                    previewButton.css('cursor', 'pointer');
                    previewButton.attr('title', this.$t('link.previewLinkInBrowser'));
                } else {
                    previewButton.css('opacity', .25);
                    previewButton.css('cursor', 'not-allowed');
                    previewButton.attr('title', this.$t('link.previewOnlyExternalLinksMsg'));
                }
            } else {
                $('#link-toolbar').css('display', 'none');
            }
        },

        calculateTop(rect) {
            let iframe = $('#post-editor_ifr');
            return (rect.top - 60) + iframe.offset().top;
        },

        calculateLeft(rect) {
            let iframe = $('#post-editor_ifr');
            let toolbar = $('#link-toolbar');
            let halfWidth = toolbar.outerWidth() / 2;
            let base = (rect.left + (rect.width / 2) - halfWidth) + iframe.offset().left;

            if(base <= 10) {
                return 10;
            }

            if(base >= window.outerWidth - (base + 10)) {
                return window.outerWidth - (base + 10);
            }

            return base;
        },
    },
    beforeDestroy () {
        this.$bus.$off('init-link-editor');
        this.$bus.$off('update-link-editor');
        this.$bus.$off('link-popup-updated');
    }
}
</script>

<style lang="scss" scoped>

</style>
