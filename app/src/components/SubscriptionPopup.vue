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
                    OK
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
    background-color: $color-10;
    border: none;
    border-radius: .6rem;
    display: inline-block;
    font-size: 1.6rem;
    font-weight: 400;
    left: 50%;
    max-width: 60rem;
    min-width: 40rem;
    overflow: hidden;
    position: absolute;
    text-align: center;
    top: 50%;
    transform: translateX(-50%) translateY(-50%);
}

.message {
    color: $color-5;
    font-weight: 400;
    margin: 0;
    padding: 4rem;
    position: relative;
    text-align: left;

    &.text-centered {
        text-align: center;
    }
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
