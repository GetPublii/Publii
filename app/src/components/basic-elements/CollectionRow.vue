<template>
    <div :class="'item ' + cssClasses">
        <slot></slot>
    </div>
</template>

<script>
export default {
    name: 'collection-row',
    props: {
        'cssClasses': {
            default: ''
        }
    }
}
</script>

<style scoped>

.item {
    display: contents;
    font-size: 1.3rem;


    .add-form {
        margin-top: 0;
    }

    .single-post-status {
        pointer-events: none;
    }
}
</style>
