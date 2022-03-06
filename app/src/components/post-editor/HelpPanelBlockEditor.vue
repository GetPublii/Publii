<template>
    <div :class="{ 'help-panel': true, 'is-visible': isOpen }">
        <div>
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
</template>

<script>
export default {
    name: 'help-panel-block-editor',
    props: {
        isOpen: {
            default: false,
            type: Boolean
        }
    }
}
</script>

<style lang="scss" scoped>
@import '../../scss/variables.scss';
@import '../../scss/help-panel-common.scss';


</style>
