<template>
    <section class="settings site-settings-app">
        <div class="settings-wrapper">
            <p-header :title="$t('plugins.plugins')">
                <p-button
                    :onClick="goBack"
                    type="clean back"
                    slot="buttons">
                    {{ $t('ui.goBack') }}
                </p-button>

                <p-button
                    :onClick="installPlugin"
                    slot="buttons" 
                    type="icon"
                    icon="upload-file">
                    {{ $t('plugins.installPlugin') }}
                </p-button>
            </p-header>

            <div ref="content">
                <plugins-list />
            </div>
        </div>
    </section>
</template>

<script>
import PluginsList from './PluginsList';
import GoToLastOpenedWebsite from './mixins/GoToLastOpenedWebsite';

export default {
    name: 'app-plugins',
    mixins: [
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
        async installPlugin () {
            await mainProcessAPI.invoke('app-main-process-select-file', 'file-select');

            mainProcessAPI.receiveOnce('app-file-selected', (data) => {
                if (data.path === undefined || !data.path.filePaths.length) {
                    return;
                }

                mainProcessAPI.send('app-plugin-upload', {
                    sourcePath: data.path.filePaths[0]
                });

                mainProcessAPI.receiveOnce('app-plugin-uploaded', this.uploadedPlugin);
            });
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

            this.$bus.$emit('message-display', messageConfig);
        }
    }
}
</script>

<style lang="scss" scoped>
@import '../scss/variables.scss';

.settings {
    padding: 3rem 0 4rem;
    width: 100%;

    &-wrapper {
        margin: 0 auto;
        max-width: $wrapper;
    }
}
</style>
