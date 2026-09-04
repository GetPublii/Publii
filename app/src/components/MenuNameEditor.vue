<template>
    <form
        class="menu-name-editor"
        novalidate
        @submit.prevent="save"
        @keydown.esc.prevent.stop="cancel"
        @focusout="handleFocusOut">
        <input
            ref="input"
            v-model="draft"
            type="text"
            class="menu-name-editor-input"
            spellcheck="false"
            :aria-label="$t('ui.name')"
            :aria-invalid="error ? 'true' : 'false'"
            :aria-describedby="error ? errorID : null"
            @input="error = ''">

        <button
            type="submit"
            class="menu-name-editor-button is-confirm"
            :title="$t('menu.saveMenuName')"
            @mousedown.prevent>
            <icon
                name="success"
                size="xs"
                non-interactive />
        </button>

        <button
            type="button"
            class="menu-name-editor-button is-cancel"
            :title="$t('ui.cancel')"
            @mousedown.prevent
            @click="cancel">
            <icon
                name="win-close"
                size="xxs"
                non-interactive />
        </button>

        <p
            v-if="error"
            :id="errorID"
            class="menu-name-editor-error"
            role="alert">
            {{ error }}
        </p>
    </form>
</template>

<script>
export default {
    name: 'menu-name-editor',
    props: {
        value: {
            default: '',
            type: String
        },
        validate: {
            default: () => true,
            type: Function
        }
    },
    data () {
        return {
            draft: this.value,
            error: '',
            closed: false
        };
    },
    computed: {
        errorID () {
            return 'menu-name-editor-error-' + this._uid;
        }
    },
    mounted () {
        this.$nextTick(() => {
            if (this.$refs.input) {
                this.$refs.input.focus();
                this.$refs.input.select();
            }
        });
    },
    methods: {
        save () {
            if (this.closed) {
                return;
            }

            let name = this.draft.trim();

            if (name === this.value) {
                this.close('cancel');
                return;
            }

            let validation = this.validate(name);

            if (validation !== true) {
                this.error = typeof validation === 'string' ? validation : '';
                this.$refs.input.focus();
                return;
            }

            this.close('save', name);
        },
        cancel () {
            this.close('cancel');
        },
        handleFocusOut (event) {
            if (this.closed) {
                return;
            }

            if (event.relatedTarget && this.$el.contains(event.relatedTarget)) {
                return;
            }

            let name = this.draft.trim();

            if (name === this.value || this.validate(name) !== true) {
                this.close('cancel');
                return;
            }

            this.close('save', name);
        },
        close (eventName, name) {
            this.closed = true;
            this.$emit(eventName, name);
        }
    }
};
</script>

<style scoped>
.menu-name-editor {
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-1);
    width: 100%;
}

.menu-name-editor-input {
    background: var(--input-bg);
    border: none;
    border-radius: var(--radius-base);
    box-shadow: inset 0 0 0 1px var(--input-border-color);
    color: var(--text-primary-color);
    flex: 1 1 12rem;
    font-family: var(--font-family-sans);
    font-size: var(--font-size-ui-md);
    font-weight: var(--font-weight-medium);
    height: 3.2rem;
    /* Keep the action buttons a step away from the field */
    margin: 0 var(--space-1) 0 0;
    max-width: 36rem;
    min-width: 0;
    padding: 0 var(--space-2);

    &:focus {
        box-shadow: var(--input-shadow-focus);
        outline: none;
    }

    /* Invalid state: the shared ring, kept while focused */
    &[aria-invalid="true"],
    &[aria-invalid="true"]:focus {
        box-shadow: var(--input-shadow-invalid);
    }
}

/* Round icon button, same recipe as the row actions on the sites list:
   white disc, muted icon that darkens and grows on hover */
.menu-name-editor-button {
    align-items: center;
    appearance: none;
    background: var(--bg-primary);
    border: none;
    border-radius: 50%;
    cursor: pointer;
    display: inline-flex;
    flex-shrink: 0;
    height: 3rem;
    justify-content: center;
    margin: 0;
    padding: 0;
    width: 3rem;

    & > svg {
        fill: var(--icon-secondary-color);
        pointer-events: none;
        transform: scale(.9);
        transition: var(--transition-default);
    }

    &:hover > svg,
    &:focus-visible > svg {
        fill: var(--icon-tertiary-color);
        transform: scale(1);
    }

    &:focus-visible {
        outline: 2px solid var(--input-border-focus);
        outline-offset: 2px;
    }

    /* Confirm reads as a positive action */
    &.is-confirm {
        & > svg {
            fill: var(--color-success);
        }

        &:hover > svg,
        &:focus-visible > svg {
            fill: var(--color-success);
        }
    }
}

.menu-name-editor-error {
    color: var(--color-danger);
    flex-basis: 100%;
    font-size: var(--font-size-ui-xs);
    font-weight: var(--font-weight-regular);
    line-height: var(--line-height-base);
    margin: 0;
}
</style>
