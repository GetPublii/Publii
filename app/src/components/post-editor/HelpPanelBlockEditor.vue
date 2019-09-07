<template>
    <div :class="{ 'help-panel': true, 'is-visible': isOpen }">
        Vivamus sagittis lacus vel augue laoreet rutrum faucibus dolor auctor. Donec sed odio dui. Fusce dapibus, tellus ac cursus commodo, tortor mauris condimentum nibh, ut fermentum massa justo sit amet risus. Donec id elit non mi porta gravida at eget metus. Etiam porta sem malesuada magna mollis euismod. Donec ullamcorper nulla non metus auctor fringilla. Donec id elit non mi porta gravida at eget metus.
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
