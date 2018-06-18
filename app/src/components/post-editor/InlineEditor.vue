<template>
    <div
        id="inline-toolbar"
        ref="toolbar"
        contenteditable="false">
        <em
            id="inline-toolbar-bold"
            class="mce-ico mce-i-bold"
            @click="toggle('bold')"></em>
        <em
            id="inline-toolbar-italic"
            class="mce-ico mce-i-italic"
            @click="toggle('italic')"></em>
        <em
            id="inline-toolbar-underline"
            class="mce-ico mce-i-underline"
            @click="toggle('underline')"></em>
        <em
            id="inline-toolbar-strikethrough"
            class="mce-ico mce-i-strikethrough"
            @click="toggle('strikethrough')"></em>
        <em
            id="inline-toolbar-url"
            class="mce-ico mce-i-link"
            @click="addLink"></em>
        <em
            id="inline-toolbar-unurl"
            class="mce-ico mce-i-unlink"
            @click="unLink"></em>

        <select
            id="inline-toolbar-style"
            ref="inline-toolbar-style"
            @change="applyStyle">
            <option value="">Select style</option>
            <option value="p">Paragraph</option>
            <option value="h2">Header 2</option>
            <option value="h3">Header 3</option>
            <option value="h4">Header 4</option>
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
                let linkHTML = `<a href="${response.url}"${response.title}${response.target}>${response.text}</a>`;
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
