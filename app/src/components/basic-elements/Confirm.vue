<template>
    <div
        v-if="isVisible"
        class="overlay">
        <div class="popup">
            <p
                :class="cssClasses"
                v-pure-html="message">
            </p>

            <text-input
                v-if="hasInput"
                :type="inputIsPassword ? 'password' : 'text'"
                :value="defaultText"
                :spellcheck="false"
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
                    :onClick="onCancel">
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
            hasInput: false,
            inputIsPassword: false,
            message: '',
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
        inputErrorID () {
            return 'confirm-input-error-' + this._uid;
        }
    },
    mounted () {
        this.$bus.$on('confirm-display', (config) => {
            document.body.classList.add('has-popup-visible');

            setTimeout(() => {
                this.isVisible = true;
                this.message = config.message;
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
                    if (config.hasInput) {
                        this.$refs.input.$el.querySelector('input').focus();
                    }
                }, 100);
            }, 0);
        });

        document.body.addEventListener('keydown', this.onDocumentKeyDown);
    },
    methods: {
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

            if(this.hasInput) {
                this.okClick(this.$refs.input.content);
            } else {
                this.okClick();
            }

            return true;
        },
        onCancel () {
            if (!this.cancelNotClosePopup) {
                this.isVisible = false;
                document.body.classList.remove('has-popup-visible');
            }

            this.cancelClick();
        },
        onDocumentKeyDown (e) {
            if (e.code === 'Enter' && !event.isComposing && this.isVisible) {
                this.onEnterKey();
            }
        },
        onEnterKey () {
            if (!this.onOk()) {
                return;
            }

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

.input-error {
    color: var(--color-danger);
    font-size: var(--font-size-ui-sm);
    margin: var(--space-2) 0 0;
    text-align: left;
}

.buttons {
    display: flex;
    margin: var(--space-16) -4rem -4rem -4rem;
    position: relative;
    text-align: center;
    top: 1px;
}
</style>
