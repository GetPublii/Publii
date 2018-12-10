<template>
    <div class="progress-wrapper">
        <div class="progress">
            <div
                :class="cssClasses"
                :style="'width: ' + progress + '%'">
            </div>
        </div>

        <p
            v-if="message"
            class="progress-message">
            {{ message }}
        </p>
    </div>
</template>

<script>
export default {
    name: 'progress-bar',
    props: {
        progress: {
            default: 0,
            type: Number
        },
        color: {
            default: 'blue',
            type: String
        },
        stopped: {
            default: false,
            type: Boolean
        },
        message: {
            default: '',
            type: String
        }
    },
    computed: {
        cssClasses: function() {
            return {
                'progress-bar': true,
                'is-stopped': this.stopped,
                'is-error': this.color === 'red',
                'is-success': this.color === 'green',
                'is-warning': this.color === 'orange'
            };
        }
    }
}
</script>

<style lang="scss" scoped>
@import '../../scss/variables.scss';

.progress {
    background: $color-8;
    border: none;
    border-radius: 3px;
    height: 6px;
    margin: 4rem auto 5rem auto;
    padding: 0;
    position: relative;
    width: 100%;

    &-bar {
        background: $color-1;
        border-radius: 3px;
        height: 6px;
        margin: 0;
        max-width: 100%;
        position: relative;
        transition: width .2s ease-out;
        width: 0;

        &:after {
            animation: progressbar 2s linear infinite;
            background-image: linear-gradient(-45deg, rgba(255, 255, 255, 0.3) 25%, transparent 25%, transparent 50%, rgba(255, 255, 255, 0.3) 50%, rgba(255, 255, 255, 0.3) 75%, transparent 75%, transparent);
            background-size: 16px 16px;
            border-radius: 3px;
            bottom: 0;
            content: "";
            left: 0;
            overflow: hidden;
            position: absolute;
            right: 0;
            top: 0;
            z-index: 1;
        }

        &.is-stopped {
            &:after {
                display: none;
            }
        }

        &.is-success {
            background: $color-2;

            &:after {
                display: none;
            }
        }

        &.is-error {
            background: $color-3;

            &:after {
                display: none;
            }
        }

        &.is-warning {
            background: $color-helper-6;

            &:after {
                display: none;
            }
        }
    }

    &-wrapper {
        position: relative;
    }

    &-message {
        font-size: 1.3rem;
        padding: 0;
        position: absolute;
        text-align: center;
        top: .75rem;
        width: 100%;
    }
}

@-webkit-keyframes progressbar {
    0% {
        background-position: 0 0;
    }

    100% {
        background-position: 48px 48px;
    }
}
</style>
