<template>
    <section class="content site-plugins-page">
        <div class="site-plugins-content" :inert="detailsPlugin || confirmationOpen ? '' : null">
            <p-header :title="$t('plugins.plugins')">
                <header-search
                    slot="search"
                    ref="search"
                    :placeholder="$t('tools.list.search.plugins')"
                    :onChangeEventName="searchEvent"
                    :inert="busy ? '' : null" />
                <p-button
                    slot="buttons"
                    appearance="secondary"
                    icon="tools"
                    :disabled="busy"
                    :onClick="managePlugins">
                    {{ $t('tools.list.managePlugins') }}
                </p-button>
            </p-header>

            <div
                class="filters collection-filters"
                role="group"
                :aria-label="$t('tools.list.filters')">
                <collection-filter-button
                    v-for="filter in statusFilters"
                    :key="filter.value"
                    :label="filter.label"
                    :count="filter.count"
                    :active="statusFilter === filter.value"
                    :disabled="busy || (filter.value !== 'any' && (isLoading || loadError))"
                    @click="changePluginFilter('statusFilter', filter.value)" />
                <div class="notice-filter-control">
                    <action-menu
                        ref="noticeMenu"
                        align="left"
                        text-size="medium"
                        :label="activeNoticeLabel || $t('tools.list.moreFilters')"
                        :items="noticeActions"
                        :disabled="busy">
                        <template #trigger="{ attrs, isOpen, toggle, keydown }">
                            <button
                                v-bind="attrs"
                                type="button"
                                class="filter-value notice-filter-trigger"
                                :class="{ 'filter-active': isOpen || noticeFilter !== 'any' }"
                                @click.stop="toggle($event)"
                                @keydown="keydown">
                                <icon
                                    name="list-filter"
                                    customWidth="14"
                                    customHeight="14"
                                    non-interactive
                                    aria-hidden="true" />
                                {{ activeNoticeLabel || $t('tools.list.moreFilters') }}
                            </button>
                        </template>
                    </action-menu>
                    <button
                        v-if="noticeFilter !== 'any'"
                        type="button"
                        class="filter-value notice-filter-clear"
                        :aria-label="$t('tools.list.removeFilter', { name: activeNoticeLabel })"
                        :disabled="busy"
                        @click="clearNoticeFilter">
                        <icon
                            name="close"
                            customWidth="18"
                            customHeight="18"
                            non-interactive
                            aria-hidden="true" />
                    </button>
                </div>
            </div>

            <div v-if="operation" class="visually-hidden" role="status" aria-live="polite">
                {{ $t('tools.list.progress', { done: completed, total: total }) }}
            </div>

            <div ref="list" class="site-plugins-list" :aria-busy="isLoading || operation ? 'true' : 'false'">
                <collection v-if="visiblePlugins.length" :columns="5">
                    <collection-header slot="header">
                        <collection-cell>
                            <checkbox
                                :value="'tools-select-all-' + _uid"
                                :checked="allVisibleSelected"
                                :indeterminate="someVisibleSelected"
                                :onClick="toggleAll"
                                :disabled="busy || isLoading || loadError || !visiblePlugins.length"
                                :aria-label="$t('tools.list.selectAll')" />
                        </collection-cell>
                        <collection-cell>
                            <collection-sort-button
                                :label="$t('ui.name')"
                                :active="orderBy === 'name'"
                                :order="order.toUpperCase()"
                                :disabled="busy || !!selectedItems.length"
                                @click="sortBy('name')" />
                        </collection-cell>
                        <collection-cell class="version-column">
                            <collection-sort-button
                                :label="$t('tools.list.version')"
                                :active="orderBy === 'version'"
                                :order="order.toUpperCase()"
                                :disabled="busy || !!selectedItems.length"
                                @click="sortBy('version')" />
                        </collection-cell>
                        <collection-cell>
                            <collection-sort-button
                                :label="$t('tools.list.status')"
                                :active="orderBy === 'status'"
                                :order="order.toUpperCase()"
                                :disabled="busy || !!selectedItems.length"
                                @click="sortBy('status')" />
                        </collection-cell>
                        <collection-cell variant="menu">
                            <span class="visually-hidden">{{ $t('file.operations') }}</span>
                        </collection-cell>
                        <div v-if="selectedItems.length" class="tools bulk-actions" role="group" :aria-label="$t('tools.list.bulkActions')">
                            <p-button
                                icon="power"
                                appearance="light"
                                size="small"
                                :disabled="busy || !enableCandidates.length"
                                :onClick="() => bulkChange(true)">
                                {{ $t('tools.list.enableCount', { count: enableCandidates.length }) }}
                            </p-button>
                            <p-button
                                icon="power-off"
                                appearance="light"
                                size="small"
                                :disabled="busy || !disableCandidates.length"
                                :onClick="() => bulkChange(false)">
                                {{ $t('tools.list.disableCount', { count: disableCandidates.length }) }}
                            </p-button>
                        </div>
                    </collection-header>

                    <collection-row
                        v-for="item in visiblePlugins"
                        :key="item.id"
                        :class="{ 'can-enable-settings': canHintEnable(item) }"
                        slot="content"
                        :ref="'row-' + item.id"
                        @contextmenu.native="openContextMenu($event, item)"
                        @keydown.native.shift.f10.prevent="openContextMenu($event, item)">
                        <collection-cell>
                            <checkbox
                                :value="item.directory"
                                :id="'tools-select-' + _uid + '-' + item.directory"
                                :checked="selectedItems.includes(item.directory)"
                                :onClick="toggleSelection"
                                :disabled="busy || !item.stateKnown"
                                :aria-label="$t('tools.list.selectPlugin', { name: item.name })" />
                        </collection-cell>
                        <collection-cell variant="titles">
                            <div class="item-identity">
                                <template v-if="showPluginIcons">
                                    <img
                                        v-if="!brokenIcons[item.directory]"
                                        :src="item.thumbnail"
                                        width="36"
                                        height="36"
                                        alt=""
                                        @error="iconFailed(item.directory)" />
                                    <icon
                                        v-else
                                        name="tools"
                                        customWidth="36"
                                        customHeight="36"
                                        non-interactive
                                        aria-hidden="true" />
                                </template>
                                <div class="item-copy">
                                    <div class="item-heading">
                                        <button
                                            type="button"
                                            class="item-name"
                                            :class="{ 'is-inactive': !canConfigure(item) }"
                                            v-tooltip="settingsUnavailableReason(item)"
                                            :aria-disabled="!canConfigure(item) ? 'true' : null"
                                            :disabled="busy"
                                            @click="openPlugin(item)">
                                            {{ item.name }}
                                        </button>
                                    </div>
                                    <p class="item-description">{{ item.description || $t('tools.list.noDescription') }}</p>
                                    <div class="compact-version">
                                        <span>{{ item.version }}</span>
                                        <span
                                            v-for="notice in itemNotices(item)"
                                            :key="notice.type"
                                            class="item-notice"
                                            :class="[
                                                notice.type !== 'incompatible' ? 'extension-notice-badge' : '',
                                                'is-' + notice.type
                                            ]">
                                            <span v-if="notice.type === 'discontinued'" aria-hidden="true">!</span>
                                            {{ notice.label }}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </collection-cell>
                        <collection-cell class="version-column">
                            <div class="plugin-version">
                                <span>{{ item.version }}</span>
                                <span
                                    v-for="notice in itemNotices(item)"
                                    :key="notice.type"
                                    class="item-notice"
                                    :class="[
                                        notice.type !== 'incompatible' ? 'extension-notice-badge' : '',
                                        'is-' + notice.type
                                    ]">
                                    <span v-if="notice.type === 'discontinued'" aria-hidden="true">!</span>
                                    {{ notice.label }}
                                </span>
                            </div>
                        </collection-cell>
                        <collection-cell>
                            <div class="plugin-state">
                                <span>{{ statusLabel(item) }}</span>
                                <switcher
                                    :key="item.directory + '-' + (switchVersions[item.directory] || 0)"
                                    class="plugin-switch"
                                    :value="item.enabled"
                                    :disabled="busy || !item.stateKnown || (!item.enabled && item.incompatible)"
                                    :accessibleLabel="$t('tools.list.switchLabel', { name: item.name })"
                                    :description="item.incompatible ? $t('tools.list.requiresVersion', { version: item.minimumPubliiVersion }) : ''"
                                    lower-zindex
                                    @input="enabled => changeOne(item, enabled)" />
                            </div>
                        </collection-cell>
                        <collection-cell variant="menu">
                            <action-menu
                                :ref="'actions-' + item.directory"
                                :items="pluginActions(item)"
                                :disabled="busy"
                                :label="$t('tools.list.actions', { name: item.name })" />
                        </collection-cell>
                    </collection-row>
                </collection>
                <empty-state
                    v-else
                    :description="$t(!sitePlugins.length ? 'tools.list.noPlugins' : 'tools.list.noResults')">
                    <p-button
                        slot="button"
                        :appearance="sitePlugins.length ? 'outline' : 'secondary'"
                        :onClick="sitePlugins.length ? clearFilters : managePlugins">
                        {{ $t(sitePlugins.length ? 'tools.list.clearFilters' : 'tools.list.managePlugins') }}
                    </p-button>
                </empty-state>
            </div>
        </div>
        <tools-plugin-details
            v-if="detailsPlugin"
            :plugin="detailsPlugin"
            @close="closeDetails"
            @settings="detailsSettings"
            @enable="detailsEnable" />
    </section>
</template>

<script>
import focusReturnTarget from '../helpers/focus-return-target.js';
import Vue from 'vue';
import { mapGetters } from 'vuex';
import ToolsPluginDetails from './ToolsPluginDetails.vue';
import CollectionCheckboxes from './mixins/CollectionCheckboxes.js';
import CollectionSortButton from './basic-elements/CollectionSortButton.vue';
import CollectionFilterButton from './basic-elements/CollectionFilterButton.vue';
import getExtensionNotifications from '../helpers/extension-notifications';
import { filterSitePlugins, canChangePlugin, isIncompatible, externalLink } from '../helpers/tools-list';
import escapeHTML from '../helpers/escape-html';
import Tooltip from '../helpers/tooltip';

const savedViews = new Map();

export default {
    name: 'site-plugins',
    directives: {
        tooltip: Tooltip
    },
    mixins: [CollectionCheckboxes],
    components: {
        ToolsPluginDetails,
        CollectionSortButton,
        CollectionFilterButton
    },
    data () {
        return {
            query: '',
            statusFilter: 'any',
            noticeFilter: 'any',
            order: 'asc',
            orderBy: 'name',
            pluginsStatus: {},
            isLoading: true,
            loadError: false,
            loadErrorDialogOpen: false,
            disposed: false,
            selectedItems: [],
            operation: '',
            confirmationOpen: false,
            processingName: '',
            completed: 0,
            total: 0,
            frozenIds: null,
            brokenIcons: {},
            switchVersions: {},
            detailsDirectory: '',
            generation: 0
        };
    },
    computed: {
        ...mapGetters(['sitePlugins', 'notifications']),
        showPluginIcons () {
            return this.$store.state.app.config.showPluginIcons !== false;
        },
        siteName () {
            return this.$route.params.name;
        },
        busy () {
            return !!this.operation || this.confirmationOpen;
        },
        statusFilters () {
            const stateKnown = !this.isLoading && !this.loadError;
            const enabledCount = this.items.filter(item => item.enabled).length;

            return [
                {
                    value: 'any',
                    label: this.$t('tools.list.all'),
                    count: this.items.length
                },
                {
                    value: 'enabled',
                    label: this.$t('tools.list.enabled'),
                    count: stateKnown ? enabledCount : null
                },
                {
                    value: 'disabled',
                    label: this.$t('tools.list.disabled'),
                    count: stateKnown ? this.items.length - enabledCount : null
                }
            ];
        },
        noticeActions () {
            return ['updates', 'incompatible', 'discontinued'].map(value => ({
                value,
                type: 'radio',
                label: this.$t('tools.list.' + value),
                checked: this.noticeFilter === value,
                onClick: () => this.changePluginFilter('noticeFilter', value)
            }));
        },
        activeNoticeLabel () {
            return this.noticeFilter === 'any' ? '' : this.$t('tools.list.' + this.noticeFilter);
        },
        searchEvent () {
            return 'site-plugins-search-value-changed-' + this._uid;
        },
        items () {
            const notifications = this.notifications || {};
            const notices = getExtensionNotifications({
                type: 'plugin',
                installed: this.sitePlugins,
                available: notifications.plugins,
                discontinued: notifications.discontinued && notifications.discontinued.plugins
            });
            const noticesByDirectory = new Map(notices.map(notice => [notice.directory, notice]));
            const currentVersion = this.$store.state.app.versionInfo.version;
            const plugins = this.sitePlugins.map(plugin => {
                const notice = noticesByDirectory.get(plugin.directory) || {};

                return {
                    ...plugin,
                    id: 'plugin-' + plugin.directory,
                    enabled: !!this.pluginsStatus[plugin.directory],
                    stateKnown: !this.isLoading && !this.loadError,
                    incompatible: isIncompatible(plugin.minimumPubliiVersion, currentVersion),
                    hasUpdate: !!notice.hasUpdate,
                    updateVersion: notice.version || '',
                    isDiscontinued: !!notice.isDiscontinued,
                    discontinuedText: notice.discontinuedText || '',
                    releaseNotes: externalLink(notice.links && notice.links.releaseNotes),
                    download: externalLink(notice.links && notice.links.download)
                };
            });

            return plugins;
        },
        visiblePlugins () {
            if (this.frozenIds) {
                const byId = new Map(this.items.map(item => [item.id, item]));

                return this.frozenIds.map(id => byId.get(id)).filter(Boolean);
            }

            return filterSitePlugins(this.items, {
                query: this.query,
                status: this.statusFilter,
                notice: this.noticeFilter,
                order: this.order,
                orderBy: this.orderBy,
                locale: this.$i18n.locale
            });
        },
        selectedPlugins () {
            return this.visiblePlugins.filter(item => this.selectedItems.includes(item.directory));
        },
        collectionSelectionIds () {
            return this.visiblePlugins.filter(item => item.stateKnown).map(item => item.directory);
        },
        enableCandidates () {
            return this.selectedPlugins.filter(item => canChangePlugin(item, true));
        },
        disableCandidates () {
            return this.selectedPlugins.filter(item => canChangePlugin(item, false));
        },
        detailsPlugin () {
            return this.items.find(item => item.directory === this.detailsDirectory);
        }
    },
    watch: {
        siteName () {
            this.resetView();
            this.loadStates();
        },
        visiblePlugins () {
            if (!this.busy) {
                this.pruneSelection();
            }
        }
    },
    mounted () {
        this.$bus.$on(this.searchEvent, this.changeQuery);
        const saved = savedViews.get(this.siteName);

        if (saved) {
            Object.assign(this, saved.filters);
        }

        this.syncSearch();

        this.loadStates().then(() => {
            this.$nextTick(() => {
                const collection = this.collectionElement();

                if (collection && saved) {
                    collection.scrollTop = saved.scrollTop;
                }
            });
        });
    },
    methods: {
        collectionElement () {
            return this.$refs.list && this.$refs.list.querySelector('.collection');
        },
        resetView () {
            this.dismissLoadError();
            this.generation += 1;
            this.query = '';
            this.statusFilter = 'any';
            this.syncSearch();
            this.noticeFilter = 'any';
            this.selectedItems = [];
            this.operation = '';
            this.confirmationOpen = false;
            this.processingName = '';
            this.frozenIds = null;
            this.detailsDirectory = '';
            this.pluginsStatus = {};
        },
        async loadStates () {
            if (this.busy) {
                return;
            }

            const generation = ++this.generation;
            const siteName = this.siteName;
            this.isLoading = true;
            this.loadError = false;

            try {
                const result = await mainProcessAPI.invoke('app-site-plugins:get-state', { siteName });

                if (generation !== this.generation || siteName !== this.siteName) {
                    return;
                }

                if (!result || !result.status) {
                    throw new Error('Plugin state unavailable');
                }

                this.pluginsStatus = result.states || {};
                this.dismissLoadError();
            } catch (error) {
                if (generation === this.generation && siteName === this.siteName) {
                    this.loadError = true;
                    this.showLoadError();
                }
            } finally {
                if (generation === this.generation && siteName === this.siteName) {
                    this.isLoading = false;
                }
            }
        },
        showLoadError () {
            if (this.loadErrorDialogOpen || this.disposed) {
                return;
            }

            const siteName = this.siteName;
            this.loadErrorDialogOpen = true;
            this.$bus.$emit('alert-display', {
                requestId: 'plugin-state-' + this._uid,
                message: escapeHTML(this.$t('tools.list.loadError')),
                okLabel: this.$t('tools.list.refresh'),
                okClick: () => {
                    this.loadErrorDialogOpen = false;

                    if (!this.disposed && siteName === this.siteName) {
                        this.loadStates();
                    }
                }
            });
        },
        dismissLoadError () {
            if (this.loadErrorDialogOpen) {
                this.$bus.$emit('alert-dismiss', 'plugin-state-' + this._uid);
                this.loadErrorDialogOpen = false;
            }
        },
        resetScroll () {
            this.pruneSelection();
            this.$nextTick(() => {
                const collection = this.collectionElement();

                if (collection) {
                    collection.scrollTop = 0;
                }
            });
        },
        changeQuery (value) {
            if (!this.busy) {
                const status = value.match(/^\s*is:(enabled|disabled)(?:\s+|$)/i);
                this.statusFilter = status ? status[1].toLowerCase() : 'any';
                this.query = status ? value.slice(status[0].length) : value;
                this.resetScroll();
            }
        },
        changePluginFilter (key, value) {
            if (this.busy) {
                return;
            }

            this[key] = value;

            if (key === 'statusFilter') {
                this.syncSearch();
            }

            this.resetScroll();
        },
        clearNoticeFilter () {
            if (this.busy) {
                return;
            }

            this.changePluginFilter('noticeFilter', 'any');
            this.$refs.noticeMenu.focusTrigger();
        },
        syncSearch () {
            if (this.$refs.search) {
                const status = this.statusFilter === 'any' ? '' : 'is:' + this.statusFilter;
                const value = [status, this.query].filter(Boolean).join(' ');
                this.$refs.search.value = value;
                this.$refs.search.isOpen = !!value;
            }
        },
        sortBy (column) {
            if (this.busy) {
                return;
            }

            this.order = this.orderBy === column && this.order === 'asc' ? 'desc' : 'asc';
            this.orderBy = column;
            this.resetScroll();
        },
        clearFilters () {
            if (this.busy) {
                return;
            }

            this.query = '';
            this.statusFilter = 'any';
            this.syncSearch();
            this.noticeFilter = 'any';
            this.resetScroll();
        },
        pruneSelection () {
            const visible = new Set(this.visiblePlugins.map(item => item.directory));
            this.selectedItems = this.selectedItems.filter(directory => visible.has(directory));
        },
        toggleSelection (directory) {
            if (this.busy || this.isLoading || this.loadError || !this.visiblePlugins.some(item => item.directory === directory)) {
                return;
            }

            this.selectedItems = this.selectedItems.includes(directory)
                ? this.selectedItems.filter(item => item !== directory)
                : this.selectedItems.concat(directory);
        },
        toggleAll () {
            if (!this.busy && !this.isLoading && !this.loadError) {
                CollectionCheckboxes.methods.toggleAllCheckboxes.call(this);
            }
        },
        iconFailed (directory) {
            Vue.set(this.brokenIcons, directory, true);
        },
        managePlugins () {
            if (!this.busy) {
                this.$router.push('/app-plugins');
            }
        },
        canConfigure (item) {
            return item.enabled && item.stateKnown && !item.incompatible && item.hasSettings;
        },
        canHintEnable (item) {
            return !this.busy && item.hasSettings && !item.enabled && canChangePlugin(item, true);
        },
        settingsUnavailableReason (item) {
            if (this.busy || this.canConfigure(item)) {
                return '';
            }

            if (!item.stateKnown) {
                return this.$t(this.isLoading ? 'ui.loading' : 'tools.list.unknownState');
            }

            if (item.incompatible) {
                return this.$t('tools.list.requiresVersion', { version: item.minimumPubliiVersion });
            }

            if (!item.hasSettings) {
                return this.$t('toolsPlugin.thisPluginHasNoOptions');
            }

            return this.$t('tools.list.enableForSettings');
        },
        openPlugin (item) {
            if (this.busy || !this.canConfigure(item)) {
                return;
            }

            this.$router.push('/site/' + encodeURIComponent(this.siteName) + '/plugins/' + encodeURIComponent(item.directory));
        },
        showDetails (item) {
            this.returnFocus = focusReturnTarget(document.activeElement);
            this.detailsDirectory = item.directory;
        },
        closeDetails () {
            const focus = this.returnFocus;
            this.detailsDirectory = '';
            this.$nextTick(() => {
                if (focus && focus.isConnected) {
                    focus.focus({ preventScroll: true });
                }
            });
        },
        detailsSettings () {
            const item = this.detailsPlugin;
            this.closeDetails();
            this.openPlugin(item);
        },
        detailsEnable () {
            const item = this.detailsPlugin;
            this.closeDetails();
            this.changeOne(item, true);
        },
        itemNotices (item) {
            const notices = [];

            if (item.incompatible) {
                notices.push({
                    type: 'incompatible',
                    label: this.$t('tools.list.requiresVersion', { version: item.minimumPubliiVersion })
                });
            }

            if (item.hasUpdate) {
                notices.push({
                    type: 'update',
                    label: this.$t('tools.list.updates')
                });
            }

            if (item.isDiscontinued) {
                notices.push({
                    type: 'discontinued',
                    label: this.$t('tools.list.discontinued')
                });
            }

            return notices;
        },
        statusLabel (item) {
            if (this.processingName === item.directory) {
                return this.$t(this.operation === 'enable' ? 'tools.list.enabling' : 'tools.list.disabling');
            }

            if (!item.stateKnown) {
                return this.$t(this.isLoading ? 'ui.loading' : 'tools.list.unknownState');
            }

            return this.$t(item.enabled ? 'tools.list.enabled' : 'tools.list.disabled');
        },
        pluginActions (item) {
            return [
                {
                    label: this.$t('tools.list.settings'),
                    icon: 'settings',
                    visible: item.hasSettings,
                    disabled: !this.canConfigure(item),
                    disabledReason: item.incompatible
                        ? this.$t('tools.list.requiresVersion', { version: item.minimumPubliiVersion })
                        : this.$t('tools.list.enableForSettings'),
                    onClick: () => this.openPlugin(item)
                },
                {
                    label: this.$t(item.enabled ? 'tools.list.disable' : 'tools.list.enable'),
                    icon: item.enabled ? 'power-off' : 'power',
                    disabled: !canChangePlugin(item, !item.enabled),
                    disabledReason: item.incompatible && !item.enabled
                        ? this.$t('tools.list.requiresVersion', { version: item.minimumPubliiVersion })
                        : this.$t('tools.list.unknownState'),
                    onClick: () => this.changeOne(item, !item.enabled)
                },
                { separator: true },
                {
                    label: this.$t('tools.list.details'),
                    icon: 'circle-info',
                    onClick: () => this.showDetails(item)
                },
                {
                    label: this.$t('tools.list.releaseNotes'),
                    icon: 'file-text',
                    visible: !!item.releaseNotes,
                    onClick: () => mainProcessAPI.shellOpenExternal(item.releaseNotes)
                },
                {
                    label: this.$t('tools.list.downloadUpdate'),
                    icon: 'download',
                    visible: !!item.download,
                    onClick: () => mainProcessAPI.shellOpenExternal(item.download)
                }
            ];
        },
        openContextMenu (event, item) {
            if (this.busy) {
                return;
            }

            event.preventDefault();
            const refs = this.$refs['actions-' + item.directory];
            const menu = Array.isArray(refs) ? refs[0] : refs;

            if (menu) {
                menu.open(event.type === 'keydown' ? 0 : null);
            }
        },
        changeOne (item, enabled) {
            if (!this.busy && canChangePlugin(item, enabled)) {
                return this.runChanges([item], enabled);
            }
        },
        bulkChange (enabled) {
            if (this.busy) {
                return;
            }

            const batch = (enabled ? this.enableCandidates : this.disableCandidates).slice();

            if (!batch.length) {
                return;
            }

            if (!enabled && batch.length > 1) {
                const generation = this.generation;
                const siteName = this.siteName;
                this.confirmationOpen = true;
                this.$bus.$emit('confirm-display', {
                    dialogLabel: this.$t('tools.list.disableCount', { count: batch.length }),
                    isDanger: true,
                    message: this.$t('tools.list.confirmDisable', {
                        count: batch.length,
                        names: batch.map(item => escapeHTML(item.name)).join(', ')
                    }),
                    okLabel: this.$t('tools.list.disableCount', { count: batch.length }),
                    cancelClick: () => {
                        this.confirmationOpen = false;
                    },
                    okClick: () => {
                        this.confirmationOpen = false;

                        if (generation === this.generation && siteName === this.siteName) {
                            return this.runChanges(batch, false, { notifySuccess: true });
                        }
                    }
                });
                return;
            }

            return this.runChanges(batch, enabled, { notifySuccess: true });
        },
        async runChanges (batch, enabled, { notifySuccess = false } = {}) {
            if (this.busy || !batch.length) {
                return;
            }

            const generation = this.generation;
            const siteName = this.siteName;
            const activeElement = document.activeElement;
            const activeMenu = activeElement && activeElement.closest
                ? activeElement.closest('.action-menu')
                : null;
            // Menu items disappear when the action closes the menu.
            const focus = (activeMenu && activeMenu.querySelector('[data-action-menu-trigger]')) || activeElement;
            const successful = new Set();
            const failed = [];
            this.frozenIds = this.visiblePlugins.map(item => item.id);
            this.operation = enabled ? 'enable' : 'disable';
            this.total = batch.length;
            this.completed = 0;

            for (const item of batch) {
                if (generation !== this.generation || siteName !== this.siteName) {
                    return;
                }

                this.processingName = item.directory;

                try {
                    const result = await mainProcessAPI.invoke('app-site-plugins:set-state', {
                        siteName,
                        pluginName: item.directory,
                        enabled
                    });

                    if (generation !== this.generation || siteName !== this.siteName) {
                        return;
                    }

                    if (!result || !result.status) {
                        throw new Error('Plugin state was not saved');
                    }

                    Vue.set(this.pluginsStatus, item.directory, enabled);
                    successful.add(item.directory);
                } catch (error) {
                    if (generation !== this.generation || siteName !== this.siteName) {
                        return;
                    }

                    failed.push(item);
                    Vue.set(this.switchVersions, item.directory, (this.switchVersions[item.directory] || 0) + 1);
                }

                this.completed += 1;
            }

            this.operation = '';
            this.processingName = '';
            this.frozenIds = null;
            this.selectedItems = this.selectedItems.filter(directory => !successful.has(directory));
            this.pruneSelection();
            const restoreFocus = () => this.$nextTick(() => {
                if (generation !== this.generation || siteName !== this.siteName) {
                    return;
                }

                if (focus && focus.isConnected && !focus.disabled) {
                    focus.focus({ preventScroll: true });
                } else if (this.$refs.search) {
                    const search = this.$refs.search;

                    const searchTarget = search.isOpen ? search.$refs['input-field'] : search.$refs.open;

                    if (searchTarget) {
                        searchTarget.focus({ preventScroll: true });
                    }
                }
            });

            if (failed.length) {
                this.$bus.$emit('alert-display', {
                    message: this.$t('tools.list.partialFailure', { done: successful.size, failed: failed.length }) +
                        '<br><br>' + failed.map(item => escapeHTML(item.name)).join('<br>'),
                    okClick: restoreFocus
                });
            } else {
                if (notifySuccess) {
                    this.$bus.$emit('message-display', {
                        message: this.$t(enabled ? 'tools.list.enabledSuccess' : 'tools.list.disabledSuccess'),
                        type: 'success',
                        lifeTime: 3
                    });
                }

                restoreFocus();
            }
        }
    },
    beforeDestroy () {
        this.disposed = true;
        this.dismissLoadError();
        this.$bus.$off(this.searchEvent, this.changeQuery);
        const collection = this.collectionElement();
        savedViews.set(this.siteName, {
            filters: {
                query: this.query,
                statusFilter: this.statusFilter,
                noticeFilter: this.noticeFilter,
                order: this.order,
                orderBy: this.orderBy
            },
            scrollTop: collection ? collection.scrollTop : 0
        });
        this.generation += 1;
    }
};
</script>

<style scoped>
@import "../css/collection-filters.css";
@import "../css/extension-notice-badges.css";
.site-plugins-page,
.site-plugins-content {
    display: flex;
    flex-direction: column;
    min-height: 0;
}

section.content.site-plugins-page {
    padding-bottom: 0;
}

.site-plugins-content {
    flex: 1;
}

.site-plugins-content > .heading {
    flex-shrink: 0;
}

.site-plugins-content ::v-deep .heading .title {
    flex-shrink: 0;
}

.site-plugins-content ::v-deep .heading .search {
    min-width: 0;
}

.filters {
    margin-bottom: var(--space-4);
}

.notice-filter-control {
    align-items: center;
    display: inline-flex;
    gap: var(--space-1);
    margin-left: var(--space-4);
    max-width: 100%;
}

.notice-filter-trigger {
    align-items: center;
    display: inline-flex;
    gap: var(--space-2);
}

.notice-filter-trigger > svg {
    fill: currentColor;
    flex-shrink: 0;
}

.notice-filter-clear {
    align-items: center;
    display: inline-flex;
    height: calc(1em * var(--line-height-base));
    justify-content: center;
    width: 2rem;
}

.notice-filter-clear > svg {
    color: var(--color-danger);
    flex-shrink: 0;
}

.site-plugins-list {
    display: flex;
    flex: 1;
    flex-direction: column;
    isolation: isolate;
    min-height: 12rem;
    position: relative;
}

.site-plugins-list ::v-deep .collection {
    grid-template-columns: auto minmax(0, 1fr) minmax(9rem, 15rem) auto auto !important;
}

.site-plugins-list ::v-deep .col {
    min-width: 0;
}

.item-identity {
    align-items: center;
    display: flex;
    gap: var(--space-8);
    min-width: 0;
}

.item-identity > img,
.item-identity > svg {
    flex: 0 0 36px;
    height: 36px;
    object-fit: contain;
    width: 36px;
}

.item-copy {
    min-width: 0;
}

.item-heading {
    align-items: baseline;
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2) var(--space-3);
}

.item-name {
    background: none;
    border: 0;
    color: var(--link-invert-color);
    cursor: pointer;
    font-family: inherit;
    font-size: var(--font-size-ui-md);
    font-weight: var(--font-weight-medium);
    overflow-wrap: anywhere;
    padding: 0;
    text-align: left;
}

.item-name.is-inactive {
    color: var(--text-primary-color);
    cursor: default;
}

.item-description {
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    color: var(--text-light-color);
    display: -webkit-box;
    font-size: var(--font-size-ui-sm);
    line-height: var(--line-height-base);
    margin: var(--space-1) 0 0;
    max-width: 52ch;
    overflow: hidden;
    overflow-wrap: anywhere;
}

.plugin-version {
    align-items: flex-start;
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    overflow-wrap: anywhere;
}

.item-notice:not(.extension-notice-badge),
.compact-version {
    color: var(--text-light-color);
    font-size: var(--font-size-ui-xs);
}

.compact-version {
    align-items: center;
    display: none;
    flex-wrap: wrap;
    gap: var(--space-2);
}

.extension-notice-badge {
    max-width: 100%;
}

.plugin-state {
    align-items: center;
    display: flex;
    gap: var(--space-4);
    justify-content: space-between;
    min-width: 12rem;
}

.plugin-state > span:first-child {
    max-width: 9rem;
    overflow-wrap: anywhere;
}

.plugin-switch ::v-deep .switcher::before {
    border: 2px solid var(--link-primary-color);
    border-radius: inherit;
    content: '';
    inset: -2px;
    opacity: 0;
    pointer-events: none;
    position: absolute;
}

.can-enable-settings:has(.item-name:hover) ::v-deep .plugin-switch .switcher,
.can-enable-settings:has(.item-name:focus-visible) ::v-deep .plugin-switch .switcher {
    animation: plugin-enable-nudge .6s ease-in-out .5s;
}

.can-enable-settings:has(.item-name:hover) ::v-deep .plugin-switch .switcher::before,
.can-enable-settings:has(.item-name:focus-visible) ::v-deep .plugin-switch .switcher::before {
    animation: plugin-enable-hint 1.2s ease-out .5s 2;
}

.can-enable-settings:has(.item-name:focus-visible) ::v-deep .plugin-switch .switcher,
.can-enable-settings:has(.item-name:focus-visible) ::v-deep .plugin-switch .switcher::before {
    animation-delay: 0s;
}

@keyframes plugin-enable-nudge {
    from,
    to {
        transform: translateX(0);
    }

    25% {
        transform: translateX(-2px);
    }

    50% {
        transform: translateX(2px);
    }

    75% {
        transform: translateX(-1px);
    }
}

@keyframes plugin-enable-hint {
    from {
        inset: -2px;
        opacity: .9;
    }

    to {
        inset: -12px;
        opacity: 0;
    }
}

@media (prefers-reduced-motion: reduce) {
    .can-enable-settings:has(.item-name:hover) ::v-deep .plugin-switch .switcher,
    .can-enable-settings:has(.item-name:focus-visible) ::v-deep .plugin-switch .switcher {
        animation: none;
    }

    .can-enable-settings:has(.item-name:hover) ::v-deep .plugin-switch .switcher::before,
    .can-enable-settings:has(.item-name:focus-visible) ::v-deep .plugin-switch .switcher::before {
        animation: none;
        inset: -4px;
        opacity: .85;
    }
}

.bulk-actions {
    align-items: center;
    display: flex;
    gap: var(--space-3);
    max-width: calc(100% - 5rem);
}


button:focus-visible,
a:focus-visible,
input:focus-visible,
select:focus-visible {
    outline: 2px solid var(--input-border-focus);
    outline-offset: 2px;
}

button:disabled {
    cursor: default;
    opacity: .5;
}

.visually-hidden {
    clip-path: inset(50%);
    height: 1px;
    overflow: hidden;
    position: absolute;
    white-space: nowrap;
    width: 1px;
}

@media (max-width: 1250px) {
    .site-plugins-list ::v-deep .collection {
        grid-template-columns: auto minmax(0, 1fr) auto auto !important;
    }

    .site-plugins-list ::v-deep .col.version-column {
        display: none;
    }

    .compact-version {
        display: flex;
        margin-top: var(--space-2);
    }

}
</style>
