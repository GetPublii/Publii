<template>
    <textarea
        :id="id"
        spellcheck="false"
        ref="textarea"></textarea>
</template>

<script>
import beautify from 'js-beautify';
import CodeMirror from 'codemirror';
import cssMode from '../../assets/vendor/js/codemirror/css.js';
import xmlMode from '../../assets/vendor/js/codemirror/xml.js';

import CodeMirrorJumpToLine from '../../../node_modules/codemirror/addon/search/jump-to-line.js';
import CodeMirrorSearch from '../../../node_modules/codemirror/addon/search/search.js';
import CodeMirrorMatchHighlighter from '../../../node_modules/codemirror/addon/search/match-highlighter.js';
import CodeMirrorMatchesOnScrollbar from '../../../node_modules/codemirror/addon/search/matchesonscrollbar.js';
import CodeMirrorSearchCursor from '../../../node_modules/codemirror/addon/search/searchcursor.js';
import CodeMirrorAnnotateScrollbar from '../../../node_modules/codemirror/addon/scroll/annotatescrollbar.js';
import CodeMirrorScrollPastend from '../../../node_modules/codemirror/addon/scroll/scrollpastend.js';
import CodeMirrorSimpleScrollbars from '../../../node_modules/codemirror/addon/scroll/simplescrollbars.js';
import CodeMirrorPanel from '../../../node_modules//codemirror/addon/display/panel.js';
import CodeMirrorAdvancedDialog from '../../../node_modules/codemirror-advanceddialog/dist/advanced-dialog.js';
import CodeMirrorRevisedSearch from '../../../node_modules/codemirror-revisedsearch/dist/revised-search.js';

export default {
    name: 'codemirroreditor',
    props: {
        id: {
            default: '',
            type: String
        },
        mode: {
            default: 'text',
            type: String
        },
        readonly: {
            default: false,
            type: Boolean
        },
        editorLoadedEventName: {
            default: 'editor-loaded',
            type: String
        }
    },
    data: function() {
        return {
            editor: null
        };
    },
    mounted: function() {
        setTimeout(() => {
            this.initEditor();
        }, 0);

        this.$bus.$on('source-code-editor-beautify-code', this.beautifyCode);
    },
    methods: {
        initEditor () {
            this.editor = CodeMirror.fromTextArea(
                this.$refs['textarea'],
                {
                    lineWrapping: true,
                    lineNumbers: true,
                    matchBrackets: true,
                    styleActiveLine: true,
                    autoRefresh: true,
                    mode: this.mode,
                    htmlMode: this.mode === 'xml',
                    readOnly: this.readonly,
                    smartIndent: !!this.$store.state.currentSite.config.advanced.editors.codemirrorAutoIndent,
                    autoIndent: !!this.$store.state.currentSite.config.advanced.editors.codemirrorAutoIndent,
                    indentUnit: +this.$store.state.currentSite.config.advanced.editors.codemirrorTabSize,
                    tabSize: +this.$store.state.currentSite.config.advanced.editors.codemirrorTabSize
                }
            );

            this.$bus.$emit(this.editorLoadedEventName, true);
        },
        beautifyCode () {
            let editorContent = this.editor.getValue();
            editorContent = beautify.html(editorContent, { indent_with_tabs: true });
            this.editor.setValue(editorContent);
            this.editor.refresh();
        }
    },
    beforeDestroy () {
        this.$bus.$off('source-code-editor-beautify-code', this.beautifyCode);
    }
}
</script>

<style lang="scss">
@import '../../scss/variables.scss';
@import '../../assets/vendor/css/codemirror.css';
@import '../../../node_modules/codemirror-advanceddialog/dist/dialog.css';

.CodeMirror {
    border: 1px solid var(--input-border-color);
}

// Search + Search and Replace popup in Code Mirror
.CodeMirror-advanced-dialog {
    background: var(--input-bg-light);
    border: none;
    bottom: 0;
    box-shadow: 0 0 0 1px var(--input-border-color);
    display: block;
    left: 0;
    padding: 2rem 5rem 1rem;
    position: fixed;
    width: 100%;
    z-index: 102;

    & > .row {
        clear: left;
        display: block;
        float: left;
        width: calc(100% - 340px);

        & > label {
            float: left;
            padding: 9px 0;
            width: 80px;
        }

        & > input {
            background: var(--input-bg);
            border: 1px solid var(--input-border-color);
            border-radius: 30px;
            box-shadow: none!important;            
            float: left;
            font-family: var(--font-base);
            margin: 0;
            padding: 1rem 2rem;
            width: calc(100% - 80px);
        }

        & > .CodeMirror-search-hint {
            float: right;
            font-size: 11px;
            margin: 5px 0;
        }

        & > .CodeMirror-search-count {
            display: block;
            float: left;
            font-size: 11px;
            margin: 5px 0 5px 80px;
        }
    }

    .buttons {
        position: absolute;
        right: 5rem;
        text-align: right;
        width: 350px;

        button {
            background: var(--button-secondary-bg);
            border: none;
            border-radius: var(--border-radius);
            box-shadow: none;
            color: var(--button-secondary-color);
            cursor: pointer;
            display: inline-block;
            font: {
                size: 1.4rem;
                family: var(--font-base);
                weight: 500;
            }
            height: 3.8rem;
            line-height: 3.8rem;
            margin: 2px 2px 30px;
            padding: 0 1rem;
            position: relative;
            transition: var(--transition);
            user-select: none;
            white-space: nowrap;

            &:focus {
                outline: none;
            }

            &:active,
            &:focus,
            &:hover {
                background: var(--button-secondary-bg-hover);
                color: var(--button-secondary-color-hover);
            }

            &:last-child {
                background: transparent;
                box-shadow: inset 0 0 0 2px var(--input-border-color);
                color: var(--text-primary-color);

                &:active,
                &:focus,
                &:hover {
                    background: transparent;
                    box-shadow: inset 0 0 0 2px var(--gray-3);
                    color: var(--text-primary-color);
                }
            }
        }
    }
}
</style>
