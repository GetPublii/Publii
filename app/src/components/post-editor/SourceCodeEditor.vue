<template>
    <div :class="{ 'source-code-editor': true, 'is-hidden': !isVisible }">
        <codemirror-editor
            id="source-code-editor"
            ref="codemirror"
            mode="xml">
        </codemirror-editor>
    </div>
</template>

<script>
export default {
    name: 'source-code-editor',
    data () {
        return {
            isVisible: false,
            tinymceHandler: null
        };
    },
    mounted () {
        this.$bus.$on('source-code-editor-show', (content, editor) => {
            this.show(content, editor);
        });
    },
    methods: {
        show (content, editor) {
            this.isVisible = true;
            this.tinymceHandler = editor;

            setTimeout(() => {
                this.$refs.codemirror.editor.setValue(content);
                this.$refs.codemirror.editor.refresh();
                this.$refs.codemirror.editor.focus();
            }, 500);
        },
        applyChanges () {
            this.tinymceHandler.focus();
            this.tinymceHandler.undoManager.transact(() => {
                let content = this.$refs.codemirror.editor.getValue();
                this.tinymceHandler.setContent(content);
            });
            this.tinymceHandler.selection.setCursorLocation();
            this.tinymceHandler.nodeChanged();
            this.$refs.codemirror.editor.setValue('');
            this.$bus.$emit('source-code-editor-close');
            this.isVisible = false;

            let advancedDialog = $('.CodeMirror-advanced-dialog');

            if(advancedDialog.length) {
                advancedDialog.find('.buttons button').last().trigger('click');
            }
        },
        cancelChanges () {
            this.isVisible = false;
            this.$refs.codemirror.editor.setValue('');
            this.$bus.$emit('source-code-editor-close');

            let advancedDialog = $('.CodeMirror-advanced-dialog');

            if(advancedDialog.length) {
                advancedDialog.find('.buttons button').last().trigger('click');
            }
        }
    },
    beforeDestroy () {
        this.$bus.$off('source-code-editor-show');
    }
};
</script>

<style lang="scss" scoped>
@import '../../scss/variables.scss';
@import '../../scss/mixins.scss';

.source-code-editor {
    background: $color-10;
    height: calc(100vh - 8.4rem)!important;
    left: 0;
    overflow: hidden;
    position: absolute;
    top: 8.4rem;
    width: 100vw;
    z-index: 101;

    &.is-hidden {
        display: none;
    }

    .CodeMirror-wrap {
        display: block;
        padding: 0;
        width: 100%;
    }

    .CodeMirror-vscrollbar {
        overflow-y: hidden!important;
    }
}

/*
 * Special styles for win & linux
 */

body[data-os="win"] {
    .source-code-editor {
        height: calc(100vh - 10rem)!important;
        top: 10rem;

        .CodeMirror-wrap {
            height: 100%;
        }
    }
}

body[data-os="linux"] {
    .source-code-editor {
        height: calc(100vh - 6.2rem)!important;
        top: 6.2rem;

        .CodeMirror-wrap {
            height: 100%;
        }
    }
}
</style>
