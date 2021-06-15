<template>
    <div class="overlay" v-if="isVisible">
        <div class="popup">
            <p
                :class="cssClasses"
                v-pure-html="message">
            </p>

            <div class="buttons">
                <p-button
                    :type="buttonType"
                    :onClick="onOk">
                    {{ buttonText }}
                </p-button>
            </div>
        </div>
    </div>
</template>

<script>
export default {
    name: 'alert',
    data: function() {
        return {
            isVisible: false,
            textCentered: false,
            message: '',
            buttonStyle: 'normal',
            buttonText: this.$t('ui.ok'),
            okClick: () => false
        };
    },
    computed: {
        cssClasses: function() {
            return {
                'message': true,
                'text-centered': this.textCentered
            };
        },
        buttonType: function() {
            let types = 'medium no-border-radius full-width';

            if(this.buttonStyle === 'normal') {
                return types;
            }

            return types + ' ' + this.buttonStyle;
        }
    },
    mounted: function() {
        this.$bus.$on('alert-display', (config) => {
            document.body.classList.add('has-popup-visible');

            setTimeout(() => {
                this.isVisible = true;
                this.message = config.message;
                this.textCentered = config.textCentered || false;
                this.buttonStyle = config.buttonStyle || 'normal';

                if (config.okLabel) {
                    this.buttonText = config.okLabel;
                } else {
                    this.buttonText = this.$t('ui.ok');
                }

                if (config.okClick) {
                    this.okClick = config.okClick;
                } else {
                    this.okClick = () => false;
                }
            }, 0);
        });

        document.body.addEventListener('keydown', this.onDocumentKeyDown);
    },
    methods: {
        onOk: function() {
            this.isVisible = false;
            document.body.classList.remove('has-popup-visible');
            this.okClick();
        },
        onDocumentKeyDown (e) {
            if (e.code === 'Enter' && !event.isComposing && this.isVisible) {
                this.onEnterKey();
            }
        },
        onEnterKey () {
            this.onOk();
        }
    },
    beforeDestroy () {
        this.$bus.$off('alert-display');
        document.body.removeEventListener('keydown', this.onDocumentKeyDown);
    }
}
</script>

<style lang="scss" scoped>
@import '../../scss/variables.scss';
@import '../../scss/popup-common.scss';

.overlay {
    z-index: 100006;
}

.popup {
    max-width: 60rem;
    min-width: 40rem;
}

.buttons {
    display: flex;
    margin: .5rem 0 0 0;
    position: relative;
    text-align: center;
    top: 1px;
    width: 100%;
}
</style>
