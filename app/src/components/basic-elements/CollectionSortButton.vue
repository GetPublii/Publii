<template>
    <button
        type="button"
        class="col-sortable-title"
        :class="{ 'has-stable-width': reserveWidth }"
        :disabled="disabled"
        :aria-label="actionLabel"
        @click="$emit('click')">
        <span
            v-if="reserveWidth"
            class="sorting-width"
            aria-hidden="true">
            <strong>{{ label }}</strong>
            <span class="order-ascending"></span>
        </span>
        <span>
            <strong v-if="active">{{ label }}</strong>
            <template v-else>{{ label }}</template>
            <span
                v-if="active"
                :class="order === 'ASC' ? 'order-descending' : 'order-ascending'"
                aria-hidden="true"></span>
        </span>
    </button>
</template>

<script>
export default {
    name: 'collection-sort-button',
    props: {
        label: {
            type: String,
            required: true
        },
        active: {
            type: Boolean,
            default: false
        },
        order: {
            type: String,
            default: 'DESC',
            validator: value => ['ASC', 'DESC'].includes(value)
        },
        disabled: {
            type: Boolean,
            default: false
        },
        reserveWidth: {
            type: Boolean,
            default: true
        }
    },
    computed: {
        actionLabel () {
            const direction = !this.active || this.order === 'ASC' ? 'descending' : 'ascending';

            return this.$t('file.manager.sort', {
                column: this.label,
                direction: this.$t('file.manager.' + direction)
            });
        }
    }
};
</script>

<style scoped>
@import '../../css/collection-sorting.css';

button.col-sortable-title:not(.has-stable-width) {
    white-space: normal;
}

button.col-sortable-title.has-stable-width {
    display: inline-grid;
}

.has-stable-width > span {
    align-items: center;
    display: inline-flex;
    grid-area: 1 / 1;
}

.has-stable-width .order-ascending,
.has-stable-width .order-descending {
    align-items: center;
    display: inline-flex;
}

.has-stable-width .order-ascending::before,
.has-stable-width .order-descending::before {
    content: " ";
    white-space: pre;
}

.has-stable-width .order-ascending::after,
.has-stable-width .order-descending::after {
    display: block;
    height: 0;
    top: auto;
    transform: none;
}

.has-stable-width .order-descending::after {
    border-top-width: 0;
}

.sorting-width {
    visibility: hidden;
}
</style>
