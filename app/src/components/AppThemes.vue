<template>
    <section class="settings site-settings-app">
        <div class="settings-wrapper">
            <p-header :title="$t('theme.themes')">
                <p-button
                    :onClick="goBack"
                    appearance="clean"
                    back
                    slot="buttons">
                    {{ $t('ui.goBack') }}
                </p-button>

                <p-button
                    :onClick="installThemeFromFile"
                    slot="buttons"
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
import ThemeUpload from './mixins/ThemeUpload';

export default {
    name: 'app-themes',
    mixins: [
        GoToLastOpenedWebsite,
        ThemeUpload
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
