<template>
    <section class="settings site-settings-app">
        <p-header title="Themes">
            <p-button
                :onClick="goBack"
                type="outline"
                slot="buttons">
                Go back
            </p-button>

            <p-button
                :onClick="installTheme"
                slot="buttons">
                Install theme
            </p-button>
        </p-header>

        <div ref="content">
            <themes-list />
        </div>
    </section>
</template>

<script>
import { ipcRenderer, remote } from 'electron';
const mainProcess = remote.require('./main');
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
        installTheme () {
            mainProcess.selectFile('file-select');

            ipcRenderer.once('app-file-selected', (event, data) => {
                if (data.path === undefined || !data.path.filePaths.length) {
                    return;
                }

                ipcRenderer.send('app-theme-upload', {
                    sourcePath: data.path.filePaths[0]
                });

                ipcRenderer.once('app-theme-uploaded', this.uploadedTheme);
            });
        },
        uploadedTheme (event, data) {
            this.$store.commit('replaceAppThemes', data.themes);
            this.$store.commit('updateSiteThemes');

            let messageConfig = {
                message: '',
                type: 'success',
                lifeTime: 3
            };

            if(data.status === 'added') {
                messageConfig.message = 'Theme has been successfully added.';
            } else if(data.status === 'updated') {
                messageConfig.message = 'Theme has been successfully updated.';
            } else if(data.status === 'wrong-format') {
                messageConfig.message = 'The uploaded files are incorrect. Please upload theme directory or theme ZIP file.';
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
    margin: 0 auto;
    max-width: $wrapper;
    padding: 4.4rem 0;
}
</style>
