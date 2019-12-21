<template>
    <div class="heading">
        <h1 class="title">
            {{ title }}
        </h1>

        <slot
            v-if="hasSearchSlot"
            name="search" />

        <div class="buttons">
            <slot name="buttons"></slot>
        </div>

        <slot
            v-if="hasFiltersSlot"
            name="filters" />
    </div>
</template>

<script>
export default {
    name: 'p-header',
    props: {
        title: {
            default: '',
            type: String
        }
    },
    computed: {
        hasFiltersSlot () {
            return !!this.$slots['filters']
        },
        hasSearchSlot () {
            return !!this.$slots['search']
        }
    }
}
</script>

<style lang="scss" scoped>
@import '../../scss/variables.scss';
@import '../../scss/mixins.scss';

.heading {
    display: flex;
    margin-bottom: 12 * $spacing;
    user-select: none;
    width: 100%;

    @include clearfix;

    .title {    
        line-height: 4.3rem;
        margin: 0;
        padding: 0 2rem 0 0;
    }
}

.buttons {
    display: inline-flex;
    margin-left: auto;
    white-space: nowrap;

    button {
        position: relative;
        top: -0.75rem;
    }

    .button {
        margin-left: auto;

        & + .button {
          margin-left: 1rem;
        }

        & > span.progress {
            display: inline-block;
            width: 3.2rem;
        }
    }
}
</style>
