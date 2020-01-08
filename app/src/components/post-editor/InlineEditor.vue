<template>
    <div
        id="inline-toolbar"
        ref="toolbar"
        contenteditable="false">
       <button
            id="inline-toolbar-bold"
            class="tox-icon tox-tbtn__icon-wrap"
            @click="toggle('bold')">
            <svg width="11" height="13"><path d="M5.67,13h-4a1.66,1.66,0,0,1-1.25-.39A1.64,1.64,0,0,1,0,11.39V1.61A1.69,1.69,0,0,1,.38.38,1.75,1.75,0,0,1,1.63,0H5.92A9.74,9.74,0,0,1,7.56.12,3.45,3.45,0,0,1,8.81.56a3.06,3.06,0,0,1,.83.7,3.13,3.13,0,0,1,.55.93,3.17,3.17,0,0,1,.19,1.07,3,3,0,0,1-2,2.86A3.18,3.18,0,0,1,11,9.29a3.52,3.52,0,0,1-.57,2A3.44,3.44,0,0,1,8.9,12.55a6,6,0,0,1-1.4.35A14,14,0,0,1,5.67,13Zm-3-11V5.34H5.14a4.85,4.85,0,0,0,1.55-.19,1.45,1.45,0,0,0,.83-.71,1.57,1.57,0,0,0,.23-.83A1.3,1.3,0,0,0,7,2.3,5.72,5.72,0,0,0,4.86,2ZM5.47,7.23H2.68V11H5.56c1.82,0,2.72-.64,2.72-1.92a1.56,1.56,0,0,0-.7-1.43A4,4,0,0,0,5.47,7.23Z"/></svg>
        </button>
        <button
            id="inline-toolbar-italic"
            class="tox-icon tox-tbtn__icon-wrap"
            @click="toggle('italic')">
            <svg width="10" height="13"><path d="M10,1A1,1,0,0,1,9,2H8.11l-4,9H5a1,1,0,0,1,0,2H1a1,1,0,0,1,0-2h.89l4-9H5A1,1,0,0,1,5,0H9A1,1,0,0,1,10,1Z" /></svg>
        </button>
        <button
            id="inline-toolbar-underline"
            class="tox-icon tox-tbtn__icon-wrap"
            @click="toggle('underline')">
            <svg width="10" height="14"><path d="M10,1V6.32A4.87,4.87,0,0,1,5,11H4.77A4.84,4.84,0,0,1,0,6.36V1A1,1,0,0,1,2,1V6.32A2.85,2.85,0,0,0,5,9,2.88,2.88,0,0,0,8,6.27V1a1,1,0,0,1,2,0ZM9,12H1a1,1,0,0,0,0,2H9a1,1,0,0,0,0-2Z" /></svg>
        </button>
        <button
            id="inline-toolbar-strikethrough"
            class="tox-icon tox-tbtn__icon-wrap"
            @click="toggle('strikethrough')">
            <svg width="12" height="14"><path d="M12,6.5a.5.5,0,0,1-.5.5H9.45l.14.09a3.52,3.52,0,0,1,.61.61A3.71,3.71,0,0,1,11,10.43,3.75,3.75,0,0,1,9.6,12.91,4.91,4.91,0,0,1,6.5,14a5,5,0,0,1-3.11-1.1A3.79,3.79,0,0,1,2,10a1,1,0,1,1,2,0,1.8,1.8,0,0,0,.66,1.36,2.92,2.92,0,0,0,3.68,0A1.69,1.69,0,0,0,9,10.2a1.72,1.72,0,0,0-.36-1.26,1.48,1.48,0,0,0-.28-.28A3.15,3.15,0,0,0,6.48,8h0A5.16,5.16,0,0,1,3.55,7H.5a.5.5,0,0,1,0-1H2.63A3.69,3.69,0,0,1,2,4,3.8,3.8,0,0,1,3.39,1.1a4.92,4.92,0,0,1,6.21,0A1,1,0,1,1,8.34,2.65a2.92,2.92,0,0,0-3.68,0A1.79,1.79,0,0,0,4,4a1.77,1.77,0,0,0,.66,1.33A3.21,3.21,0,0,0,6.52,6h5A.5.5,0,0,1,12,6.5Z" /></svg>
        </button>
        <button
            id="inline-toolbar-url"
            class="tox-icon tox-tbtn__icon-wrap"
            @click="addLink">
            <svg width="13" height="13"><path d="M6.23,11.09a1,1,0,0,1-.36,1.37,3.71,3.71,0,0,1-1.42.5,3.31,3.31,0,0,1-.55,0,3.87,3.87,0,0,1-2.35-.8A4,4,0,0,1,.52,11,4,4,0,0,1,0,9.59,3.84,3.84,0,0,1,.12,8.08,4,4,0,0,1,.78,6.66L2.05,5a3.73,3.73,0,0,1,1.16-1,3.71,3.71,0,0,1,1.42-.5,3.63,3.63,0,0,1,1.5.08,3.88,3.88,0,0,1,1.4.68,1,1,0,0,1,.18,1.4,1,1,0,0,1-1.4.19,1.89,1.89,0,0,0-.68-.34,1.74,1.74,0,0,0-.72,0,1.73,1.73,0,0,0-.69.24,2,2,0,0,0-.57.51L2.39,7.85A2,2,0,0,0,2,9.31a2,2,0,0,0,.24.72,1.89,1.89,0,0,0,.51.58,1.72,1.72,0,0,0,.68.33,1.75,1.75,0,0,0,.72,0,1.73,1.73,0,0,0,.69-.24A1,1,0,0,1,6.23,11.09ZM13,3.41A4,4,0,0,0,12.48,2a4,4,0,0,0-1-1.18,3.88,3.88,0,0,0-1.4-.68A3.86,3.86,0,0,0,7.13.54a1,1,0,1,0,1,1.72A1.89,1.89,0,0,1,8.83,2a1.93,1.93,0,0,1,.72,0,1.72,1.72,0,0,1,.68.33,1.89,1.89,0,0,1,.51.58,2,2,0,0,1,.24.71,1.94,1.94,0,0,1,0,.76,1.85,1.85,0,0,1-.33.71L9.35,6.86a2,2,0,0,1-.57.51,1.67,1.67,0,0,1-.69.24,1.74,1.74,0,0,1-.72,0,1.89,1.89,0,0,1-.68-.34A1,1,0,0,0,5.47,8.83a3.88,3.88,0,0,0,1.4.68,3.81,3.81,0,0,0,1,.12,3.31,3.31,0,0,0,.55,0A3.87,3.87,0,0,0,9.79,9.1a3.76,3.76,0,0,0,1.16-1l1.27-1.71a4,4,0,0,0,.66-1.42A3.83,3.83,0,0,0,13,3.41Z" /></svg>
        </button>
        <button
            id="inline-toolbar-unurl"
            class="tox-icon tox-tbtn__icon-wrap"
            @click="unLink">
            <svg width="15" height="15"><path d="M6.23,13.09a1,1,0,0,1-.36,1.37,3.71,3.71,0,0,1-1.42.5,3.31,3.31,0,0,1-.55,0,3.87,3.87,0,0,1-2.35-.8A4,4,0,0,1,.52,13,4,4,0,0,1,0,11.59a3.84,3.84,0,0,1,.08-1.51A4,4,0,0,1,.78,8.66L2.05,7a3.73,3.73,0,0,1,1.16-1,3.71,3.71,0,0,1,1.42-.5,3.63,3.63,0,0,1,1.5.08,3.88,3.88,0,0,1,1.4.68,1,1,0,0,1,.18,1.4,1,1,0,0,1-1.4.19,1.89,1.89,0,0,0-.68-.34,1.74,1.74,0,0,0-.72,0,1.73,1.73,0,0,0-.69.24,1.82,1.82,0,0,0-.56.51L2.39,9.85A2,2,0,0,0,2,11.31a2,2,0,0,0,.24.72,1.89,1.89,0,0,0,.51.58,1.72,1.72,0,0,0,.68.33,1.75,1.75,0,0,0,.72,0,1.73,1.73,0,0,0,.69-.24A1,1,0,0,1,6.23,13.09ZM14.6,6.33a3.77,3.77,0,0,0-.94-1.2,4.2,4.2,0,0,0-1.29-.75A6,6,0,0,0,9.76,4a1,1,0,0,0-.92,1.07A1,1,0,0,0,9.91,6a4,4,0,0,1,1.74.24,2.53,2.53,0,0,1,.71.39,1.93,1.93,0,0,1,.45.58,1.83,1.83,0,0,1,.19.72,1.86,1.86,0,0,1-.53,1.39,2,2,0,0,1-.64.47A2.21,2.21,0,0,1,11,10l-2.2.13A2.06,2.06,0,0,1,8,10a2,2,0,0,1-.66-.37,2,2,0,0,1-.46-.59,1,1,0,0,0-1.78.9A3.88,3.88,0,0,0,6,11.17a4,4,0,0,0,1.33.76,4.24,4.24,0,0,0,1.32.21H9l2.2-.14a4.07,4.07,0,0,0,1.54-.39,4.14,4.14,0,0,0,1.24-.91A3.88,3.88,0,0,0,15,7.85,3.77,3.77,0,0,0,14.6,6.33ZM4.11,3.45A1,1,0,0,0,5,4a1,1,0,0,0,.45-.1,1,1,0,0,0,.44-1.35l-1-2a1,1,0,1,0-1.78.9Zm3.44.45A1,1,0,0,0,8,4a1,1,0,0,0,.89-.55l1-2A1,1,0,1,0,8.11.55l-1,2A1,1,0,0,0,7.55,3.9Z" /></svg>
        </button>

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
                :value="'custom-' + format.title.toLowerCase()"
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

                if (tinymce.activeEditor.selection.getContent() === '') {
                    tinymce.activeEditor.insertContent(linkHTML);
                } else {
                    tinymce.activeEditor.selection.setContent('');
                    tinymce.activeEditor.selection.setContent(linkHTML);
                }

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
                    tinymce.activeEditor.formatter.remove('custom-' + this.customFormats[i].title.toLowerCase());
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
                    let name = 'custom-' + this.customFormats[i].title.toLowerCase();
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
