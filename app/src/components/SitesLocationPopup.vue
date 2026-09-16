<template>
    <div
        v-if="isVisible"
        class="overlay">
        <div
            class="popup"
            role="dialog"
            aria-modal="true"
            :aria-label="$t('settings.sitesLocationMissingTitle')">
            <icon
                size="xl"
                primaryColor="color-3"
                name="alert" />

            <h2>{{ $t('settings.sitesLocationMissingTitle') }}</h2>

            <p class="message">
                {{ $t('settings.sitesLocationMissingInfo') }}
            </p>

            <p class="path">{{ currentLocation }}</p>

            <p class="message">
                {{ $t('settings.sitesLocationMissingHint') }}
            </p>

            <label
                class="label"
                for="sites-location-missing">
                {{ $t('settings.sitesLocation') }}
            </label>

            <dir-select
                id="sites-location-missing"
                v-model="selectedLocation"
                :placeholder="currentLocation"
                :readonly="isChecking" />

            <p
                v-if="errorMessage"
                class="input-error"
                role="alert">
                {{ errorMessage }}
            </p>

            <div class="buttons">
                <p-button
                    intent="primary"
                    size="medium"
                    width="half"
                    square
                    :loading="isChecking"
                    :onClick="retry">
                    {{ $t('settings.sitesLocationMissingRetry') }}
                </p-button>

                <p-button
                    appearance="popup-cancel"
                    size="medium"
                    width="half"
                    square
                    :disabled="isChecking"
                    :onClick="quit">
                    {{ $t('settings.sitesLocationMissingQuit') }}
                </p-button>
            </div>
        </div>
    </div>
</template>

<script>
export default {
    name: 'sites-location-popup',
    data () {
        return {
            isVisible: false,
            isChecking: false,
            selectedLocation: '',
            errorMessage: ''
        };
    },
    computed: {
        currentLocation () {
            return this.$store.state.app.config.sitesLocation || '';
        }
    },
    mounted () {
        this.$bus.$on('sites-location-popup-show', this.show);
    },
    methods: {
        show () {
            this.selectedLocation = this.currentLocation;
            this.errorMessage = '';
            this.isVisible = true;
            document.body.classList.add('has-popup-visible');
        },
        hide () {
            this.isVisible = false;
            document.body.classList.remove('has-popup-visible');
        },
        retry () {
            if (this.isChecking) {
                return;
            }

            this.isChecking = true;
            this.errorMessage = '';

            mainProcessAPI.send('app-sites-location-retry', {
                sitesLocation: this.selectedLocation.trim()
            });

            mainProcessAPI.receiveOnce('app-sites-location-retried', (data) => {
                this.isChecking = false;

                if (data.status === true) {
                    this.$store.commit('setSites', data.sites);
                    this.$store.commit('setAppConfig', { sitesLocation: data.sitesLocation });
                    this.$store.commit('setSitesLocationMissing', false);
                    this.hide();
                    this.$bus.$emit('sites-location-restored');
                    return;
                }

                if (data.reason === 'config-save-error') {
                    this.errorMessage = this.$t('settings.sitesLocationMissingSaveError');
                    return;
                }

                this.errorMessage = this.$t('settings.sitesLocationMissingStillMissing', {
                    path: data.checkedLocation
                });
            });
        },
        quit () {
            mainProcessAPI.send('app-close');
        }
    },
    beforeDestroy () {
        this.$bus.$off('sites-location-popup-show', this.show);
    }
}
</script>

<style scoped>
@import '../css/popup-common.css';

.overlay {
    z-index: var(--layer-dialog);
}

.popup {
    max-width: 64rem;
    min-width: 64rem;
    padding: var(--space-16);
}

h2 {
    margin: var(--space-6) 0 var(--space-8);
}

.message {
    padding: 0;

    & + * {
        margin-top: var(--space-6);
    }
}

.path {
    background: var(--bg-secondary);
    border: 1px solid var(--border-light-color);
    border-radius: var(--radius-base);
    color: var(--text-primary-color);
    font-family: var(--font-family-mono);
    font-size: var(--font-size-ui-sm);
    margin: var(--space-6) 0;
    overflow-wrap: anywhere;
    padding: var(--space-4) var(--space-6);
    text-align: left;
    user-select: text;
}

.label {
    color: var(--color-text-muted);
    display: block;
    font-size: var(--font-size-ui-sm);
    margin: var(--space-8) 0 var(--space-2);
    text-align: left;
}

.input-error {
    color: var(--color-danger);
    font-size: var(--font-size-ui-sm);
    margin: var(--space-4) 0 0;
    overflow-wrap: anywhere;
    text-align: left;
}

.buttons {
    display: flex;
    margin: var(--space-16) -4rem -4rem -4rem;
    position: relative;
    text-align: center;
    top: 1px;
}
</style>
