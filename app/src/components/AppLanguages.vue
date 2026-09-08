<template>
    <section class="settings site-settings-app">
        <div class="settings-wrapper">
            <p-header :title="$t('langs.languages')">
                <p-button
                    :onClick="goBack"
                    :disabled="installingExtension"
                    appearance="clean"
                    back
                    slot="buttons">
                    {{ $t('ui.goBack') }}
                </p-button>

                <p-button
                    :onClick="installLanguage"
                    :disabled="installingExtension || installationPickerOpen"
                    slot="buttons" 
                    icon="upload-file">
                    {{ $t('langs.installLanguage') }}
                </p-button>
            </p-header>

            <div ref="content">
                <languages-list
                    :installing="installingExtension"
                    :installationLoading="installationLoading"
                    @install="installDroppedExtension('language', $event)" />
            </div>
        </div>
    </section>
</template>

<script>
import LanguagesList from './LanguagesList';
import GoToLastOpenedWebsite from './mixins/GoToLastOpenedWebsite';
import ExtensionInstallation from './mixins/ExtensionInstallation';

export default {
    name: 'app-languages',
    mixins: [
        ExtensionInstallation,
        GoToLastOpenedWebsite
    ],
    components: {
        'languages-list': LanguagesList
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
        installLanguage () {
            return this.pickExtensionFile('language');
        },
        uploadedLanguage (data) {
            this.$store.commit('replaceAppLanguages', data.languages);

            let messageConfig = {
                message: '',
                type: 'success',
                lifeTime: 3
            };

            if(data.status === 'added') {
                messageConfig.message = this.$t('langs.addLanguageSuccessMessage');
            } else if(data.status === 'updated') {
                messageConfig.message = this.$t('langs.updatedLanguageSuccessMessage');
            } else if(data.status === 'wrong-format') {
                messageConfig.message = this.$t('langs.uploadLanguageErrorMessage');
                messageConfig.type = 'warning';
            }

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
