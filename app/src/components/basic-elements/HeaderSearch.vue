<template>
    <div :class="cssClasses">
        <button
            ref="open"
            type="button"
            class="search-open"
            :aria-label="placeholder"
            :aria-expanded="isOpen ? 'true' : 'false'"
            @click="open">
            <icon size="xs" name="magnifier" non-interactive aria-hidden="true" />
        </button>

        <input
            type="search"
            v-model="value"
            :placeholder="placeholder"
            :aria-label="placeholder"
            :tabindex="isOpen ? 0 : -1"
            :spellcheck="$store.state.currentSite.config.spellchecking"
            ref="input-field"
            @input="updateValue"
            @keydown.esc.stop.prevent="close" />

        <button
            v-if="isOpen"
            type="button"
            class="search-close"
            :aria-label="$t('ui.close')"
            @click.stop="close">
            <icon
                name="close"
                size="m"
                non-interactive
                aria-hidden="true"
                focusable="false" />
        </button>
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
            this.$refs.open.focus({ preventScroll: true });
        },
        updateValue: function() {
            this.$bus.$emit(this.onChangeEventName, this.value);
        }
    }
}
</script>

<style scoped>

.search {
    max-width: 700px;
    padding-left: var(--space-4);
    position: relative;
    width: 100%;

    & > .search-open {
        align-items: center;
        appearance: none;
        background: transparent;
        border: 0;
        display: flex;
        height: 16px;
        padding: 0;
        width: 16px;
        cursor: pointer;
        color: var(--icon-primary-color);
        fill: var(--icon-primary-color);
        left: 1.5rem;
        position: absolute;
        top: 1.4rem;
        transition: var(--transition-default);
        z-index: 1;
        
        &:hover {
            color: var(--icon-tertiary-color);
            fill: var(--icon-tertiary-color);
        }
    }

    & > input { 
        border: 0;
        border-radius: 30px;
        box-shadow: none;
        font-size: var(--font-size-ui-md);
        height: 4.4rem;
        opacity: 0;
        padding: 0 5rem 0 6rem;
        pointer-events: none;
        position: relative;
        top: -0.125rem;
        transition: var(--transition-default);
        transform: scaleX(.25);
        transform-origin: left center;
        width: calc(100% - 3rem); 
    }

    & > .search-close {
        appearance: none;
        background: transparent;
        border: 0;
        align-items: center;
        animation: close-delay .3s ease-out .3s forwards;
        border-radius: 50%;
        color: var(--icon-secondary-color);
        cursor: pointer;
        display: flex;
        font-size: var(--font-size-ui-xl);
        font-weight: var(--font-weight-light);
        height: 3rem;
        justify-content: center;
        opacity: 0;
        padding: 0;
        position: absolute;
        right: 4.4rem;
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
        & > .search-open {
            left: 3rem;
            cursor: default;
            
            &:hover {
                color: var(--icon-primary-color);
                fill: var(--icon-primary-color);
            }
        }

        & > input {
            background: var(--input-bg-lightest);           
            opacity: 1;
            pointer-events: auto;
            transform: scaleX(1);
        }

        & > .search-close {
             transition-delay: 0s
        }
    }
}

.search button:focus-visible {
    outline: 2px solid var(--input-border-focus);
    outline-offset: 3px;
}

@media (prefers-reduced-motion: reduce) {
    .search > input,
    .search > .search-open,
    .search > .search-close {
        animation: none;
        transition: none;
    }

    .search > .search-close {
        opacity: 1;
    }
}

@keyframes close-delay {
   from {
        opacity: 0;
   }
   to {
        opacity: 1;
   }
}
</style>
