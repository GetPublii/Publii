<template>
    <fieldset>
        <legend :class="{ 'is-danger': type === 'danger' }" v-if="title">
            {{ title }}
        </legend>

        <slot />
    </fieldset>
</template>

<script>
export default {
    name: 'fields-group',
    props: {
        'title': {
            default: '',
            type: String
        },
        'type': {
            default: '',
            type: String
        }
    }
}
</script>

<style lang="scss" scoped>
@import '../../scss/variables.scss';

fieldset {
    background-color: var(--bg-secondary);
    border: none;
    border-radius: var(--border-radius);
    box-shadow: var(--box-shadow-small);
    border: none;
    margin: 0 0 3rem;
    position: relative;
    padding: 3rem 3rem 3rem;

    & > legend {
        color: var(--headings-color);
        font-size: 1.6rem;
        font-weight: 600;
        position: absolute;
        top: 3rem;

        &.is-danger {
            color: var(--warning);
        }

        & + * {
            margin-top: 5rem !important;
        }

        & + p {
            margin-top: 0;
        }
    }
}
</style>
