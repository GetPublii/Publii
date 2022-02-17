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

                if (this.$store.state.app.config.experimentalFeatureAppAutoBeautifySourceCode) {
                    this.$bus.$emit('source-code-editor-beautify-code');
                }
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
    background: var(--bg-primary);
    height: calc(100vh - 10rem)!important;
    left: 0;   
    overflow: hidden;
    position: absolute;
    top: 10rem;
    width: 100vw;
    z-index: 99999;
    
    &::before {
        background: var(--bg-primary);
        content: "";        
        height: 10rem;
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;         
    }

    &.is-hidden {
        display: none;
    }

    .CodeMirror-wrap {
        display: block;
        min-height: calc(100vh - 10rem); 
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

body[data-os="linux"] {
    .source-code-editor {
        height: calc(100vh - 6rem)!important;
        top: 6rem;
        
        &::before {
            height: 6rem;            
        }

        .CodeMirror-wrap {
            min-height: calc(100vh - 6rem);
        }
    }
}
</style>
