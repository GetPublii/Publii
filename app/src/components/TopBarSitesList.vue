<template>
    <div class="sites-list-wrapper">
        <ul class="sites-list">
            <sites-list-item
                v-for="(siteName, key) in sites"
                :site="siteName"
                :key="key">
            </sites-list-item>

            <li
                v-if="!sites.length"
                class="empty-state">
                Website not found&hellip;
            </li>
        </ul>
    </div>
</template>

<script>
import TopBarSitesListItem from './TopBarSitesListItem';

export default {
    name: 'sites-list',
    data: function() {
        return {
            filterValue: ''
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
    mounted: function() {
        let self = this;

        this.$bus.$on('sites-list-filtered', function(data) {
            self.filterValue = data;
        });
    },
    components: {
        'sites-list-item': TopBarSitesListItem
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
        &-wrapper {
           
            max-height: 350px;
            overflow-y: scroll;
        }
    }

    &-list {
        clear: both;
        list-style-type: none;
        margin: 0;
        padding: 0;
        text-align: center;
    }
}

.empty-state {
    color: $color-7;
    line-height: 350px;
}
</style>
