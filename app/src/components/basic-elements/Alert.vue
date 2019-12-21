<template>
    <div class="overlay" v-if="isVisible">
        <div class="popup">
            <p
                :class="cssClasses"
                v-html="message">
            </p>

            <div class="buttons">
                <p-button
                    :type="buttonType"
                    :onClick="onOk">
                    OK
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
            setTimeout(() => {
                this.isVisible = true;
                this.message = config.message;
                this.textCentered = config.textCentered || false;
                this.buttonStyle = config.buttonStyle || 'normal';

                if(config.okClick) {
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
            this.okClick();
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
