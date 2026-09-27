<template>
    <button
        type="button"
        :class="{ 'filter-value': true, 'filter-active': active }"
        :aria-pressed="active ? 'true' : 'false'"
        :disabled="disabled"
        @click="$emit('click', $event)">
        {{ label }} <span v-if="count !== undefined" class="filter-count">({{ count === null ? '—' : count }})</span>
    </button>
</template>

<script>
export default {
    name: 'collection-filter-button',
    props: {
        label: {
            type: String,
            required: true
        },
        count: {
            type: Number,
            default: undefined
        },
        active: {
            type: Boolean,
            default: false
        },
        disabled: {
            type: Boolean,
            default: false
        }
    }
};
</script>
