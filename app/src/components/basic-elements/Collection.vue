<template>
    <div class="collection-wrapper">
        <div
            class="collection"
            :style="gridLayout">
            <slot name="header"></slot>

            <div class="content">
                <slot name="content"></slot>
            </div>
        </div>
    </div>
</template>

<script>
export default {
    name: 'collection',
    props: {
        columns: {
            default: 3,
            type: Number,
            validator: value => Number.isInteger(value) && value >= 2
        }
    },
    computed: {
        gridLayout: function() {
            let additionalColumn = ' auto';
            let templateColumns = `auto 1fr${additionalColumn.repeat(Math.max(0, this.columns - 2))}`;

            return `grid-template-columns: ${templateColumns}`;
        }
    }
}
</script>

<style scoped>

/*
 * Collection element
 */
 .collection-wrapper {
     &:after {
        background: linear-gradient(transparent, var(--bg-site));
        bottom: 0;
        content: "";
        height: 4rem;
        left: 0;
        pointer-events: none;
        position: absolute;
        right: 5px;
        z-index: var(--layer-panel);
    }
 }

.collection {
    border-top: 1px solid var(--color-border-default);
    border-collapse: collapse;
    bottom: 0;
    display: grid;
    grid-auto-rows: max-content;
    overflow: auto;
    padding-bottom: var(--space-12);
    position: absolute;
    top: 12.5rem;
    width: calc(100% - 8rem);

    .content {
        display: contents;
    }
}
</style>
