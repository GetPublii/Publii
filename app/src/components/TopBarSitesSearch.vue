<template>
    <div class="search">
        <text-input
            changeEventName="sites-list-filtered"
            v-model="value"
            icon="magnifier-small"
            properties="is-small has-padding"
            ref="search-input"
            :spellcheck="false"
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
        position: relative;

        .input-wrapper {            

            input {
                background: var(--gray-1);
                border-radius: 30px;
                box-shadow: none!important;
                font-size: 1.5rem;
                padding: 1.1rem 4.4rem!important;
            }

            svg {
                fill: var(--icon-secondary-color)!important;
                height: 1.6rem;
                left: 3.5rem!important;
                width: 1.6rem;
            }
        }

        & > span {
        border-radius: 50%;
        color: var(--icon-secondary-color);
        cursor: pointer;
        font-size: 2.4rem;
        font-weight: 300;
        height: 3rem;
        line-height: 1.1; 
        padding: 0;
        position: absolute;
        right: 3rem;
        text-align: center;       
        transition: all .3s ease-out;         
        top: 50%;
        transform: translate(0, -50%);        
        width: 3rem;

        &:active,
        &:focus,
        &:hover {
            color: var(--icon-tertiary-color);
        }
        
        &:hover {
            background: var(--input-border-color);
        }
        }
    }
}
</style>
