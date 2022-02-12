<template>
    <div class="sites-list-wrapper">
        <ul class="sites-list">
            <sites-list-item
                v-for="(siteName, key) in sites"
                :site="siteName"
                :key="key"
                :duplicateInProgress="siteDuplicateInProgress"
                tabindex="1">
            </sites-list-item>

            <li
                v-if="!sites.length"
                class="empty-state">
                {{ $t('site.websiteNotFound') }}&hellip;
            </li>
        </ul>
    </div>
</template>

<script>
import SitesListItem from './SitesListItem';

export default {
    name: 'sites-list',
    data: function() {
        return {
            filterValue: '',
            siteDuplicateInProgress: false
        };
    },
    computed: {
        sites: function() {
            return this.$store.getters.siteNames.filter(siteName => {
                let displayName = this.$store.state.sites[siteName].displayName;

                if(
                    this.filterValue.trim() === '' ||
                    displayName.indexOf(this.filterValue) > -1 ||
                    displayName.toLowerCase().indexOf(this.filterValue) > -1
                ) {
                    return true;
                }

                return false;
            });
        }
    },
    mounted () {
        this.$bus.$on('sites-list-filtered', data => {
            this.filterValue = data;
        });

        this.$bus.$on('sites-list-duplicate-in-progress', (inProgress) => {
            this.siteDuplicateInProgress = inProgress;
        });
    },
    components: {
        'sites-list-item': SitesListItem
    },
    beforeDestroy () {
        this.$bus.$off('sites-list-filtered');
    }
}
</script>

<style lang="scss" scoped>
@import '../scss/variables.scss';

.sites {
    &-list {
        clear: both;
        list-style-type: none;
        margin: 0.5rem 0 0;
        padding: 0 2rem;
        text-align: center;

        &-wrapper {
            margin-top: 1rem;
            max-height: calc(100vh - 24rem);
            overflow-y: auto;
        }
    }
}

.empty-state {
    color: var(--text-light-color);
    line-height: 47px;
}
</style>
