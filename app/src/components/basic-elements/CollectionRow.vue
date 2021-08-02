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
    border-bottom: 1px solid var(--border-light-color);
    display: contents;

    &:last-child {
        .col {
            border-bottom: none;
        }
    }

    .add-form {
        margin-top: 0;
    }

    .single-post-status {
        pointer-events: none;
    }
}
</style>
