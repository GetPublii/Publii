<template>
    <section :class="{ 
        'content': true, 
        'notifications': true,
        'notifications-list-view': true 
    }">
        <div class="notifications-wrapper">
            <div class="heading">
                <h1 class="title">
                    {{ $t('notifications.notifications') }}
                </h1>

                <p-button
                    v-if="notificationsStatus === 'accepted'"
                    :onClick="checkUpdates"
                    slot="buttons"
                    type="primary icon"
                    icon="refresh"
                    :disabled="receivingNotificationsInProgress">
                    {{ $t('notifications.checkUpdates') }}
                </p-button>

                <p-button
                    :onClick="goBack"
                    type="clean back"
                    slot="buttons">
                    {{ $t('ui.goBack') }}
                </p-button>
            </div>

            {{ notifications }}

            <!--<collection
                v-if="!emptySearchResults && hasTags"
                :itemsCount="4">
                <collection-header slot="header">
                    <collection-cell>
                        <checkbox
                            value="all"
                            :checked="anyCheckboxIsSelected"
                            :onClick="toggleAllCheckboxes.bind(this, false)" />
                    </collection-cell>

                    <collection-cell>
                        <span
                            class="col-sortable-title"
                            @click="ordering('name')">
                            <template v-if="orderBy === 'name'">
                                <strong>{{ $t('ui.name') }}</strong>
                            </template>
                            <template v-else>{{ $t('ui.name') }}</template>

                            <span class="order-descending" v-if="orderBy === 'name' && order === 'ASC'"></span>
                            <span class="order-ascending" v-if="orderBy === 'name' && order === 'DESC'"></span>
                        </span>
                    </collection-cell>

                    <collection-cell
                        justifyContent="center"
                        textAlign="center"
                        min-width="100px">
                        <span
                            class="col-sortable-title"
                            @click="ordering('postsCounter')">
                            <template v-if="orderBy === 'postsCounter'">
                                <strong>{{ $t('ui.posts') }}</strong>
                            </template>
                            <template v-else>{{ $t('ui.posts') }}</template>

                            <span class="order-descending" v-if="orderBy === 'postsCounter' && order === 'ASC'"></span>
                            <span class="order-ascending" v-if="orderBy === 'postsCounter' && order === 'DESC'"></span>
                        </span>
                    </collection-cell>

                    <collection-cell min-width="40px">
                        <span
                            class="col-sortable-title"
                            @click="ordering('id')">
                            <template v-if="orderBy === 'id'">
                                <strong>{{ $t('ui.id') }}</strong>
                            </template>
                            <template v-else>{{ $t('ui.id') }}</template>

                            <span class="order-descending" v-if="orderBy === 'id' && order === 'ASC'"></span>
                            <span class="order-ascending" v-if="orderBy === 'id' && order === 'DESC'"></span>
                        </span>
                    </collection-cell>

                    <div
                        v-if="anyCheckboxIsSelected"
                        class="tools">
                        <p-button
                            icon="trash"
                            type="small light icon"
                            :onClick="bulkDelete">
                            {{ $t('ui.delete') }}
                        </p-button>

                        <p-button
                            v-if="selectedTagsAreNotHidden"
                            icon="hidden-post"
                            type="small light icon"
                            :onClick="bulkHide">
                            {{ $t('ui.hide') }}
                        </p-button>

                        <p-button
                            v-if="selectedTagsAreHidden"
                            icon="unhidden-post"
                            type="small light icon"
                            :onClick="bulkUnhide">
                            {{ $t('ui.unhide') }}
                        </p-button>
                    </div>
                </collection-header>

                <collection-row
                    v-for="(item, index) in items"
                    slot="content"
                    :key="'collection-row-' + index">
                    <collection-cell>
                        <checkbox
                            :value="item.id"
                            :checked="isChecked(item.id)"
                            :onClick="toggleSelection"
                            :key="'collection-row-checkbox-' + index" />
                    </collection-cell>

                    <collection-cell type="titles">
                        <h2 class="title">
                            <a
                                href="#"
                                @click.prevent.stop="editTag(item)">
                                {{ item.name }}

                                <icon
                                    v-if="item.isHidden"
                                    size="xs"
                                    name="hidden-post"
                                    strokeColor="color-7"
                                    :title="$t('tag.thisTagIsHidden')" />
                            </a>
                        </h2>

                        <div
                            v-if="showTagSlugs"
                            class="tag-slug">
                            {{ $t('tag.url') }}: /{{ item.slug }}<template v-if="!$store.state.currentSite.config.advanced.urls.cleanUrls">.html</template>
                        </div>
                    </collection-cell>

                    <collection-cell
                        justifyContent="center"
                        textAlign="center">
                        <a
                            @click.prevent.stop="showPostsConnectedWithTag(item.name)"
                            href="#">
                            {{ item.postsCounter }}
                        </a>
                    </collection-cell>

                    <collection-cell>
                        {{ item.id }}
                    </collection-cell>
                </collection-row>
            </collection>-->

            <empty-state
                v-if="notificationsStatus !== 'accepted'"
                imageName="backups.svg"
                imageWidth="344"
                imageHeight="286"
                :title="$t('notifications.consentStateTitle')"
                :description="$t('notifications.consentStateDescription')">
                <p-button
                    slot="button"
                    :onClick="giveConsent">
                    {{ $t('notifications.giveConsent') }}
                </p-button>

                <p-button
                    slot="button"
                    :onClick="rejectConsent">
                    {{ $t('notifications.rejectConsent') }}
                </p-button>
            </empty-state>

            <empty-state
                v-if="notificationsStatus === 'accepted' && notificationsCount === 0"
                imageName="backups.svg"
                imageWidth="344"
                imageHeight="286"
                :title="$t('notifications.noUpdatesTitle')"
                :description="$t('notifications.noUpdatesDescription')">
            </empty-state>
        </div>
    </section>
</template>

<script>
import { mapGetters } from 'vuex';
import GoToLastOpenedWebsite from './mixins/GoToLastOpenedWebsite';

export default {
    name: 'notifications-center',
    mixins: [
        GoToLastOpenedWebsite
    ],
    data () {
        return {
            receivingNotificationsInProgress: false
        };
    },
    computed: {
        ...mapGetters([
            'notificationsCount',
            'notifications',
            'notificationsStatus'
        ])
    },
    mounted () {
        this.$bus.$on('app-receiving-notifications', this.receivingNotifications);
        this.$bus.$on('app-received-notifications', this.receivedNotifications);
    },
    methods: {
        checkUpdates () {
            this.$bus.$emit('app-get-forced-notifications');
        },
        async giveConsent () {
            this.$store.commit('setAppNotificationsStatus', 'accepted');
            return await mainProcessAPI.send('app-set-notifications-center-state', 'accepted');
        },
        async rejectConsent () {
            this.$store.commit('setAppNotificationsStatus', 'rejected');
            return await mainProcessAPI.send('app-set-notifications-center-state', 'rejected');
        },
        receivingNotifications () {
            this.receivingNotificationsInProgress = true;
        },
        async receivedNotifications () {
            this.receivingNotificationsInProgress = false;
        }
    },
    beforeDestroy () {
        this.$bus.$off('app-receiving-notifications', this.receivingNotifications);
        this.$bus.$off('app-received-notifications', this.receivedNotifications);
    }
}
</script>

<style lang="scss" scoped>
@import '../scss/variables.scss';
@import '../scss/mixins.scss';

.notifications {
    padding: 3rem 0 4rem;
    width: 100%;

    &-wrapper {
        margin: 0 auto;
        max-width: $wrapper;
    }

    .heading {
        margin-bottom: 10 * $spacing;
        width: 100%;

        @include clearfix;

        .title {
            float: left;
            margin: 0;
        }

        .button {
            float: right;
            margin-top: -.5rem;
        }
    }

    &-version {
       
        margin: -2.5rem 0 4rem 0;
    }
}
</style>
