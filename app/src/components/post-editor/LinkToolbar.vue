<template>
    <div
        id="link-toolbar"
        contenteditable="false">
        <em
            id="link-toolbar-url"
            @click.stop="showLinkPopup"
            class="tox-icon tox-tbtn__icon-wrap">
            <svg width="24" height="24"><path d="M6.2 12.3a1 1 0 0 1 1.4 1.4l-2.1 2a2 2 0 1 0 2.7 2.8l4.8-4.8a1 1 0 0 0 0-1.4 1 1 0 1 1 1.4-1.3 2.9 2.9 0 0 1 0 4L9.6 20a3.9 3.9 0 0 1-5.5-5.5l2-2zm11.6-.6a1 1 0 0 1-1.4-1.4l2-2a2 2 0 1 0-2.6-2.8L11 10.3a1 1 0 0 0 0 1.4A1 1 0 1 1 9.6 13a2.9 2.9 0 0 1 0-4L14.4 4a3.9 3.9 0 0 1 5.5 5.5l-2 2z" fill-rule="nonzero"></path></svg>
        </em>
        <em
            id="link-toolbar-unurl"
            @click.stop="unlink"
            class="tox-icon tox-tbtn__icon-wrap">
            <svg width="24" height="24"><path d="M6.2 12.3a1 1 0 0 1 1.4 1.4l-2 2a2 2 0 1 0 2.6 2.8l4.8-4.8a1 1 0 0 0 0-1.4 1 1 0 1 1 1.4-1.3 2.9 2.9 0 0 1 0 4L9.6 20a3.9 3.9 0 0 1-5.5-5.5l2-2zm11.6-.6a1 1 0 0 1-1.4-1.4l2.1-2a2 2 0 1 0-2.7-2.8L11 10.3a1 1 0 0 0 0 1.4A1 1 0 1 1 9.6 13a2.9 2.9 0 0 1 0-4L14.4 4a3.9 3.9 0 0 1 5.5 5.5l-2 2zM7.6 6.3a.8.8 0 0 1-1 1.1L3.3 4.2a.7.7 0 1 1 1-1l3.2 3.1zM5.1 8.6a.8.8 0 0 1 0 1.5H3a.8.8 0 0 1 0-1.5H5zm5-3.5a.8.8 0 0 1-1.5 0V3a.8.8 0 0 1 1.5 0V5zm6 11.8a.8.8 0 0 1 1-1l3.2 3.2a.8.8 0 0 1-1 1L16 17zm-2.2 2a.8.8 0 0 1 1.5 0V21a.8.8 0 0 1-1.5 0V19zm5-3.5a.7.7 0 1 1 0-1.5H21a.8.8 0 0 1 0 1.5H19z" fill-rule="nonzero"></path></svg>
        </em>
        <em
            id="link-toolbar-preview"
            @click.stop="showPreview"
            class="tox-icon tox-tbtn__icon-wrap">
            
        </em>
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
                let relAttr = [];

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
