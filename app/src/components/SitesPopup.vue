<template>
    <div
        :class="{ 'sites-popup': true, 'is-hidden': !isVisible }"
        @click="hide">
        <p-header @click.native.stop>
            <p-button
                type="clean back"
                slot="buttons"
                :onClick="hide">
                {{ $t('ui.goBack') }}
            </p-button>

            <p-button
                icon="add-site-mono"
                type="primary icon"
                slot="buttons"
                :onClick="addNewWebsite">
                {{ $t('site.addNewWebsite') }}
            </p-button>
        </p-header>
        <div class="sites-popup-container" @click.stop>
           <sites-search ref="search" />
           <sites-list />
        </div>
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
            this.$router.push('/site/!');

            setTimeout(() => {
                this.isVisible = false;
            }, 500);
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
    background: var(--bg-site);
    height: 100vh;
    left: 0;
    opacity: 1;
    padding: 4.4rem 3.2rem;
    pointer-events: auto;
    position: fixed;
    top: 0;
    transition: all .25s ease-out;
    width: 100vw;
    z-index: 99999;

    &.is-hidden {
        pointer-events: none;
        opacity: 0;
    }

    &-container {
        margin: auto;
        max-width: $wrapper;
    }
}
</style>
