<template>
    <textarea id="post-editor"
              class="post-editor-form-content post-editor-field-content is-hidden"
              data-name="main-content"></textarea>
</template>

<script>
import EditorBridge from './EditorBridge.js';
import { webFrame } from 'electron';

export default {
    name: 'editor',
    data () {
        return {
            editorInstance: false
        };
    },
    methods: {
        init () {
            if (!this.editorInstance) {
                this.editorInstance = new EditorBridge(this.$parent.postID);
            } else {
                this.editorInstance.reloadEditor();
            }
        }
    },
    beforeDestroy () {
        tinymce.remove();
        window.removeEventListener('contextmenu', EditorBridge.spellCheckerContextMenu);
        webFrame.setSpellCheckProvider('', {
            spellCheck () {}
        });
    }
};
</script>

<style lang="scss">
@import '../../scss/variables.scss';
@import '../../scss/mixins.scss';
@import '../../scss/editor-overrides.scss';
</style>
