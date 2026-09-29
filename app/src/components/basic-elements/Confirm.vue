<template>
    <div
        v-if="isVisible"
        class="overlay">
        <div class="popup" ref="dialog"
            :role="dialogLabel ? 'dialog' : null"
            :aria-modal="dialogLabel ? 'true' : null"
            :aria-label="dialogLabel || null">
            <h1 v-if="title">{{ title }}</h1>

            <p
                :class="cssClasses"
                v-pure-html="message">
            </p>

            <p
                v-if="link"
                class="confirmation-link">
                <router-link
                    :to="link.to"
                    @click.native.capture="onLinkClick">
                    <span>{{ link.label }}</span>
                    <icon
                        name="arrow-right"
                        size="xs"
                        non-interactive
                        aria-hidden="true" />
                </router-link>
            </p>

            <div
                v-if="details.length"
                class="confirmation-details">
                <p :id="detailsLabelID">{{ detailsLabel }}</p>
                <ul
                    :aria-labelledby="detailsLabelID"
                    tabindex="0">
                    <li
                        v-for="(detail, index) in details"
                        :key="index">
                        {{ detail }}
                    </li>
                </ul>
            </div>

            <text-input
                v-if="hasInput"
                :type="inputIsPassword ? 'password' : 'text'"
                :value="defaultText"
                :spellcheck="false"
                :aria-label="dialogLabel || null"
                :invalid="!!inputError"
                :aria-describedby="inputError ? inputErrorID : ''"
                @input="inputError = ''"
                ref="input" />

            <p
                v-if="hasInput && inputError"
                :id="inputErrorID"
                class="input-error"
                role="alert">
                {{ inputError }}
            </p>

            <div v-if="choices.length" class="confirmation-choices">
                <label :for="choiceID">{{ choiceLabel }}</label>
                <dropdown :id="choiceID" :items="choices" v-model="choice" :aria-label="choiceLabel" />
                <label v-if="checkLabel" class="confirmation-check">
                    <checkbox :value="choiceID + '-check'" :checked="checkValue" :onClick="() => { checkValue = !checkValue; }" />
                    {{ checkLabel }}
                </label>
            </div>

            <div class="buttons">
                <p-button
                    :intent="isDanger ? 'danger' : 'default'"
                    size="medium"
                    width="half"
                    square
                    :onClick="onOk"
                    ref="okButton">
                    {{ okLabel }}
                </p-button>

                <p-button
                    appearance="popup-cancel"
                    size="medium"
                    width="half"
                    square
                    :onClick="onCancel"
                    ref="cancelButton">
                    {{ cancelLabel }}
                </p-button>
            </div>
        </div>
    </div>
</template>

<script>
export default {
    name: 'confirm',
    data () {
        return {
            isVisible: false,
            dialogLabel: '',
            title: '',
            link: null,
            choices: [], choice: '', choiceLabel: '', checkLabel: '', checkValue: false,
            hasInput: false,
            inputIsPassword: false,
            message: '',
            detailsLabel: '',
            details: [],
            textCentered: false,
            okClick: () => false,
            cancelClick: () => false,
            validate: null,
            inputError: '',
            okLabel: this.$t('ui.ok'),
            isDanger: false,
            cancelLabel: this.$t('ui.cancel'),
            defaultText: '',
            cancelNotClosePopup: false
        };
    },
    computed: {
        cssClasses () {
            return {
                'message': true,
                'text-centered': this.textCentered
            };
        },
        detailsLabelID () {
            return 'confirm-details-' + this._uid;
        },
        choiceID () { return 'confirm-choice-' + this._uid; },
        inputErrorID () {
            return 'confirm-input-error-' + this._uid;
        }
    },
    mounted () {
        this.$bus.$on('confirm-display', (config) => {
            document.body.classList.add('has-popup-visible');

            setTimeout(() => {
                this.dialogLabel = config.dialogLabel || '';
                this.title = config.title || '';
                this.link = config.link || null;
                this.choices = config.choices || [];
                this.choice = config.choice || (this.choices[0] && this.choices[0].value) || '';
                this.choiceLabel = config.choiceLabel || '';
                this.checkLabel = config.checkLabel || '';
                this.checkValue = false;
                this.returnFocus = this.dialogLabel ? document.activeElement : null;
                this.isVisible = true;
                this.message = config.message;
                this.detailsLabel = config.detailsLabel || '';
                this.details = config.details || [];
                this.textCentered = config.textCentered || false;
                this.hasInput = config.hasInput || false;
                this.inputIsPassword = config.inputIsPassword || false;
                this.okLabel = config.okLabel || this.$t('ui.ok');
                this.cancelLabel = config.cancelLabel || this.$t('ui.cancel');
                this.defaultText = config.defaultText || "";
                this.isDanger = config.isDanger || false;
                this.cancelNotClosePopup = config.cancelNotClosePopup || false;
                this.validate = typeof config.validate === 'function' ? config.validate : null;
                this.inputError = '';

                if(config.okClick) {
                    this.okClick = config.okClick;
                } else {
                    this.okClick = () => false;
                }

                if(config.cancelClick) {
                    this.cancelClick = config.cancelClick
                } else {
                    this.cancelClick = () => false;
                }

                setTimeout(() => {
                    if (!this.isVisible) return;
                    if (config.hasInput) {
                        this.$refs.input.$el.querySelector('input').focus();
                    } else if (this.dialogLabel) {
                        this.$refs[this.isDanger ? 'cancelButton' : 'okButton'].$el.focus();
                    }
                }, 100);
            }, 0);
        });

        document.body.addEventListener('keydown', this.onDocumentKeyDown);
    },
    methods: {
        onLinkClick (event) {
            if (event.defaultPrevented || event.button > 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
                return;
            }

            if (this.link && typeof this.link.onClick === 'function') {
                this.link.onClick();
            }

            this.isVisible = false;
            document.body.classList.remove('has-popup-visible');
            this.restoreDialogFocus();
        },
        onOk () {
            if (this.hasInput && this.validate) {
                let validation = this.validate(this.$refs.input.content);

                if (validation !== true) {
                    this.inputError = typeof validation === 'string' ? validation : '';
                    this.$refs.input.$el.querySelector('input').focus();
                    return false;
                }
            }

            this.isVisible = false;
            document.body.classList.remove('has-popup-visible');

            if (this.choices.length) {
                this.okClick(this.choice, this.checkValue);
            } else if(this.hasInput) {
                this.okClick(this.$refs.input.content);
            } else {
                this.okClick();
            }

            this.restoreDialogFocus();
            return true;
        },
        onCancel () {
            if (!this.cancelNotClosePopup) {
                this.isVisible = false;
                document.body.classList.remove('has-popup-visible');
            }

            this.cancelClick();
            if (!this.isVisible) this.restoreDialogFocus();
        },
        restoreDialogFocus () {
            if (this.dialogLabel && this.returnFocus && this.returnFocus.isConnected) {
                this.returnFocus.focus();
            }
            this.returnFocus = null;
        },
        onDocumentKeyDown (e) {
            if (this.isVisible && this.dialogLabel) {
                if (e.isComposing) return;
                if (e.key === 'Escape') {
                    e.preventDefault();
                    this.onCancel();
                    return;
                }
                if (e.key === 'Tab') {
                    const controls = Array.from(this.$refs.dialog.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled), [href], [tabindex="0"]'));
                    const first = controls[0];
                    const last = controls[controls.length - 1];
                    if (e.shiftKey && (document.activeElement === first || !this.$refs.dialog.contains(document.activeElement))) {
                        e.preventDefault();
                        if (last) last.focus();
                    } else if (!e.shiftKey && (document.activeElement === last || !this.$refs.dialog.contains(document.activeElement))) {
                        e.preventDefault();
                        if (first) first.focus();
                    }
                    return;
                }
                // Native controls handle their own keys; reading details never confirms deletion.
                if (e.target.closest('button, select, a[href], .confirmation-details')) return;
                if (e.code === 'Enter') e.preventDefault();
            }
            if (e.code === 'Enter' && !e.isComposing && this.isVisible) {
                this.onEnterKey();
            }
        },
        onEnterKey () {
            const managedDialog = !!this.dialogLabel;
            if (!this.onOk()) {
                return;
            }

            // A queued choice can open another dialog immediately after this one.
            if (managedDialog) return;
            setTimeout(() => {
                this.isVisible = false;
                document.body.classList.remove('has-popup-visible');
            }, 100);
        }
    },
    beforeDestroy () {
        this.$bus.$off('confirm-display');
        document.body.removeEventListener('keydown', this.onDocumentKeyDown);
    }
}
</script>

<style scoped>
@import '../../css/popup-common.css';

.overlay {
    z-index: var(--layer-dialog);
}

.popup {
    max-width: 60rem;
    min-width: 60rem;
    padding: var(--space-16);
}

.message {
    padding: 0;

    & + * {
        margin-top: var(--space-8);
    }
}

.confirmation-link {
    margin: var(--space-8) 0 0;
    text-align: left;

    a {
        align-items: center;
        display: inline-flex;
        gap: var(--space-2);
    }

    .icon {
        flex-shrink: 0;
    }
}

.input-error {
    color: var(--color-danger);
    font-size: var(--font-size-ui-sm);
    margin: var(--space-2) 0 0;
    text-align: left;
}

.confirmation-details {
    color: var(--text-primary-color);
    text-align: left;

    p {
        font-weight: var(--font-weight-medium);
        margin: 0 0 var(--space-2);
    }

    ul {
        font-size: var(--font-size-ui-sm);
        margin: 0;
        max-height: 12rem;
        overflow-wrap: anywhere;
        overflow-y: auto;
        padding-left: var(--space-8);

        &:focus-visible {
            outline: 2px solid var(--input-border-focus);
            outline-offset: 2px;
        }
    }
}

.confirmation-choices {
    & > label:first-child {
        display: block;
        margin-bottom: var(--space-8);
    }
}

.confirmation-check {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    margin-top: var(--space-4);
}

.buttons {
    display: flex;
    margin: var(--space-16) -4rem -4rem -4rem;
    position: relative;
    text-align: center;
    top: 1px;
}
</style>
