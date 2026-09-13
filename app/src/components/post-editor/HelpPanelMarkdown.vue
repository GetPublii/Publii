<template>
    <aside :class="{ 'help-panel': true, 'is-visible': isOpen }">
        <div class="sidebar-panel">
            <div class="sidebar-panel-heading">
                <h2 class="sidebar-panel-title">{{ $t('ui.help') }}</h2>
                <button
                    ref="closeButton"
                    type="button"
                    class="sidebar-panel-close"
                    :aria-label="$t('ui.close')"
                    @click="$emit('close')">
                    &times;
                </button>
            </div>
            <div
                v-sidebar-scroll-fade
                class="sidebar-panel-content">
                <p class="help-panel-desc">
                    {{ $t('editor.markdownHelpPanelDesc') }}
                </p>
                <table class="help-panel-table col-3">
                    <tr>
                        <th>{{ $t('editor.element') }}</th>
                        <th>{{ $t('editor.markdown') }}</th>
                        <th>{{ $t('editor.shortcuts') }}</th>
                    </tr>
                    <tr>
                        <td><b>Bold</b></td>
                        <td>**text**</td>
                        <td>Ctrl/⌘ + B</td>
                    </tr>
                    <tr>
                        <td><i>Emphasize</i></td>
                        <td>*text*</td>
                        <td>Ctrl/⌘ + I</td>
                    </tr>
                    <tr>
                        <td><s>Strikethrough</s></td>
                        <td>~~text~~</td>
                        <td>Ctrl/⌘ + Alt + U</td>
                    </tr>
                    <tr>
                        <td><a href="">Link</a></td>
                        <td>[title](http://)</td>
                        <td>Ctrl/⌘ + K</td>
                    </tr>
                    <tr>
                        <td>List</td>
                        <td>* item</td>
                        <td>Ctrl/⌘ + L</td>
                    </tr>
                    <tr>
                        <td>Ordered List</td>
                        <td>1. item</td>
                        <td>Ctrl/⌘ + Alt/⌥ + L</td>
                    </tr>
                    <tr>
                        <td>Blockquote</td>
                        <td>> quote</td>
                        <td>Ctrl/⌘ + Q/'</td>
                    </tr>
                    <tr>
                        <td>Inline code</td>
                        <td>`code`</td>
                        <td></td>
                    </tr>
                    <tr>
                        <td>Code</td>
                        <td>```code```</td>
                        <td></td>
                    </tr>
                    <tr>
                        <td>H1</td>
                        <td># Heading</td>
                        <td>
                            <template v-if="!isMac">Ctrl + H</template>
                        </td>
                    </tr>
                    <tr>
                        <td>H2</td>
                        <td>## Heading</td>
                        <td>
                            <template v-if="!isMac">Ctrl + H (x2)</template>
                        </td>
                    </tr>
                    <tr>
                        <td>H3</td>
                        <td>### Heading</td>
                        <td>
                            <template v-if="!isMac">Ctrl + H (x3)</template>
                        </td>
                    </tr>
                    <tr>
                        <td>H4</td>
                        <td>#### </td>
                        <td>
                            <template v-if="!isMac">Ctrl + H (x4)</template>
                        </td>
                    </tr>
                    <tr>
                        <td>H5</td>
                        <td>##### </td>
                        <td>
                            <template v-if="!isMac">Ctrl + H (x5)</template>
                        </td>
                    </tr>
                    <tr>
                        <td>H6</td>
                        <td>###### </td>
                        <td>
                            <template v-if="!isMac">Ctrl + H (x6)</template>
                        </td>
                    </tr>
                    <tr>
                        <td>Readmore</td>
                        <td>---READMORE---</td>
                        <td></td>
                    </tr>
                     <tr>
                        <td>{{ $t('image.image') }}</td>
                        <td colspan="2">
                            {{ $t('editor.dragAndDropImgToEditor') }}
                        </td>
                    </tr>
                </table>
            </div>
        </div>
    </aside>
</template>

<script>
import SidebarScrollFade from '../../helpers/sidebar-scroll-fade';

export default {
    name: 'help-panel-markdown',
    directives: {
        sidebarScrollFade: SidebarScrollFade
    },
    props: {
        isOpen: {
            default: false,
            type: Boolean
        }
    },
    watch: {
        isOpen (isOpen) {
            if (isOpen) {
                this.$nextTick(() => {
                    this.$refs.closeButton.focus();
                });
            }
        }
    },
    computed: {
        isMac () {
            return document.body.getAttribute('data-os') === 'osx';
        }
    }
}
</script>

<style scoped>
@import '../../css/help-panel-common.css';


</style>
