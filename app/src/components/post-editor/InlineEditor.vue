<template>
    <div
        id="inline-toolbar"
        ref="toolbar"
        contenteditable="false"
        @click.stop>
       <button
            id="inline-toolbar-bold"
            class="tox-icon tox-tbtn__icon-wrap"
            @click="toggle('bold')">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"></path><path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"></path></svg>
        </button>
        <button
            id="inline-toolbar-italic"
            class="tox-icon tox-tbtn__icon-wrap"
            @click="toggle('italic')">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="4" x2="10" y2="4"></line><line x1="14" y1="20" x2="5" y2="20"></line><line x1="15" y1="4" x2="9" y2="20"></line></svg>
        </button>
        <button
            id="inline-toolbar-underline"
            class="tox-icon tox-tbtn__icon-wrap"
            @click="toggle('underline')">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 4v6a6 6 0 0 0 12 0V4"></path><line x1="4" y1="20" x2="20" y2="20"></line></svg>
        </button>
        <button
            id="inline-toolbar-strikethrough"
            class="tox-icon tox-tbtn__icon-wrap"
            @click="toggle('strikethrough')">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4H9a3 3 0 0 0-2.83 4"></path><path d="M14 12a4 4 0 0 1 0 8H6"></path><line x1="4" y1="12" x2="20" y2="12"></line></svg>
        </button>
        <button
            id="inline-toolbar-url"
            class="tox-icon tox-tbtn__icon-wrap"
            @click="addLink">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
        </button>
        <button
            id="inline-toolbar-unurl"
            class="tox-icon tox-tbtn__icon-wrap"
            @click="unLink">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m18.84 12.25 1.72-1.71h-.02a5.004 5.004 0 0 0-.12-7.07 5.006 5.006 0 0 0-6.95 0l-1.72 1.71"></path><path d="m5.17 11.75-1.71 1.71a5.004 5.004 0 0 0 .12 7.07 5.006 5.006 0 0 0 6.95 0l1.71-1.71"></path><line x1="8" y1="2" x2="8" y2="5"></line><line x1="2" y1="8" x2="5" y2="8"></line><line x1="16" y1="19" x2="16" y2="22"></line><line x1="19" y1="16" x2="22" y2="16"></line></svg>
        </button>
    </div>
</template>

<script>
export default {
    name: 'inline-editor',
    data () {
        return {
            win: null,
            doc: null,
            body: null,
            customFormats: []
        };
    },
    mounted () {
        this.$bus.$on('init-inline-editor', customFormats => {
            this.init(customFormats);
        });

        this.$bus.$on('update-inline-editor', config => {
            this.update(config.sel, config.text);
        });

        this.$bus.$on('link-popup-updated', response => {
            if ($(this.$refs.toolbar).css('display') === 'none') {
                return;
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

                let linkHTMLStart = `<a href="${response.url}"${response.title}${response.target}${relAttr}>`;
                let linkHTMLContent = response.text;
                let linkHTMLEnd = `</a>`;

                if (linkHTMLContent === '') {
                    linkHTMLContent = tinymce.activeEditor.selection.getContent();
                }

                tinymce.activeEditor.selection.setContent(linkHTMLStart + linkHTMLContent + linkHTMLEnd);

                setTimeout(() => {
                    this.updateLinkButtons();
                }, 200);
            }
        });
    },
    methods: {
        init () {
            let iframe = document.getElementById('post-editor_ifr');
            this.win = iframe.contentWindow.window;
            this.doc = this.win.document;
            this.body = this.doc.body;
        },

        toggle (format) {
            tinymce.activeEditor.formatter.toggle(format);
        },

        addLink () {
            this.$bus.$emit('init-link-popup', {
                postID: this.postID,
                selection: tinymce.activeEditor.selection.getContent()
            });
        },

        unLink () {
            tinymce.activeEditor.execCommand('Unlink', false);

            setTimeout(() => {
                this.updateLinkButtons();
            }, 100);
        },

        update (sel, text) {
            if ($('#link-toolbar').css('display') !== 'none') {
                return;
            }

            if(text.trim() !== '') {
                let range = sel.getRangeAt(0);
                let rect = range.getBoundingClientRect();

                $(this.$refs.toolbar).css({
                    display: 'flex',
                    left: this.calculateLeft(rect) + "px",
                    top: this.calculateTop(rect) + "px"
                });

                this.updateLinkButtons();
            } else {
                $(this.$refs.toolbar).css('display', 'none');
            }
        },

        calculateTop(rect) {
            let iframe = $('#post-editor_ifr');
            return (rect.top - 60) + iframe.offset().top;
        },

        calculateLeft(rect) {
            let iframe = $('#post-editor_ifr');
            let toolbar = $('#inline-toolbar');
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

        updateLinkButtons() {
            let selectedContent = tinymce.activeEditor.selection.getContent();

            if(this.textContainsLink(selectedContent)) {
                $('#inline-toolbar-url').css('display', 'none');
                $('#inline-toolbar-unurl').css('display', 'inline-flex');
            } else {
                $('#inline-toolbar-url').css('display', 'inline-flex');
                $('#inline-toolbar-unurl').css('display', 'none');
            }
        },

        textContainsLink(text) {
            return text.indexOf('<a href=') !== -1;
        }
    },
    beforeDestroy () {
        this.$bus.$off('init-link-editor');
        this.$bus.$off('update-link-editor');
        this.$bus.$off('link-popup-updated');
    }
}
</script>

<style lang="scss" scoped>
@import '../../scss/variables.scss';
@import '../../scss/mixins.scss';
</style>
