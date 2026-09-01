<template>
    <div :class="{ 'item': true, 'is-main-author': mainAuthor }">
        <slot></slot>
    </div>
</template>

<script>
export default {
    name: 'collection-row',
    props: {
        mainAuthor: {
            default: false,
            type: Boolean
        }
    }
}
</script>

<style scoped>

.item {
    display: contents;
    font-size: var(--font-size-ui-sm);


    .add-form {
        margin-top: 0;
    }

    .single-post-status {
        pointer-events: none;
    }
}
</style>
