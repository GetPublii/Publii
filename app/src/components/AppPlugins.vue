<template>
    <section class="settings site-settings-app">
        <div class="settings-wrapper">
            <p-header :title="$t('plugins.plugins')">
                <p-button
                    :onClick="goBack"
                    :disabled="installingExtension"
                    appearance="clean"
                    back
                    slot="buttons">
                    {{ $t('ui.goBack') }}
                </p-button>

                <p-button
                    :onClick="installPlugin"
                    :disabled="installingExtension || installationPickerOpen"
                    :loading="installingExtension"
                    loading-layout="overlay"
                    :aria-label="installingExtension ? $t('plugins.installingPlugin') : $t('plugins.installPlugin')"
                    slot="buttons" 
                    icon="upload-file">
                    {{ $t('plugins.installPlugin') }}
                </p-button>
            </p-header>

            <div ref="content">
                <plugins-list
                    :installing="installingExtension"
                    :installationLoading="installationLoading"
                    @install="installDroppedExtension('plugin', $event)" />
            </div>
        </div>
    </section>
</template>

<script>
import PluginsList from './PluginsList';
import GoToLastOpenedWebsite from './mixins/GoToLastOpenedWebsite';
import ExtensionInstallation from './mixins/ExtensionInstallation';

export default {
    name: 'app-plugins',
    mixins: [
        ExtensionInstallation,
        GoToLastOpenedWebsite
    ],
    components: {
        'plugins-list': PluginsList
    },
    mounted () {
        this.$bus.$emit('sites-list-reset');
    },
    methods: {
        goBack () {
            let lastOpened = localStorage.getItem('publii-last-opened-website');
            let sites = Object.keys(this.$store.state.sites);

            if (sites.indexOf(lastOpened) > -1) {
                this.$router.push('/site/' + lastOpened + '/posts/');
            } else {
                if (sites.length > 0) {
                    this.$router.push('/site/' + sites[0] + '/posts/');
                } else {
                    this.$router.push('/site/!/posts/');
                }
            }
        },
        installPlugin () {
            return this.pickExtensionFile('plugin');
        },
        uploadedPlugin (data) {
            this.$store.commit('replaceAppPlugins', data.plugins);

            let messageConfig = {
                message: '',
                type: 'success',
                lifeTime: 3
            };

            if(data.status === 'added') {
                messageConfig.message = this.$t('plugins.addPluginSuccessMessage');
            } else if(data.status === 'updated') {
                messageConfig.message = this.$t('plugins.updatedPluginSuccessMessage');
            } else if(data.status === 'wrong-format') {
                messageConfig.message = this.$t('plugins.uploadPluginErrorMessage');
                messageConfig.type = 'warning';
            }

            this.$bus.$emit('app-update-notifications-counters');
            this.$bus.$emit('message-display', messageConfig);
        }
    }
}
</script>

<style scoped>

.settings {
    padding: var(--space-12) 0 var(--space-16);
    width: 100%
}

.settings-wrapper {
    margin: 0 auto;
    max-width: var(--wrapper-width);
}
</style>
