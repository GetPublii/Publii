<template>
    <div class="overlay" v-if="isVisible">
        <div class="popup">
            <p class="message">
                TEXT HERE
            </p>

            <div class="buttons">
                <p-button
                    type="medium no-border-radius full-width"
                    :onClick="onOk">
                    {{ $t('ui.ok') }}
                </p-button>
            </div>
        </div>
    </div>
</template>

<script>
export default {
    name: 'subscription-popup',
    data: function() {
        return {
            isVisible: false,
            textCentered: false,
            buttonStyle: 'normal',
            okClick: () => false
        };
    },
    mounted: function() {
        this.$bus.$on('subscription-popup-display', () => {
            this.isVisible = true;
        });
    },
    methods: {
        onOk: function() {
            this.isVisible = false;
        }
    },
    beforeDestroy () {
        this.$bus.$off('subscription-popup-display');
    }
}
</script>

<style lang="scss" scoped>
@import '../scss/variables.scss';
@import '../scss/popup-common.scss';

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
