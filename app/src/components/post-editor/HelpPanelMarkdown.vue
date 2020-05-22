<template>
    <div :class="{ 'help-panel': true, 'is-visible': isOpen }">
        <div>           
            <p class="help-panel-desc">
                You can easly manage headings, text styles or create other HTML elements by using the following keyboard shortcuts or typing markdown syntax:
            </p>
            <table class="help-panel-table col-3">
                <tr>
                    <th>Element</th>
                    <th>Markdown</th>
                    <th>Shortcut</th>
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
                    <td>Ctrl/⌘ + H</td>
                </tr>
                <tr>
                    <td>H2</td>
                    <td>## Heading</td>
                    <td>Ctrl/⌘ + H (x2)</td>
                </tr>
                <tr>
                    <td>H3</td>
                    <td>### Heading</td>
                    <td>Ctrl/⌘ + H (x3)</td>
                </tr>
                <tr>
                    <td>H4</td>
                    <td>#### </td>
                    <td>Ctrl/⌘ + H (x4)</td>
                </tr>
                <tr>
                    <td>H5</td>
                    <td>##### </td>
                    <td>Ctrl/⌘ + H (x5)</td>
                </tr>
                <tr>
                    <td>H6</td>
                    <td>###### </td>
                    <td>Ctrl/⌘ + H (x6)</td>
                </tr>
                <tr>
                    <td>Readmore</td>
                    <td>---READMORE---</td>
                    <td></td>
                </tr>
                 <tr>
                    <td>Image</td>
                    <td colspan="2">Drag and drop an image onto the editor</td>                    
                </tr>
            </table>
        </div>
    </div>
</template>

<script>
export default {
    name: 'help-panel-markdown',
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
