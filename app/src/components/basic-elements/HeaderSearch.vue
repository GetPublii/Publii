<template>
    <div :class="cssClasses">
        <icon
            size="xs"
            name="magnifier-small"
            @click.native="open" />

        <input
            type="search"
            v-model="value"
            :placeholder="placeholder"
            :spellcheck="$store.state.currentSite.config.spellchecking"
            ref="input-field"
            @keyup="updateValue" />

        <span
            v-if="isOpen"
            @click.stop="close">
            &times;
        </span>
    </div>
</template>

<script>
export default {
    name: 'header-search',
    props: {
        placeholder: {
            default: '',
            type: String
        },
        onChangeEventName: {
            default: 'header-search-value-changed',
            type: String
        }
    },
    data: function() {
        return {
            value: '',
            isOpen: false
        };
    },
    computed: {
        cssClasses: function() {
            return {
                'search': true,
                'is-opened': this.isOpen
            };
        }
    },
    methods: {
        open: function() {
            if(this.isOpen) {
                return;
            }

            this.isOpen = true;
            this.value = '';
            this.$bus.$emit(this.onChangeEventName, '');
            this.$refs['input-field'].focus();
        },
        close: function() {
            if(!this.isOpen) {
                return;
            }

            this.isOpen = false;
            this.value = '';
            this.$bus.$emit(this.onChangeEventName, '');
            this.$refs['input-field'].blur();
        },
        updateValue: function() {
            this.$bus.$emit(this.onChangeEventName, this.value);
        }
    }
}
</script>

<style lang="scss" scoped>
@import '../../scss/variables.scss';

.search {
    max-width: 700px;
    padding-left: 1rem;
    position: relative;
    width: 100%;

    & > svg {
        cursor: pointer;
        fill: var(--icon-primary-color);
        left: 1.5rem;
        position: absolute;
        top: 1.4rem;
        transition: var(--transition);
        z-index: 1;
        
        &:hover {
            fill: var(--icon-tertiary-color);
        }
    }

    & > input { 
        border: 0;
        border-radius: 30px;
        box-shadow: none;
        font-size: $app-font-base;
        height: 4.4rem;
        opacity: 0;
        padding: 0 5rem 0 6rem;
        pointer-events: none;
        position: relative;
        top: -0.125rem;
        transition: var(--transition);
        transform: scaleX(.25);
        transform-origin: left center;
        width: calc(100% - 3rem); 
    }

    & > span {
        animation: close-delay .3s ease-out .3s forwards;
        border-radius: 50%;
        color: var(--icon-secondary-color);
        cursor: pointer;
        font-size: 2.4rem;
        font-weight: 300;
        height: 3rem;
        line-height: 1;       
        opacity: 0;
        padding: 0;
        position: absolute;
        right: 4.4rem;
        text-align: center;       
        transition: all .3s ease-out;
        transition-delay: .3s;  
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

    &.is-opened {
        & > svg {
            left: 3rem;
            cursor: default;
            
            &:hover {
                fill: var(--icon-primary-color);
            }
        }

        & > input {
            background: var(--input-bg-lightest);           
            opacity: 1;
            pointer-events: auto;
            transform: scaleX(1);
        }

        & > span {
             transition-delay: 0s;

             @at-root {
                  @keyframes close-delay {
                     from {
                          opacity: 0;
                     }
                     to {
                          opacity: 1;
                     }
                 }
            }
        }
    }
}
</style>
