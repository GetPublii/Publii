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
    align-items: center;
    border-bottom: 1px solid var(--border-light-color);
    display: flex;
    flex-wrap: wrap;
    transition: all 1s ease-in;

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
