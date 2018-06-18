<template>
    <div class="search">
        <text-input
            changeEventName="sites-list-filtered"
            v-model="value"
            icon="magnifier-small"
            properties="is-small has-padding"
            placeholder="Search..." />
        <span
            v-if="value !== ''"
            @click.stop="clear">
            &times;
        </span>
    </div>
</template>

<script>
export default {
    name: 'sites-search',
    data () {
        return {
            value: ''
        };
    },
    methods: {
        clear () {
            this.value = '';
        }
    }
}
</script>

<style lang="scss">
@import '../scss/variables.scss';

.site-switch {
    .search {
        padding-left: 0.55rem;

        .input-wrapper {
            width: 95%;

            input {
                box-shadow: none!important;
                padding-left: 4.6rem!important;
            }

            svg {
                fill: $color-5!important;
                height: 1.6rem;
                left: 2.5rem!important;
                width: 1.6rem;
            }
        }

        & > span {
            color: $color-3;
            cursor: pointer;
            font-size: 2.4rem;
            font-weight: 300;
            height: 2rem;
            line-height: 1.7rem;
            padding: 0;
            position: absolute;
            right: 1.6rem;
            text-align: center;
            top: 1.8rem;
            width: 2rem;

            &:active,
            &:focus,
            &:hover {
                color: $color-4;
            }
        }
    }
}
</style>
