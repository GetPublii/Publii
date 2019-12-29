<template>
    <div
        id="inline-toolbar"
        ref="toolbar"
        contenteditable="false">
        <em
            id="inline-toolbar-bold"
            class="tox-icon tox-tbtn__icon-wrap"
            @click="toggle('bold')">
            <svg width="24" height="24"><path d="M7.8 19c-.3 0-.5 0-.6-.2l-.2-.5V5.7c0-.2 0-.4.2-.5l.6-.2h5c1.5 0 2.7.3 3.5 1 .7.6 1.1 1.4 1.1 2.5a3 3 0 0 1-.6 1.9c-.4.6-1 1-1.6 1.2.4.1.9.3 1.3.6s.8.7 1 1.2c.4.4.5 1 .5 1.6 0 1.3-.4 2.3-1.3 3-.8.7-2.1 1-3.8 1H7.8zm5-8.3c.6 0 1.2-.1 1.6-.5.4-.3.6-.7.6-1.3 0-1.1-.8-1.7-2.3-1.7H9.3v3.5h3.4zm.5 6c.7 0 1.3-.1 1.7-.4.4-.4.6-.9.6-1.5s-.2-1-.7-1.4c-.4-.3-1-.4-2-.4H9.4v3.8h4z" fill-rule="evenodd"></path></svg>
        </em>
        <em
            id="inline-toolbar-italic"
            class="tox-icon tox-tbtn__icon-wrap"
            @click="toggle('italic')">
            <path d="M16.7 4.7l-.1.9h-.3c-.6 0-1 0-1.4.3-.3.3-.4.6-.5 1.1l-2.1 9.8v.6c0 .5.4.8 1.4.8h.2l-.2.8H8l.2-.8h.2c1.1 0 1.8-.5 2-1.5l2-9.8.1-.5c0-.6-.4-.8-1.4-.8h-.3l.2-.9h5.8z" fill-rule="evenodd"></path> 
        </em>
        <em
            id="inline-toolbar-underline"
            class="tox-icon tox-tbtn__icon-wrap"
            @click="toggle('underline')">
            <svg width="24" height="24"><path d="M16 5c.6 0 1 .4 1 1v5.5a4 4 0 0 1-.4 1.8l-1 1.4a5.3 5.3 0 0 1-5.5 1 5 5 0 0 1-1.6-1c-.5-.4-.8-.9-1.1-1.4a4 4 0 0 1-.4-1.8V6c0-.6.4-1 1-1s1 .4 1 1v5.5c0 .3 0 .6.2 1l.6.7a3.3 3.3 0 0 0 2.2.8 3.4 3.4 0 0 0 2.2-.8c.3-.2.4-.5.6-.8l.2-.9V6c0-.6.4-1 1-1zM8 17h8c.6 0 1 .4 1 1s-.4 1-1 1H8a1 1 0 0 1 0-2z" fill-rule="evenodd"></path></svg>
        </em>
        <em
            id="inline-toolbar-strikethrough"
            class="tox-icon tox-tbtn__icon-wrap"
            @click="toggle('strikethrough')">
            <svg width="24" height="24"><g fill-rule="evenodd"><path d="M15.6 8.5c-.5-.7-1-1.1-1.3-1.3-.6-.4-1.3-.6-2-.6-2.7 0-2.8 1.7-2.8 2.1 0 1.6 1.8 2 3.2 2.3 4.4.9 4.6 2.8 4.6 3.9 0 1.4-.7 4.1-5 4.1A6.2 6.2 0 0 1 7 16.4l1.5-1.1c.4.6 1.6 2 3.7 2 1.6 0 2.5-.4 3-1.2.4-.8.3-2-.8-2.6-.7-.4-1.6-.7-2.9-1-1-.2-3.9-.8-3.9-3.6C7.6 6 10.3 5 12.4 5c2.9 0 4.2 1.6 4.7 2.4l-1.5 1.1z"></path><path d="M5 11h14a1 1 0 0 1 0 2H5a1 1 0 0 1 0-2z" fill-rule="nonzero"></path></g></svg>
        </em>
        <em
            id="inline-toolbar-url"
            class="tox-icon tox-tbtn__icon-wrap"
            @click="addLink">
            <svg width="24" height="24"><path d="M6.2 12.3a1 1 0 0 1 1.4 1.4l-2.1 2a2 2 0 1 0 2.7 2.8l4.8-4.8a1 1 0 0 0 0-1.4 1 1 0 1 1 1.4-1.3 2.9 2.9 0 0 1 0 4L9.6 20a3.9 3.9 0 0 1-5.5-5.5l2-2zm11.6-.6a1 1 0 0 1-1.4-1.4l2-2a2 2 0 1 0-2.6-2.8L11 10.3a1 1 0 0 0 0 1.4A1 1 0 1 1 9.6 13a2.9 2.9 0 0 1 0-4L14.4 4a3.9 3.9 0 0 1 5.5 5.5l-2 2z" fill-rule="nonzero"></path></svg>
        </em>
        <em
            id="inline-toolbar-unurl"
            class="tox-icon tox-tbtn__icon-wrap"
            @click="unLink">
            <svg width="24" height="24"><path d="M6.2 12.3a1 1 0 0 1 1.4 1.4l-2 2a2 2 0 1 0 2.6 2.8l4.8-4.8a1 1 0 0 0 0-1.4 1 1 0 1 1 1.4-1.3 2.9 2.9 0 0 1 0 4L9.6 20a3.9 3.9 0 0 1-5.5-5.5l2-2zm11.6-.6a1 1 0 0 1-1.4-1.4l2.1-2a2 2 0 1 0-2.7-2.8L11 10.3a1 1 0 0 0 0 1.4A1 1 0 1 1 9.6 13a2.9 2.9 0 0 1 0-4L14.4 4a3.9 3.9 0 0 1 5.5 5.5l-2 2zM7.6 6.3a.8.8 0 0 1-1 1.1L3.3 4.2a.7.7 0 1 1 1-1l3.2 3.1zM5.1 8.6a.8.8 0 0 1 0 1.5H3a.8.8 0 0 1 0-1.5H5zm5-3.5a.8.8 0 0 1-1.5 0V3a.8.8 0 0 1 1.5 0V5zm6 11.8a.8.8 0 0 1 1-1l3.2 3.2a.8.8 0 0 1-1 1L16 17zm-2.2 2a.8.8 0 0 1 1.5 0V21a.8.8 0 0 1-1.5 0V19zm5-3.5a.7.7 0 1 1 0-1.5H21a.8.8 0 0 1 0 1.5H19z" fill-rule="nonzero"></path></svg>
        </em>

        <select
            id="inline-toolbar-style"
            ref="inline-toolbar-style"
            @change="applyStyle">
            <option value="">Select style</option>
            <option value="p">Paragraph</option>
            <option value="h2">Heading 2</option>
            <option value="h3">Heading 3</option>
            <option value="h4">Heading 4</option>
            <option value="code">Code</option>
            <option value="pre">Pre</option>
            <option value="blockquote">Blockquote</option>
        </select>

        <select
            v-if="customFormats.length"
            id="inline-toolbar-format"
            ref="inline-toolbar-format"
            @change="applyFormat">
            <option value="">Select style</option>
            <option
                v-for="(format, index) in customFormats"
                :value="format.name"
                :key="'format-' + index">
                {{ format.title }}
            </option>
            <option value="-">Remove styles</option>
        </select>
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

                let linkHTML = `<a href="${response.url}"${response.title}${response.target}${relAttr}>${response.text}</a>`;
                tinymce.activeEditor.selection.setContent('');
                tinymce.activeEditor.selection.setContent(linkHTML);

                setTimeout(() => {
                    this.updateLinkButtons();
                }, 200);
            }
        });
    },
    methods: {
        init(customFormats) {
            let iframe = document.getElementById('post-editor_ifr');
            this.win = iframe.contentWindow.window;
            this.doc = this.win.document;
            this.body = this.doc.body;
            this.customFormats = customFormats;
        },

        applyStyle (e) {
            tinymce.activeEditor.execCommand('FormatBlock', false, $(e.target).val());
        },

        applyFormat (e) {
            if($(e.target).val() !== '-') {
                tinymce.activeEditor.execCommand('mceToggleFormat', false, $(e.target).val());
            } else {
                for(let i = 0; i < this.customFormats.length; i++) {
                    tinymce.activeEditor.formatter.remove(this.customFormats[i].name);
                }

                $(this.$refs['inline-toolbar-format']).val('');
            }
        },

        toggle (format) {
            tinymce.activeEditor.formatter.toggle(format);
        },

        addLink () {
            let sel = this.win.getSelection();
            let selectedText = sel.getRangeAt(0);

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
            if(text.trim() !== '') {
                let range = sel.getRangeAt(0);
                let rect = range.getBoundingClientRect();

                $(this.$refs.toolbar).css({
                    display: 'block',
                    left: this.calculateLeft(rect) + "px",
                    top: this.calculateTop(rect) + "px"
                });

                let currentTag = tinymce.activeEditor.selection.getNode().nodeName.toLowerCase();

                if(currentTag !== 'body') {
                    $(this.$refs['inline-toolbar-style']).val(currentTag);
                } else {
                    $(this.$refs['inline-toolbar-style']).val('');
                }

                if(['body', 'p', 'code', 'pre', 'h2', 'h3', 'h4', 'blockquote'].indexOf(currentTag) === -1) {
                    $(this.$refs['inline-toolbar-style']).css('display', 'none');
                } else {
                    $(this.$refs['inline-toolbar-style']).css('display', 'inline');
                }

                let formatSet = false;

                for(let i = 0; i < this.customFormats.length; i++) {
                    let name = this.customFormats[i].name;
                    let status = tinymce.activeEditor.formatter.canApply(name);
                    $(this.$refs['inline-toolbar-format']).find('option[value="' + name + '"]').prop('disabled', !status);

                    if(tinymce.activeEditor.formatter.match(name)) {
                        $(this.$refs['inline-toolbar-format']).val(name);
                        formatSet = true;
                    }
                }

                if(!formatSet) {
                    $(this.$refs['inline-toolbar-format']).val('');
                }

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
                $('#inline-toolbar-unurl').css('display', 'inline-block');
            } else {
                $('#inline-toolbar-url').css('display', 'inline-block');
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
