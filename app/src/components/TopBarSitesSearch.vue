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

        .input-wrapper {            

            input {
                background: $color-9;
                border-radius: 6px;
                box-shadow: none!important;
                padding: 1.2rem 3rem 1.2rem 4.4rem!important;
            }

            svg {
                fill: $color-7!important;
                height: 1.6rem;
                left: 3.5rem!important;
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
            right: 3rem;
            text-align: center;
            top: 2.36rem;
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
