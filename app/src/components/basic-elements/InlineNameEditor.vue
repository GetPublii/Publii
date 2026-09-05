<template>
    <form
        class="inline-name-editor"
        :class="{ 'has-suffix': !!suffix }"
        novalidate
        :aria-busy="pending ? 'true' : null"
        @submit.prevent="save()"
        @keydown.esc.prevent.stop="cancel"
        @focusout="handleFocusOut">
        <input
            ref="input"
            v-model="draft"
            type="text"
            class="inline-name-editor-input"
            spellcheck="false"
            :disabled="pending"
            :aria-label="inputLabel || $t('ui.name')"
            :aria-invalid="visibleError ? 'true' : 'false'"
            :aria-describedby="visibleError ? errorID : null"
            @keydown.enter.prevent="onEnterKey"
            @input="onInput">

        <span v-if="suffix" class="inline-name-editor-suffix">{{ suffix }}</span>

        <button
            type="submit"
            class="inline-name-editor-button is-confirm"
            :disabled="pending"
            :title="saveLabel || $t('ui.save')"
            :aria-label="saveLabel || $t('ui.save')"
            @mousedown.prevent>
            <icon name="success" size="xs" non-interactive />
        </button>

        <button
            type="button"
            class="inline-name-editor-button is-cancel"
            :disabled="pending"
            :title="$t('ui.cancel')"
            :aria-label="$t('ui.cancel')"
            @mousedown.prevent
            @click="cancel">
            <icon name="win-close" size="xxs" non-interactive />
        </button>

        <p v-if="pending && pendingLabel" class="inline-name-editor-status" role="status">
            {{ pendingLabel }}
        </p>
        <p v-if="visibleError" :id="errorID" class="inline-name-editor-error" role="alert">
            {{ visibleError }}
        </p>
    </form>
</template>

<script>
export default {
    name: 'inline-name-editor',
    props: {
        value: { default: '', type: String },
        validate: { default: () => true, type: Function },
        inputLabel: { default: '', type: String },
        saveLabel: { default: '', type: String },
        suffix: { default: '', type: String },
        // Persistent editors wait for their owner to finish an asynchronous save.
        persistent: { default: false, type: Boolean },
        pending: { default: false, type: Boolean },
        pendingLabel: { default: '', type: String },
        errorMessage: { default: '', type: String }
    },
    data () {
        return { draft: this.value, error: '', closed: false, submitted: false };
    },
    computed: {
        errorID () { return 'inline-name-editor-error-' + this._uid; },
        visibleError () { return this.error || this.errorMessage; }
    },
    watch: {
        pending (value) {
            if (!value) this.submitted = false;
        },
        errorMessage (value) {
            if (value) this.submitted = false;
        }
    },
    mounted () {
        this.$nextTick(() => {
            this.focusInput();
            if (this.$refs.input) this.$refs.input.select();
        });
    },
    methods: {
        focusInput () {
            if (this.$refs.input) this.$refs.input.focus();
        },
        onInput () {
            this.error = '';
            this.$emit('input', this.draft);
        },
        onEnterKey (event) {
            if (!event.isComposing && event.keyCode !== 229) this.save();
        },
        save (fromBlur = false) {
            if (this.closed || this.submitted || this.pending) return;
            let name = this.draft.trim();
            if (name === this.value || this.draft === this.value) {
                this.close('cancel', undefined, !fromBlur);
                return;
            }
            let validation = this.validate(name);
            if (validation !== true) {
                this.error = typeof validation === 'string' ? validation : '';
                if (!fromBlur) this.focusInput();
                return;
            }
            if (this.persistent) {
                // Lock synchronously: blur and click can precede the pending prop update.
                this.submitted = true;
                this.$emit('save', name, { restoreFocus: !fromBlur });
            } else {
                this.close('save', name, !fromBlur);
            }
        },
        cancel () {
            if (!this.pending && !this.submitted) this.close('cancel');
        },
        handleFocusOut (event) {
            if (this.closed || this.pending || this.submitted) return;
            if (event.relatedTarget && this.$el.contains(event.relatedTarget)) return;
            // Preserve failed filesystem edits until the user edits or explicitly retries.
            if (this.persistent) {
                if (!this.errorMessage) this.save(true);
                return;
            }
            let name = this.draft.trim();
            if (name === this.value || this.validate(name) !== true) {
                this.close('cancel', undefined, false);
                return;
            }
            this.close('save', name, false);
        },
        close (eventName, name, restoreFocus = true) {
            if (this.closed) return;
            this.closed = true;
            this.$emit(eventName, name, { restoreFocus });
        }
    }
};
</script>
<style scoped>
.inline-name-editor {
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-1);
    width: 100%;
}

.inline-name-editor-input {
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
.inline-name-editor-button {
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

    &:disabled {
        cursor: not-allowed;
        opacity: .5;
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

    /* Save uses the same primary colors as other action buttons. */
    &.is-confirm {
        & > svg {
            fill: var(--color-primary);
        }

        &:hover > svg,
        &:focus-visible > svg {
            fill: var(--button-primary-bg-hover);
        }
    }
}

.inline-name-editor-error {
    color: var(--color-danger);
    flex-basis: 100%;
    font-size: var(--font-size-ui-xs);
    font-weight: var(--font-weight-regular);
    line-height: var(--line-height-base);
    margin: 0;
}
/* Leave space for the file suffix and both actions in narrow table cells. */
.inline-name-editor.has-suffix .inline-name-editor-input {
    flex-basis: 0;
}

.inline-name-editor-suffix {
    color: var(--text-light-color);
    font-size: var(--font-size-ui-md);
    margin-right: var(--space-1);
}

.inline-name-editor-status {
    color: var(--text-light-color);
    flex-basis: 100%;
    font-size: var(--font-size-ui-xs);
    margin: 0;
}
</style>
