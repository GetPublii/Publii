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
        intent: {
            default: 'default',
            type: String,
            validator: value => ['default', 'success', 'danger', 'warning'].includes(value)
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
                'is-error': this.intent === 'danger',
                'is-success': this.intent === 'success',
                'is-warning': this.intent === 'warning'
            };
        }
    }
}
</script>

<style scoped>

.progress {
    background: var(--input-border-color);
    border: none;
    border-radius: 3px;
    height: 6px;
    margin: 0 auto;
    padding: 0;
    position: relative;
    width: 100%
}

.progress-bar {
    background: var(--input-border-focus);
    border-radius: 3px;
    height: 6px;
    margin: 0;
    max-width: 100%;
    position: relative;
    transition: width .2s ease-out;
    width: 0;

    &.is-success {
        background: var(--color-success);
    }

    &.is-error {
        background: var(--color-danger);
    }

    &.is-warning {
        background: var(--color-warning);
    }
}

.sync-progress-bar {               
    .progress-bar {
         background: rgba(var(--color-highlight-rgb), 1);
    }
}

.progress-wrapper {
    padding: 0 0 7rem;
    position: relative;
}

.progress-message {
    color: var(--text-light-color);
    font-size: var(--font-size-ui-sm);
    padding: 0;
    position: absolute;
    text-align: center;
    bottom: 2rem;
    width: 100%;
}
</style>
