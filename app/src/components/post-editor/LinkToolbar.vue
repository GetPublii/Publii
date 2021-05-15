<template>
    <div
        id="link-toolbar"
        contenteditable="false">
        <button
            id="link-toolbar-url"
            @click.stop="showLinkPopup"
            class="tox-icon tox-tbtn__icon-wrap">
            <svg width="13" height="13"><path d="M6.23,11.09a1,1,0,0,1-.36,1.37,3.71,3.71,0,0,1-1.42.5,3.31,3.31,0,0,1-.55,0,3.87,3.87,0,0,1-2.35-.8A4,4,0,0,1,.52,11,4,4,0,0,1,0,9.59,3.84,3.84,0,0,1,.12,8.08,4,4,0,0,1,.78,6.66L2.05,5a3.73,3.73,0,0,1,1.16-1,3.71,3.71,0,0,1,1.42-.5,3.63,3.63,0,0,1,1.5.08,3.88,3.88,0,0,1,1.4.68,1,1,0,0,1,.18,1.4,1,1,0,0,1-1.4.19,1.89,1.89,0,0,0-.68-.34,1.74,1.74,0,0,0-.72,0,1.73,1.73,0,0,0-.69.24,2,2,0,0,0-.57.51L2.39,7.85A2,2,0,0,0,2,9.31a2,2,0,0,0,.24.72,1.89,1.89,0,0,0,.51.58,1.72,1.72,0,0,0,.68.33,1.75,1.75,0,0,0,.72,0,1.73,1.73,0,0,0,.69-.24A1,1,0,0,1,6.23,11.09ZM13,3.41A4,4,0,0,0,12.48,2a4,4,0,0,0-1-1.18,3.88,3.88,0,0,0-1.4-.68A3.86,3.86,0,0,0,7.13.54a1,1,0,1,0,1,1.72A1.89,1.89,0,0,1,8.83,2a1.93,1.93,0,0,1,.72,0,1.72,1.72,0,0,1,.68.33,1.89,1.89,0,0,1,.51.58,2,2,0,0,1,.24.71,1.94,1.94,0,0,1,0,.76,1.85,1.85,0,0,1-.33.71L9.35,6.86a2,2,0,0,1-.57.51,1.67,1.67,0,0,1-.69.24,1.74,1.74,0,0,1-.72,0,1.89,1.89,0,0,1-.68-.34A1,1,0,0,0,5.47,8.83a3.88,3.88,0,0,0,1.4.68,3.81,3.81,0,0,0,1,.12,3.31,3.31,0,0,0,.55,0A3.87,3.87,0,0,0,9.79,9.1a3.76,3.76,0,0,0,1.16-1l1.27-1.71a4,4,0,0,0,.66-1.42A3.83,3.83,0,0,0,13,3.41Z" /></svg>
        </button>
        <button
            id="link-toolbar-unurl"
            @click.stop="unlink"
            class="tox-icon tox-tbtn__icon-wrap">
            <svg width="15" height="15"><path d="M6.23,13.09a1,1,0,0,1-.36,1.37,3.71,3.71,0,0,1-1.42.5,3.31,3.31,0,0,1-.55,0,3.87,3.87,0,0,1-2.35-.8A4,4,0,0,1,.52,13,4,4,0,0,1,0,11.59a3.84,3.84,0,0,1,.08-1.51A4,4,0,0,1,.78,8.66L2.05,7a3.73,3.73,0,0,1,1.16-1,3.71,3.71,0,0,1,1.42-.5,3.63,3.63,0,0,1,1.5.08,3.88,3.88,0,0,1,1.4.68,1,1,0,0,1,.18,1.4,1,1,0,0,1-1.4.19,1.89,1.89,0,0,0-.68-.34,1.74,1.74,0,0,0-.72,0,1.73,1.73,0,0,0-.69.24,1.82,1.82,0,0,0-.56.51L2.39,9.85A2,2,0,0,0,2,11.31a2,2,0,0,0,.24.72,1.89,1.89,0,0,0,.51.58,1.72,1.72,0,0,0,.68.33,1.75,1.75,0,0,0,.72,0,1.73,1.73,0,0,0,.69-.24A1,1,0,0,1,6.23,13.09ZM14.6,6.33a3.77,3.77,0,0,0-.94-1.2,4.2,4.2,0,0,0-1.29-.75A6,6,0,0,0,9.76,4a1,1,0,0,0-.92,1.07A1,1,0,0,0,9.91,6a4,4,0,0,1,1.74.24,2.53,2.53,0,0,1,.71.39,1.93,1.93,0,0,1,.45.58,1.83,1.83,0,0,1,.19.72,1.86,1.86,0,0,1-.53,1.39,2,2,0,0,1-.64.47A2.21,2.21,0,0,1,11,10l-2.2.13A2.06,2.06,0,0,1,8,10a2,2,0,0,1-.66-.37,2,2,0,0,1-.46-.59,1,1,0,0,0-1.78.9A3.88,3.88,0,0,0,6,11.17a4,4,0,0,0,1.33.76,4.24,4.24,0,0,0,1.32.21H9l2.2-.14a4.07,4.07,0,0,0,1.54-.39,4.14,4.14,0,0,0,1.24-.91A3.88,3.88,0,0,0,15,7.85,3.77,3.77,0,0,0,14.6,6.33ZM4.11,3.45A1,1,0,0,0,5,4a1,1,0,0,0,.45-.1,1,1,0,0,0,.44-1.35l-1-2a1,1,0,1,0-1.78.9Zm3.44.45A1,1,0,0,0,8,4a1,1,0,0,0,.89-.55l1-2A1,1,0,1,0,8.11.55l-1,2A1,1,0,0,0,7.55,3.9Z" /></svg>
        </button>
        <button
            id="link-toolbar-preview"
            @click.stop="showPreview"
            class="tox-icon tox-tbtn__icon-wrap">
            <svg width="19" height="12"><path d="M19,6l-.3.5A14.93,14.93,0,0,1,15,10.3L12.7,8a4.55,4.55,0,0,0,.5-2A3.88,3.88,0,0,0,9.4,2.1,3.82,3.82,0,0,0,5.6,6,3.82,3.82,0,0,0,9.4,9.9,3.41,3.41,0,0,0,11.8,9l1.9,1.9A8.77,8.77,0,0,1,9.5,12C6,12,2.8,10,.3,6.5L0,6l.3-.5C2.8,2,6,0,9.5,0s6.7,2,9.2,5.5ZM7.5,6a2,2,0,1,0,2-2A2,2,0,0,0,7.5,6Z"/></svg>
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
                    alert('Sorry! This link seems to be invalid.');
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
                    previewButton.attr('title', 'Preview this link in browser');
                } else {
                    previewButton.css('opacity', .25);
                    previewButton.css('cursor', 'not-allowed');
                    previewButton.attr('title', 'You can preview only external links in the post editor');
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
