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
    data: function() {
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
        cssClasses: function() {
            return {
                'message': true,
                'text-centered': this.textCentered
            };
        }
    },
    mounted: function() {
        this.$bus.$on('confirm-display', (config) => {
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
        });
    },
    methods: {
        onOk: function() {
            this.isVisible = false;

            if(this.hasInput) {
                this.okClick(this.$refs.input.content);
            } else {
                this.okClick();
            }
        },
        onCancel: function() {
            this.isVisible = false;
            this.cancelClick();
        }
    },
    beforeDestroy () {
        this.$bus.$off('confirm-display');
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
    background-color: $color-10;
    border: none;
    border-radius: .6rem;
    display: inline-block;
    font-size: 1.6rem;
    font-weight: 400;
    left: 50%;
    max-width: 60rem;
    min-width: 60rem;
    overflow: hidden;
    padding: 4rem;
    position: absolute;
    text-align: center;
    top: 50%;
    transform: translateX(-50%) translateY(-50%);
}

.message {
    color: $color-5;
    font-weight: 400;
    margin: 0;
    padding: 0;
    position: relative;
    text-align: left;

    & + * {
        margin-top: 2rem;
    }

    &.text-centered {
        text-align: center;
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
