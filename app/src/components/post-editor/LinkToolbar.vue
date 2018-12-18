<template>
    <div
        id="link-toolbar"
        contenteditable="false">
        <em
            id="link-toolbar-url"
            @click.stop="showLinkPopup"
            class="mce-ico mce-i-link"></em>
        <em
            id="link-toolbar-unurl"
            @click.stop="unlink"
            class="mce-ico mce-i-unlink"></em>
        <em
            id="link-toolbar-preview"
            @click.stop="showPreview"
            class="mce-ico mce-i-preview"></em>
    </div>
</template>

<script>
import { shell } from 'electron';

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
                let relAttr = '';

                if (response.rel) {
                    relAttr = ' rel="nofollow"';
                }

                let linkHTML = `<a href="${response.url}"${response.title}${response.target}${relAttr}>${response.text}</a>`;
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
            this.$bus.$emit('init-link-popup', {
                postID: this.postID,
                selection: tinymce.activeEditor.selection.getContent()
            });
        },

        showPreview () {
            let selectedText = tinymce.activeEditor.selection.getContent();
            let link = selectedText.match(/href="(.*?)"/);

            if(link && link[1] && link[1].indexOf('#INTERNAL_LINK#') === -1) {
                shell.openExternal(link[1]);
            }
        },

        unlink () {
            tinymce.activeEditor.execCommand('Unlink', false);
            $('#link-toolbar').css('display', 'none');
            tinymce.activeEditor.selection.collapse();
        },

        update(selection, link) {
            if(link) {
                let range = selection.getRangeAt(0);
                let rect = range.getBoundingClientRect();

                $('#link-toolbar').css({
                    display: 'block',
                    left: this.calculateLeft(rect) + "px",
                    top: (this.calculateTop(rect) + 10) + "px"
                });

                let url = link.outerHTML.match(/href="(.*?)"/);
                let previewButton = $('#link-toolbar-preview')

                if(url && url[1] && url[1].indexOf('#INTERNAL_LINK#') === -1) {
                    previewButton.css('opacity', 1);
                    previewButton.attr('title', 'Preview this link in browser');
                } else {
                    previewButton.css('opacity', .25);
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
