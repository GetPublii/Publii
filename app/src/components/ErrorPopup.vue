<template>
    <div
        v-if="isVisible"
        class="overlay">
        <div class="popup">
            <icon
                size="xl"
                primaryColor="color-3"
                name="alert" />

            <div
                class="error-log"
                v-html="errors"></div>

            <textarea ref="error-log">{{ text }}</textarea>

            <div class="buttons">
                <p-button
                    type="medium danger no-border-radius half-width"
                    :onClick="copyToClipboard">
                    Copy to clipboard
                </p-button>

                <p-button
                    type="medium no-border-radius half-width cancel-popup"
                    :onClick="close">
                    Close
                </p-button>
            </div>
        </div>
    </div>
</template>

<script>
export default {
    name: 'error-popup',
    data: function() {
        return {
            isVisible: false,
            text: '',
            errors: ''
        };
    },
    mounted: function() {
        this.$bus.$on('error-popup-display', (config) => {
            this.isVisible = true;
            this.text = config.text;
            this.errors = config.errors;
        });
    },
    methods: {
        copyToClipboard: function() {
            this.$refs['error-log'].select();
            document.execCommand('copy');
            this.close();
        },
        close: function() {
            this.isVisible = false;
        }
    },
    beforeDestroy () {
        this.$bus.$off('error-popup-display');
    }
}
</script>

<style lang="scss" scoped>
@import '../scss/variables.scss';
@import '../scss/popup-common.scss';

.popup {
    background-color: $color-10;
    border: none;
    border-radius: .6rem;
    display: inline-block;
    font-size: 1.6rem;
    font-weight: 400;
    left: 50%;
    overflow: hidden;
    padding: 4rem;
    position: absolute;
    text-align: center;
    top: 50%;
    transform: translateX(-50%) translateY(-50%);
    width: 60rem;

    .error-log {
        height: 225px;
        overflow: scroll;
        text-align: left;
    }
}

textarea {
    border: none;
    left: 0;
    height: 1px;
    padding: 0!important;
    position: absolute;
    top: 0;
    width: 1px;
}

.message {
    color: $color-5;
    font-weight: 400;
    margin: 0;
    padding: 0 0 4rem 0;
    position: relative;
    text-align: left;

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
