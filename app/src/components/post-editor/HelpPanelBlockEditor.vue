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
                <p
                    class="help-panel-desc"
                    v-pure-html="$t('editor.blockEditorHelpPanelDesc')"></p>
                <table class="help-panel-table">
                    <tr>
                        <th>{{ $t('editor.shortcuts') }}</th>
                        <th>{{ $t('editor.markdown') }}</th>
                    </tr>
                    <tr>
                        <td>/separator</td>
                        <td>---</td>
                    </tr>
                    <tr>
                        <td>/hr</td>
                        <td>---</td>
                    </tr>
                    <tr>
                        <td>/header</td>
                        <td>##</td>
                    </tr>
                    <tr>
                        <td>/h1</td>
                        <td>#</td>
                    </tr>
                    <tr>
                        <td>/h2</td>
                        <td>##</td>
                    </tr>
                    <tr>
                        <td>/h3</td>
                        <td>###</td>
                    </tr>
                    <tr>
                        <td>/h4</td>
                        <td>####</td>
                    </tr>
                    <tr>
                        <td>/h5</td>
                        <td>#####</td>
                    </tr>
                    <tr>
                        <td>/h6</td>
                        <td>######</td>
                    </tr>
                    <tr>
                        <td>/list</td>
                        <td>*</td>
                    </tr>
                    <tr>
                        <td>/quote</td>
                        <td>></td>
                    </tr>
                    <tr>
                        <td>/blockquote</td>
                        <td>></td>
                    </tr>
                    <tr>
                        <td>/code</td>
                        <td>```</td>
                    </tr>
                    <tr>
                        <td>/readmore</td>
                        <td>***</td>
                    </tr>
                    <tr>
                        <td>/more</td>
                        <td>***</td>
                    </tr>
                    <tr>
                        <td>/html</td>
                        <td></td>
                    </tr>
                    <tr>
                        <td>/toc</td>
                        <td></td>
                    </tr>
                    <!-- <tr>
                        <td>/embed</td>
                        <td></td>
                    </tr> -->
                    <tr>
                        <td>/image</td>
                        <td></td>
                    </tr>
                    <tr>
                        <td>/img</td>
                        <td></td>
                    </tr>
                </table>
            </div>
        </div>
    </aside>
</template>

<script>
import SidebarScrollFade from '../../helpers/sidebar-scroll-fade';

export default {
    name: 'help-panel-block-editor',
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
    }
}
</script>

<style scoped>
@import '../../css/help-panel-common.css';


</style>
