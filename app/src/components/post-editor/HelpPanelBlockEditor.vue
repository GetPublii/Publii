<template>
    <div :class="{ 'help-panel': true, 'is-visible': isOpen }">
        <div>           
            <p>You can insert a block either by clicking the  <span>+</span>  or <span>TAB</span> button on a new line, or typing the following shortcuts or markdown syntax on a new line.</p>
            <table class="help-panel-table">
                <tr>
                    <th>Shortcuts</th>
                    <th>Markdown</th>
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
                <tr>
                    <td>/embed</td>
                    <td></td>
                </tr>
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
