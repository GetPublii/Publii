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
                v-pure-html="errors"></div>

            <textarea spellcheck="false" ref="error-log">{{ text }}</textarea>

            <div class="buttons">
                <p-button
                    type="medium danger no-border-radius half-width"
                    :onClick="copyToClipboard">
                    {{ $t('ui.copyToClipboard') }}
                </p-button>

                <p-button
                    type="medium no-border-radius half-width cancel-popup"
                    :onClick="close">
                    {{ $t('ui.close') }}
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
    padding: 4rem;
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
    padding: 0 0 4rem 0;
}

.buttons {
    display: flex;
    margin: 4rem -4rem -4rem -4rem;
    position: relative;
    text-align: center;
    top: 1px;
}
</style>
