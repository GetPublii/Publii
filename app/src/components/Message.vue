<template>
    <div class="messages">
        <transition>
            <div v-if="message" class="message">
                <div class="message-content" @click="onClick" :data-type="type">
                    <div class="icon-wrapper">
                        <icon size="m" :name="type" />
                    </div>
                    <p>{{ message }}</p>
                </div>
            </div>
        </transition>
    </div>
</template>

<script>
export default {
    name: 'message',
    data() {
        return {
            clickCallback: false,
            lifeTime: 5,
            message: '',
            timer: false,
            type: 'info'
        };
    },
    mounted() {
        this.$bus.$on('message-display', this.showMessage);
    },
    methods: {
        hideMessage() {
            clearTimeout(this.timer);
            this.message = '';
        },
        showMessage(messageConfig) {
            this.message = messageConfig.message;
            this.type = messageConfig.type;

            if (messageConfig.clickCallback) {
                this.clickCallback = messageConfig.clickCallback;
            }

            if (typeof messageConfig.lifeTime !== 'undefined') {
                this.lifeTime = messageConfig.lifeTime;
            }

            if (this.lifeTime > 0) {
                this.timer = setTimeout(() => {
                    this.hideMessage();
                }, this.lifeTime * 1100);
            }
        },
        onClick() {
            this.hideMessage();
            if (this.clickCallback) {
                this.clickCallback();
            }
        }
    },
    beforeDestroy() {
        this.$bus.$off('message-display');
    }
};
</script>

<style lang="scss" scoped>
@import '../scss/variables.scss';

.messages {
    background: transparent;
    bottom: 0;
    left: 50%;
    max-width: 48rem;
    pointer-events: none;
    position: fixed;
    top: 4.2rem;
    transform: translate(-50%, 0);
    user-select: none;
    width: 100%;
    z-index: 100003;

    .message {
        animation: messages-animation .24s cubic-bezier(.17, .67, .6, 1.34) forwards;
        display: flex;
        justify-content: center;
        margin: 0;
        opacity: 1;
        padding: 0;
        position: relative;
        width: 100%;

        @at-root {
            @keyframes messages-animation {
                from {
                    opacity: 0;
                    transform: scale(0.6);
                }

                to {
                    opacity: 1;
                    transform: scale(1);
                }
            }
        }

        &-content {
            align-items: center;
            background: var(--popup-bg);
            border-radius: 12px;
            box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);
            color: var(--text-primary-color);
            display: flex;
            font-size: 1.4rem;
            gap: 2rem;
            justify-content: center;
            line-height: 1.4;
            margin: 0;
            max-width: 48rem;
            padding: 2rem;
            pointer-events: all;
            position: absolute;

            &[data-type="info"] .icon-wrapper {
                background: var(--color-primary);
            }

            &[data-type="success"] .icon-wrapper {
                background: var(--success);
            }

            &[data-type="warning"] .icon-wrapper {
                background: var(--warning);
            }

            .icon-wrapper {
                align-items: center;
                border-radius: 10px;
                display: flex;
                flex-shrink: 0;
                justify-content: center;
                margin: -.5rem;
                padding: 1.2rem;

                svg {
                    fill: var(--white);
                }
            }

            p {
                margin: 0;
            }

            a {
                color: var(--white);
                cursor: pointer;
                text-decoration: underline;

                &:active,
                &:focus,
                &:hover {
                    opacity: .75;
                }
            }
        }

        &-icon {
            display: block;
            margin: 0;
        }
    }
}

body[data-os="linux"] {
    .messages {
        top: 4.4rem;
    }
}
</style>
