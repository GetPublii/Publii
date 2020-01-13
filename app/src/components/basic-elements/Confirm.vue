<template>
    <div
        v-if="isVisible"
        class="overlay">
        <div class="popup">
            <p
                :class="cssClasses"
                v-html="message">
            </p>

            <text-input
                v-if="hasInput"
                :type="inputIsPassword ? 'password' : 'text'"
                :value="defaultText"
                :spellcheck="false"
                ref="input" />

            <div class="buttons">
                <p-button
                    type="medium no-border-radius half-width"
                    :onClick="onOk">
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
            okLabel: 'OK',
            cancelLabel: 'Cancel',
            defaultText: ''
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
            setTimeout(() => {
                this.isVisible = true;
                this.message = config.message;
                this.textCentered = config.textCentered || false;
                this.hasInput = config.hasInput || false;
                this.inputIsPassword = config.inputIsPassword || false;
                this.okLabel = config.okLabel || "OK";
                this.cancelLabel = config.cancelLabel || "Cancel";
                this.defaultText = config.defaultText || "";

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
            }, 0);
        });

        document.body.addEventListener('keydown', this.onDocumentKeyDown);
    },
    methods: {
        onOk () {
            this.isVisible = false;

            if(this.hasInput) {
                this.okClick(this.$refs.input.content);
            } else {
                this.okClick();
            }
        },
        onCancel () {
            this.isVisible = false;
            this.cancelClick();
        },
        onDocumentKeyDown (e) {
            if (e.code === 'Enter' && this.isVisible) {
                this.onEnterKey();
            }
        },
        onEnterKey () {
            this.onOk();
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
