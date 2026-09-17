<script>
export default {
    name: 'go-to-last-opened-website',
    methods: {
        async goBack () {
            let currentSiteName = this.$store.state.currentSite.config.name;
            let sites = Object.keys(this.$store.state.sites);

            // The active website belongs to this window; localStorage is shared by all windows.
            if (sites.indexOf(currentSiteName) > -1) {
                return this.$router.push('/site/' + currentSiteName + '/posts/');
            }

            await this.$router.push('/site/!/posts/');

            if (sites.length > 0) {
                this.$nextTick(() => this.$bus.$emit('sites-popup-show'));
            }
        }
    }
}
</script>
