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
    border: none;
    border: 1px solid $color-8;
    margin: 0 0 5rem;
    padding: 3rem;

    & > legend {
        color: $color-4;
        font-size: 1.8rem;
        font-weight: 600;
        margin-left: -1rem;
        padding: 0 0.8rem;

        &.is-danger {
            color: $color-3;
        }

        & + p,
        & + .field {
            margin-top: 0;
        }
    }
}
</style>
