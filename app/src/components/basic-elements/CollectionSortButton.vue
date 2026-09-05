<template>
    <button type="button" class="col-sortable-title" :disabled="disabled" :aria-label="actionLabel" @click="$emit('click')">
        <span class="sorting-width" aria-hidden="true">
            <strong>{{ label }}</strong>
            <span class="order-ascending"></span>
        </span>
        <span>
            <strong v-if="active">{{ label }}</strong>
            <template v-else>{{ label }}</template>
            <span v-if="active" :class="order === 'ASC' ? 'order-descending' : 'order-ascending'" aria-hidden="true"></span>
        </span>
    </button>
</template>

<script>
export default {
    name: 'collection-sort-button',
    props: {
        label: { type: String, required: true },
        active: { type: Boolean, default: false },
        order: { type: String, default: 'DESC', validator: value => ['ASC', 'DESC'].includes(value) },
        disabled: { type: Boolean, default: false }
    },
    computed: {
        actionLabel () {
            const direction = !this.active || this.order === 'ASC' ? 'descending' : 'ascending';
            return this.$t('file.manager.sort', { column: this.label, direction: this.$t('file.manager.' + direction) });
        }
    }
};
</script>

<style scoped>
@import '../../css/collection-sorting.css';

button.col-sortable-title {
    display: inline-grid;
}

.col-sortable-title > span {
    align-items: center;
    display: inline-flex;
    grid-area: 1 / 1;
}

.order-ascending,
.order-descending {
    align-items: center;
    display: inline-flex;
}

.order-ascending::before,
.order-descending::before {
    content: " ";
    white-space: pre;
}

.order-ascending::after,
.order-descending::after {
    display: block;
    height: 0;
    top: auto;
    transform: none;
}

.order-descending::after {
    border-top-width: 0;
}

.sorting-width {
    visibility: hidden;
}
</style>
