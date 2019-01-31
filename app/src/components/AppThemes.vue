<template>
    <section class="settings site-settings-app">
        <p-header title="Themes">
            <p-button
                :onClick="goBack"
                type="outline"
                slot="buttons">
                Go back
            </p-button>
        </p-header>

        <div>
            <themes-list />
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
                    this.$rotuer.push('/site/!/posts/');
                }
            }
        }
    }
}
</script>

<style lang="scss" scoped>
@import '../scss/variables.scss';

.settings {
    margin: 0 auto;
    max-width: 960px;
    padding: 4.4rem 0;
}
</style>
