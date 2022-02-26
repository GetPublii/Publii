<template>
    <section class="settings site-settings-app">
        <div class="settings-wrapper">
            <p-header :title="$t('theme.themes')">
                <p-button
                    :onClick="goBack"
                    type="clean back"
                    slot="buttons">
                    {{ $t('ui.goBack') }}
                </p-button>

                <p-button
                    :onClick="installTheme"
                    slot="buttons" 
                    type="icon"
                    icon="upload-file">
                    {{ $t('theme.installTheme') }}
                </p-button>
            </p-header>

            <div ref="content">
                <themes-list />
            </div>
        </div>
    </section>
</template>

<script>
import ThemesList from './ThemesList';
import GoToLastOpenedWebsite from './mixins/GoToLastOpenedWebsite';

export default {
    name: 'app-themes',
    mixins: [
        GoToLastOpenedWebsite
    ],
    components: {
        'themes-list': ThemesList
    },
    data () {
        return {};
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
        async installTheme () {
            await mainProcessAPI.invoke('app-main-process-select-file', 'file-select');

            mainProcessAPI.receiveOnce('app-file-selected', (data) => {
                if (data.path === undefined || !data.path.filePaths.length) {
                    return;
                }

                mainProcessAPI.send('app-theme-upload', {
                    sourcePath: data.path.filePaths[0]
                });

                mainProcessAPI.receiveOnce('app-theme-uploaded', this.uploadedTheme);
            });
        },
        uploadedTheme (data) {
            this.$store.commit('replaceAppThemes', data.themes);
            this.$store.commit('updateSiteThemes');

            let messageConfig = {
                message: '',
                type: 'success',
                lifeTime: 3
            };

            if(data.status === 'added') {
                messageConfig.message = this.$t('theme.addThemeSuccessMessage');
            } else if(data.status === 'updated') {
                messageConfig.message = this.$t('theme.updateThemeSuccessMessage');
            } else if(data.status === 'wrong-format') {
                messageConfig.message = this.$t('theme.uploadThemeErrorMessage');
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
