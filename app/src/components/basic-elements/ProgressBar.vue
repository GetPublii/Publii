<template>
    <div :class="cssWrapperClasses">
        <div class="progress">
            <div
                :class="cssBarClasses"
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
        },
        cssClasses: {
            default: () => ({}),
            type: Object
        }
    },
    computed: {
        cssWrapperClasses () {
            let defaultCss = { 'progress-wrapper': true };
            return Object.assign(defaultCss, this.cssClasses);
        },
        cssBarClasses () {
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
    background: var(--input-border-color);
    border: none;
    border-radius: 3px;
    height: 6px;
    margin: 0 auto;
    padding: 0;
    position: relative;
    width: 100%;

    &-bar {
        background: var(--input-border-focus);
        border-radius: 3px;
        height: 6px;
        margin: 0;
        max-width: 100%;
        position: relative;
        transition: width .2s ease-out;
        width: 0;
       
        @at-root {
            .sync-progress-bar {               
                .progress-bar {
                     background: rgba(var(--yellow), 1);
                }
            }
        }

        &.is-stopped {}

        &.is-success {
            background: var(--success);
        }

        &.is-error {
            background: var(--warning);
        }

        &.is-warning {
            background: $color-helper-6;
        }
    }

    &-wrapper {
        padding: 0 0 7rem;
        position: relative;
    }

    &-message {
        color: var(--text-light-color);
        font-size: 1.3rem;
        padding: 0;
        position: absolute;
        text-align: center;
        bottom: 2rem;
        width: 100%;
    }
}
</style>
