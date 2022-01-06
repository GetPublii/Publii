<template>
    <div class="item">
        <slot></slot>
    </div>
</template>

<script>
export default {
    name: 'collection-row'
}
</script>

<style lang="scss" scoped>
@import '../../scss/variables.scss';

.item {
    display: contents;


    .add-form {
        margin-top: 0;
    }

    .single-post-status {
        pointer-events: none;
    }
}
</style>
