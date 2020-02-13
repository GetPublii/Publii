<template>
    <div :class="{ 'sites-popup': true, 'is-hidden': !isVisible }">
        <p-header title="Sites list">
            <p-button
                type="outline"
                slot="buttons"
                :onClick="hide">
                Go back
            </p-button>

            <p-button
                icon="add-site-mono"
                type="primary icon"
                slot="buttons"
                :onClick="addNewWebsite">
                Add new website
            </p-button>
        </p-header>

        <sites-search ref="search" />

        <sites-list />
    </div>
</template>

<script>
import SitesSearch from './SitesSearch';
import SitesList from './SitesList';

export default {
    name: 'sites-popup',
    components: {
        'sites-search': SitesSearch,
        'sites-list': SitesList
    },
    data () {
        return {
            isVisible: false
        }
    },
    mounted () {
        this.$bus.$on('sites-popup-show', this.show);
        this.$bus.$on('sites-popup-hide', this.hide);
    },
    methods: {
        show (e) {
            this.isVisible = true;

            setTimeout(() => {
                this.$refs['search'].$refs['search-input'].$refs['input'].value = '';
                this.$refs['search'].$refs['search-input'].$refs['input'].focus();
                this.$bus.$emit('sites-list-filtered', '');
            }, 100);
        },
        hide () {
            this.isVisible = false;
        },
        addNewWebsite (e) {
            this.isVisible = false;
            this.$router.push('/site/!');
        }
    },
    beforeDestroy () {
        this.$bus.$off('sites-popup-show', this.show);
        this.$bus.$off('sites-popup-hide', this.hide);
    }
}
</script>

<style lang="scss" scoped>
@import '../scss/variables.scss';

.sites-popup {
    background: var(--bg-primary);
    height: calc(100vh - 2.2rem);
    left: 0;
    opacity: 1;
    pointer-events: auto;
    position: fixed;
    top: 2.2rem;
    width: 100vw;
    z-index: 1000;

    &.is-hidden {
        pointer-events: none;
        opacity: 0;
    }
}
</style>
