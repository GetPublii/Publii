<template>
    <div class="protected-input">
        <text-input
            ref="field"
            :id="id"
            type="password"
            :spellcheck="false"
            :readonly="locked"
            :invalid="isInvalid || (missing && locked)"
            v-model="innerValue" />

        <p-button
            v-if="locked"
            appearance="outline"
            :onClick="unlock">
            {{ $t('ui.change') }}
        </p-button>

        <p-button
            v-if="!locked && storedValue !== ''"
            appearance="outline"
            :onClick="cancel">
            {{ $t('ui.cancel') }}
        </p-button>

        <small
            v-if="missing && locked"
            class="protected-input-note">
            {{ $t('sync.storedSecretNotFound') }}
        </small>
    </div>
</template>

<script>
export default {
    name: 'protected-input',
    props: {
        'value': {
            default: '',
            type: String
        },
        'id': {
            default: '',
            type: String
        },
        // prefix used in the "type account" placeholders which
        // represent secrets stored in the system keychain
        'secretType': {
            default: '',
            type: String
        },
        'isInvalid': {
            default: false,
            type: Boolean
        },
        // the placeholder is saved, but its secret cannot be read from the system keychain
        'missing': {
            default: false,
            type: Boolean
        }
    },
    data () {
        return {
            innerValue: this.value,
            storedValue: '',
            locked: false
        };
    },
    watch: {
        value (newValue) {
            this.innerValue = newValue;
            this.detectStoredSecret();
        },
        innerValue (newValue) {
            this.$emit('input', newValue);
        }
    },
    mounted () {
        this.detectStoredSecret();
    },
    methods: {
        detectStoredSecret () {
            if (typeof this.value === 'string' && this.value.startsWith(this.secretType + ' ')) {
                this.storedValue = this.value;
                this.locked = true;
            }
        },
        unlock () {
            this.locked = false;
            this.innerValue = '';

            this.$nextTick(() => {
                if (this.$refs.field && this.$refs.field.$refs.input) {
                    this.$refs.field.$refs.input.focus();
                }
            });
        },
        cancel () {
            this.innerValue = this.storedValue;
            this.locked = true;
        }
    }
};
</script>

<style scoped>
.protected-input {
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-4);
    row-gap: var(--space-2);

    .input-wrapper {
        flex: 1;
    }
}

.protected-input-note {
    color: var(--color-danger);
    flex-basis: 100%;
    font-size: 1.35rem;
    font-style: italic;
    line-height: 1.4;
    user-select: text;
}
</style>
