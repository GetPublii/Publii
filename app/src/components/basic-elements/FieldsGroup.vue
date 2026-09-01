<template>
    <fieldset>
        <legend v-if="title">
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
        }
    }
}
</script>

<style scoped>

fieldset {
    background-color: var(--bg-secondary);
    border: none;
    border-radius: var(--radius-base);
    box-shadow: var(--shadow-sm);
    margin: 0 0 var(--space-12);
    position: relative;
    padding: var(--space-12) var(--space-12) var(--space-12);

    & > legend {
        color: var(--headings-color);
        font-size: var(--font-size-ui-lg);
        font-weight: var(--font-weight-semibold);
        position: absolute;
        top: 3rem;

        & + * {
            margin-top: 5rem !important;
        }

        & + p {
            margin-top: 0;
        }
    }
}
</style>
