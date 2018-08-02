<template>
    <textarea
        :id="id"
        ref="textarea"></textarea>
</template>

<script>
import CodeMirror from 'codemirror';
import cssMode from '../../assets/vendor/js/codemirror/css.js';
import xmlMode from '../../assets/vendor/js/codemirror/xml.js';

import CodeMirrorJumpToLine from '../../../node_modules//codemirror/addon/search/jump-to-line.js';
import CodeMirrorSearch from '../../../node_modules//codemirror/addon/search/search.js';
import CodeMirrorMatchHighlighter from '../../../node_modules//codemirror/addon/search/match-highlighter.js';
import CodeMirrorMatchesOnScrollbar from '../../../node_modules//codemirror/addon/search/matchesonscrollbar.js';
import CodeMirrorSearchCursor from '../../../node_modules//codemirror/addon/search/searchcursor.js';
import CodeMirrorAnnotateScrollbar from '../../../node_modules//codemirror/addon/scroll/annotatescrollbar.js';
import CodeMirrorScrollPastend from '../../../node_modules//codemirror/addon/scroll/scrollpastend.js';
import CodeMirrorSimpleScrollbars from '../../../node_modules//codemirror/addon/scroll/simplescrollbars.js';
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
    },
    methods: {
        initEditor: function() {
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
                    readOnly: this.readonly
                }
            );

            this.$bus.$emit(this.editorLoadedEventName, true);
        }
    }
}
</script>

<style lang="scss">
@import '../../scss/variables.scss';
@import '../../assets/vendor/css/codemirror.css';
@import '../../../node_modules/codemirror-advanceddialog/dist/dialog.css';

.CodeMirror {
    border: 1px solid $color-8;
}

// Search + Search and Replace popup in Code Mirror
.CodeMirror-advanced-dialog {
    background: $color-10;
    border: none;
    bottom: 0;
    box-shadow: 0 0 10px rgba(0, 0, 0, .25);
    display: block;
    left: 0;
    padding: 2rem 5rem 1rem;
    position: absolute;
    width: 100%;
    z-index: 102;

    & > .row {
        display: block;
        float: left;
        width: calc(100% - 360px);

        & > label {
            float: left;
            padding: 9px 0;
            width: 80px;
        }

        & > input {
            float: left;
            font-family: $secondary-font;
            margin: 0;
            padding: 9px;
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
            background: $color-1;
            border: none;
            border-radius: 3px;
            box-shadow: none;
            color: $color-10;
            cursor: pointer;
            display: inline-block;
            font: {
                size: 100%;
                family: $secondary-font;
                weight: 500;
            }
            height: 3.9rem;
            line-height: 3.8rem;
            margin: 2px 5px 30px 5px;
            padding: 0 1rem;
            position: relative;
            transition: all .25s ease-out;
            user-select: none;
            white-space: nowrap;

            &:focus {
                outline: none;
            }

            &:active,
            &:focus,
            &:hover {
                background: lighten($color-1, 10%);
                color: $color-10;
            }
        }
    }
}
</style>
