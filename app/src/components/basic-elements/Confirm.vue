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
                ref="input" />

            <div class="buttons">
                <p-button
                    :type="isDanger ? 'medium no-border-radius half-width danger' : 'medium no-border-radius half-width'"
                    :onClick="onOk"
                    ref="okButton">
                    {{ okLabel }}
                </p-button>

                <p-button
                    type="medium no-border-radius half-width cancel-popup"
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
            this.isVisible = false;
            document.body.classList.remove('has-popup-visible');

            if(this.hasInput) {
                this.okClick(this.$refs.input.content);
            } else {
                this.okClick();
            }
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
            this.onOk();

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

<style lang="scss" scoped>
@import '../../scss/variables.scss';
@import '../../scss/popup-common.scss';

.overlay {
    z-index: 100005;
}

.popup {
    max-width: 60rem;
    min-width: 60rem;
    padding: 4rem;
}

.message {
    padding: 0;

    & + * {
        margin-top: 2rem;
    }
}

.buttons {
    display: flex;
    margin: 4rem -4rem -4rem -4rem;
    position: relative;
    text-align: center;
    top: 1px;
}
</style>
