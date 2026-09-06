<template>
    <section class="content file-manager">
        <p-header :title="$t('file.files')">
            <header-search
                v-show="items.length"
                slot="search"
                ref="search"
                :placeholder="$t('file.filterOrSearchFiles')"
                :onChangeEventName="searchEvent" />
            <p-button
                slot="buttons"
                :onClick="goBack"
                appearance="clean"
                back
                :disabled="busy">
                {{ $t('ui.backToTools') }}
            </p-button>
            <p-button
                v-if="!showEmptyState"
                slot="buttons"
                :onClick="addNewFile"
                appearance="secondary"
                icon="plus"
                :disabled="busy || isLoading">
                {{ $t('file.addNewFile') }}
            </p-button>
            <p-button
                v-if="!showEmptyState"
                slot="buttons"
                :onClick="uploadFiles"
                icon="upload-file"
                :disabled="busy || isLoading"
                :loading="operation === 'upload'"
                loading-layout="overlay"
                :aria-label="operation === 'upload' ? $t('file.manager.addingFiles') : $t('file.uploadFiles')">
                {{ $t('file.uploadFiles') }}
            </p-button>
        </p-header>

        <div class="filters">
            <div
                role="group"
                :aria-label="$t('file.manager.location')">
                <button
                    v-for="directory in directories"
                    :key="directory.path"
                    type="button"
                    :class="{ 'directory-link': true, 'is-active': dirPath === directory.path }"
                    :aria-pressed="dirPath === directory.path ? 'true' : 'false'"
                    :disabled="busy"
                    @click="changeDirectory(directory.path)">
                    <icon
                        name="folder"
                        size="s"
                        non-interactive
                        :primaryColor="dirPath === directory.path ? 'color-1' : 'color-7'" />
                    {{ directory.label }}
                </button>
            </div>
            <p-button
                v-if="!showEmptyState"
                class="refresh-button"
                appearance="clean"
                size="small"
                :disabled="busy || isLoading"
                :onClick="refreshFiles">
                <span class="refresh-content">
                    <icon
                        name="refresh"
                        :class="{ 'is-refreshing': isRefreshing }"
                        size="xs"
                        non-interactive />
                    {{ $t('file.manager.refresh') }}
                </span>
            </p-button>
        </div>

        <div
            v-if="operation === 'upload' || operation === 'duplicate'"
            class="transfer-status">
            <div
                role="status"
                aria-live="polite">{{
                    operation === 'duplicate'
                        ? $t('file.manager.duplicating')
                        : $t('file.manager.progress', { done: completed, total: total })
                }}</div>
            <progress-bar
                :progress="total ? (completed / total) * 100 : 0"
                role="progressbar"
                :aria-label="$t(operation === 'duplicate' ? 'file.manager.duplicating' : 'file.manager.addingFiles')"
                :aria-valuenow="completed"
                :aria-valuemax="total"
                aria-valuemin="0" />
            <p-button
                v-if="operation === 'upload'"
                appearance="clean"
                size="small"
                :disabled="stopRequested"
                :onClick="stopUpload">
                {{ $t(stopRequested ? 'file.manager.stopping' : 'file.manager.stopRemaining') }}
            </p-button>
        </div>

        <p
            v-if="isLoading"
            class="file-loading"
            role="status">{{ $t('ui.loading') }}</p>

        <div
            v-if="items.length || showEmptyState"
            :class="items.length ? 'file-list' : 'file-empty-state'"
            :aria-busy="isLoading ? 'true' : 'false'"
            @dragenter.stop.prevent="showDropOverlay"
            @dragover.stop.prevent="showDropOverlay"
            @dragleave.stop.prevent="hideDropOverlay"
            @drop.stop.prevent="dropFiles">
            <collection
                v-if="filteredFiles.length"
                :columns="6">
                <collection-header slot="header">
                    <collection-cell>
                        <checkbox
                            value="file-manager-all"
                            :checked="allVisibleSelected"
                            :onClick="toggleAllCheckboxes"
                            :disabled="busy || isLoading || !selectableFiles.length"
                            :aria-label="$t('file.manager.selectAll')" />
                    </collection-cell>
                    <collection-cell
                        v-for="column in columns"
                        :key="column.field"
                        :variant="column.field === 'size' ? 'file-size' : ''">
                        <collection-sort-button
                            :label="column.label"
                            :active="orderBy === column.field"
                            :order="order"
                            :disabled="busy"
                            @click="ordering(column.field)" />
                    </collection-cell>
                    <collection-cell variant="menu">
                        <span class="visually-hidden">{{ $t('file.operations') }}</span>
                    </collection-cell>
                    <div
                        v-if="anyCheckboxIsSelected"
                        class="tools">
                        <p-button
                            icon="trash"
                            appearance="light"
                            size="small"
                            :disabled="busy || isLoading"
                            :onClick="bulkDelete">
                            {{ $t('ui.delete') }}
                        </p-button>
                    </div>
                </collection-header>
                <collection-row
                    v-for="item in filteredFiles"
                    :key="dirPath + '/' + item.name"
                    slot="content">
                    <collection-cell>
                        <checkbox
                            :value="item.name"
                            :checked="selectedItems.includes(item.name)"
                            :onClick="toggleSelection"
                            :disabled="busy || isLoading || !item.isFile"
                            :aria-label="$t('file.manager.selectFile', { filename: item.name })" />
                    </collection-cell>
                    <collection-cell variant="titles">
                        <a
                            :href="item.name"
                            class="file-link"
                            :aria-disabled="busy ? 'true' : null"
                            :title="item.name"
                            @click.prevent="openFile(item)">
                            <icon
                                :name="item.icon"
                                iconset="svg-map-file-extensions"
                                customWidth="22"
                                customHeight="24"
                                :customCssClasses="'file ' + item.icon"
                                non-interactive />
                            {{ item.name }}
                        </a>
                    </collection-cell>
                    <collection-cell variant="file-size">{{ item.isFile ? formatBytes(item.size) : '—' }}</collection-cell>
                    <collection-cell>{{ formattedDate(item.createdAt) }}</collection-cell>
                    <collection-cell>{{ formattedDate(item.modifiedAt) }}</collection-cell>
                    <collection-cell variant="menu">
                        <action-menu
                            :ref="'file-actions-' + item.name"
                            :items="fileActions(item)"
                            :disabled="busy || isLoading"
                            :label="$t('file.manager.actions', { filename: item.name })" />
                    </collection-cell>
                </collection-row>
            </collection>
            <empty-state
                v-else-if="items.length"
                :description="$t('file.noFileMatchingCriteriaInfo')" />
            <empty-state
                v-else
                illustrationName="file-manager"
                illustrationWidth="344"
                illustrationHeight="286"
                :title="$t('file.manager.emptyTitle')"
                :description="$t('file.manager.emptyDescription')">
                <div
                    slot="button"
                    class="file-empty-actions">
                    <p-button
                        :onClick="addNewFile"
                        appearance="secondary"
                        icon="plus"
                        :disabled="busy || isLoading">
                        {{ $t('file.addNewFile') }}
                    </p-button>
                    <p-button
                        icon="upload-file"
                        :onClick="uploadFiles"
                        :disabled="busy || isLoading"
                        :loading="operation === 'upload'"
                        loading-layout="overlay"
                        :aria-label="operation === 'upload' ? $t('file.manager.addingFiles') : $t('file.uploadFiles')">
                        {{ $t('file.uploadFiles') }}
                    </p-button>
                </div>
            </empty-state>
            <overlay
                v-if="fileIsOver"
                appearance="drop-zone"
                class="file-drop-overlay">
                <div>{{ $t('file.manager.dropFiles', { directory: directoryLabel }) }}</div>
            </overlay>
        </div>
    </section>
</template>

<script>
import BackToTools from './mixins/BackToTools.js';
import CollectionCheckboxes from './mixins/CollectionCheckboxes.js';
import CollectionOrdering from './mixins/CollectionOrdering.js';
import CollectionSortButton from './basic-elements/CollectionSortButton.vue';
import { fileWebsiteURL, sortFiles } from '../helpers/file-manager.js';

export default {
    name: 'file-manager',
    mixins: [BackToTools, CollectionCheckboxes],
    components: { CollectionSortButton },
    data () {
        return {
            items: [],
            selectedItems: [],
            filterValue: '',
            dirPath: 'root-files',
            orderBy: 'name',
            order: 'ASC',
            isLoading: false,
            isRefreshing: false,
            loadError: false,
            operation: '',
            fileIsOver: false,
            failures: [],
            total: 0,
            completed: 0,
            stopRequested: false,
            conflict: null,
            applyToAll: false
        };
    },
    computed: {
        busy () {
            return !!this.operation;
        },
        showEmptyState () {
            return !this.items.length && !this.isLoading && !this.loadError;
        },
        searchEvent () {
            return 'files-filter-value-changed-' + this._uid;
        },
        directories () {
            return [
                { path: 'root-files', label: this.$t('file.rootDirectory') },
                { path: 'media/files', label: this.$t('file.mediaFiles') }
            ];
        },
        directoryLabel () {
            return this.directories.find(item => item.path === this.dirPath).label;
        },
        columns () {
            return [
                { field: 'name', label: this.$t('file.filename') },
                { field: 'size', label: this.$t('file.fileSize') },
                { field: 'createdAt', label: this.$t('file.creationDate') },
                { field: 'modifiedAt', label: this.$t('ui.lastModified') }
            ];
        },
        filteredFiles () {
            const query = this.filterValue.trim().toLocaleLowerCase();
            return sortFiles(
                this.items.filter(file => file.name.toLocaleLowerCase().includes(query)),
                this.orderBy,
                this.order,
                this.$i18n.locale
            );
        },
        selectableFiles () {
            return this.filteredFiles.filter(item => item.isFile);
        },
        allVisibleSelected () {
            return (
                this.selectableFiles.length > 0 &&
                this.selectableFiles.every(file => this.selectedItems.includes(file.name))
            );
        }
    },
    created () {
        this._readID = 0;
        this._disposed = false;
    },
    mounted () {
        this.$bus.$on(this.searchEvent, this.filterFiles);
        window.addEventListener('focus', this.refreshOnFocus);
        this.loadFiles();
    },
    beforeDestroy () {
        this._disposed = true;
        this._readID++;
        this.stopRequested = true;
        this.resolveConflict('stop');
        this.$bus.$off(this.searchEvent, this.filterFiles);
        window.removeEventListener('focus', this.refreshOnFocus);
    },
    beforeRouteLeave (to, from, next) {
        next(!this.busy);
    },
    methods: {
        context () {
            return { siteName: this.$store.state.currentSite.config.name, dirPath: this.dirPath };
        },
        currentContext (context) {
            return (
                !this._disposed &&
                context.siteName === this.$store.state.currentSite.config.name &&
                context.dirPath === this.dirPath
            );
        },
        async request (operation, config) {
            try {
                return (
                    (await mainProcessAPI.invoke('app-file-manager:' + operation, config)) || {
                        status: false,
                        code: 'failed'
                    }
                );
            } catch (_) {
                return { status: false, code: 'failed' };
            }
        },
        async refreshFiles () {
            if (this.busy || this.isLoading || this._disposed) {
                return;
            }

            this.isRefreshing = true;

            try {
                await this.loadFiles();
            } finally {
                this.isRefreshing = false;
            }
        },
        async loadFiles () {
            const context = this.context();
            const readID = ++this._readID;
            this.isLoading = true;
            const result = await this.request('list', context);
            if (readID !== this._readID || !this.currentContext(context)) return;
            this.isLoading = false;
            this.loadError = !result.status;
            if (!result.status) {
                this.notify(this.$t('file.manager.loadError'), true);
                return;
            }
            this.items = result.files;
            this.selectedItems = this.selectedItems.filter(name =>
                this.items.some(file => file.isFile && file.name === name)
            );
        },
        refreshOnFocus () {
            if (!this.busy && !this.isLoading && !document.body.classList.contains('has-popup-visible'))
                this.loadFiles();
        },
        changeDirectory (directory) {
            if (this.busy || this.dirPath === directory || !this.directories.some(item => item.path === directory))
                return;
            this.dirPath = directory;
            this.items = [];
            this.selectedItems = [];
            this.filterValue = '';
            this.failures = [];
            if (this.$refs.search) {
                this.$refs.search.value = '';
                this.$refs.search.isOpen = false;
            }
            this.loadFiles();
        },
        filterFiles (value) {
            this.filterValue = value;
            this.selectedItems = [];
        },
        ordering (field) {
            if (this.busy) return;
            CollectionOrdering.methods.ordering.call(this, field);
        },
        saveOrdering (orderBy, order) {
            this.orderBy = orderBy;
            this.order = order;
        },
        toggleSelection (name) {
            if (this.busy || this.isLoading || !this.selectableFiles.some(file => file.name === name)) return;
            CollectionCheckboxes.methods.toggleSelection.call(this, name);
        },
        toggleAllCheckboxes () {
            if (this.busy || this.isLoading) return;
            this.selectedItems = this.allVisibleSelected ? [] : this.selectableFiles.map(file => file.name);
        },
        formatBytes (bytes) {
            if (!Number.isFinite(bytes) || bytes < 0) return '—';
            if (bytes === 0) return '0 bytes';
            const index = Math.min(4, Math.floor(Math.log(bytes) / Math.log(1024)));
            return (
                parseFloat((bytes / Math.pow(1024, index)).toFixed(2)) + ' ' + ['bytes', 'kB', 'MB', 'GB', 'TB'][index]
            );
        },
        formattedDate (date) {
            return this.$moment(date).format(
                this.$store.state.app.config.timeFormat == 12 ? 'MMM DD, YYYY hh:mm a' : 'MMM DD, YYYY HH:mm'
            );
        },
        fileActions (file) {
            const platform = mainProcessAPI.getEnv().platformName;
            return [
                {
                    label: this.$t('file.manager.open'),
                    icon: 'open-new-window',
                    onClick: () => this.openFile(file)
                },
                {
                    label: this.$t(
                        platform === 'darwin'
                            ? 'file.manager.showFinder'
                            : platform === 'win32'
                            ? 'file.manager.showExplorer'
                            : 'file.manager.showFolder'
                    ),
                    icon: 'folder-opened-2',
                    onClick: () => this.showInFolder(file)
                },
                {
                    separator: true
                },
                {
                    label: this.$t('file.manager.copyURL'),
                    icon: 'link-2',
                    visible: file.isFile,
                    disabled: !this.websiteURL(file),
                    onClick: () => this.copyURL(file)
                },
                {
                    label: this.$t('file.manager.copyLocalPath'),
                    icon: 'clipboard-copy',
                    disabled: !file.fullPath,
                    onClick: () => this.copyLocalPath(file)
                },
                {
                    separator: true,
                    visible: file.isFile
                },
                {
                    label: this.$t('file.manager.duplicateFile'),
                    icon: 'duplicate',
                    visible: file.isFile,
                    onClick: () => this.duplicateFile(file)
                },
                {
                    label: this.$t('file.manager.replaceFile'),
                    icon: 'file-input',
                    visible: file.isFile,
                    onClick: () => this.replaceFile(file)
                },
                {
                    separator: true,
                    visible: file.isFile
                },
                {
                    label: this.$t('ui.delete'),
                    icon: 'trash',
                    intent: 'danger',
                    visible: file.isFile,
                    onClick: () => this.confirmDelete([file])
                }
            ];
        },
        async duplicateFile (file) {
            if (this.busy || this.isLoading || !file.isFile) return;
            const context = this.context();
            const actions = this.$refs['file-actions-' + file.name];
            const menu = Array.isArray(actions) ? actions[0] : actions;
            const restoreFocus = menu && menu.$el.contains(document.activeElement);
            this.operation = 'duplicate';
            this.fileIsOver = false;
            this.failures = [];
            this.completed = 0;
            this.total = 1;
            const result = await this.request('upload', {
                ...context,
                source: file.fullPath,
                name: file.name,
                policy: 'keep-both',
                sourceRevision: file.revision
            });
            this.operation = '';
            if (!this.currentContext(context)) return;
            this.completed = result.status ? 1 : 0;
            this.notify(
                result.status
                    ? this.$t('file.manager.duplicated', { filename: result.name })
                    : this.errorMessage(result.code),
                !result.status
            );
            await this.loadFiles();
            this.$nextTick(() => {
                if (restoreFocus && !this._disposed && menu.$el.isConnected && document.activeElement === document.body)
                    menu.focusTrigger();
            });
        },
        websiteURL (file) {
            return fileWebsiteURL(this.$store.state.currentSite.config.domain, this.dirPath, file.name);
        },
        async openFile (file) {
            if (this.busy) return;
            try {
                if (await mainProcessAPI.shellOpenPath(file.fullPath))
                    this.notify(this.$t('file.manager.openError'), true);
            } catch (_) {
                this.notify(this.$t('file.manager.openError'), true);
            }
        },
        async showInFolder (file) {
            if (this.busy) return;
            try {
                await mainProcessAPI.shellShowItemInFolder(file.fullPath);
            } catch (_) {
                this.notify(this.$t('file.manager.openError'), true);
            }
        },
        async copyURL (file) {
            const url = this.websiteURL(file);
            if (this.busy || !url) return;
            try {
                await navigator.clipboard.writeText(url);
                this.notify(this.$t('file.manager.copied'));
            } catch (_) {
                this.notify(this.$t('file.manager.copyError'), true);
            }
        },
        async copyLocalPath (file) {
            if (this.busy || !file.fullPath) return;
            try {
                await navigator.clipboard.writeText(file.fullPath);
                this.notify(this.$t('file.manager.localPathCopied'));
            } catch (_) {
                this.notify(this.$t('file.manager.copyLocalPathError'), true);
            }
        },
        notify (message, error = false, failures = []) {
            if (this._disposed) return;
            if (error && failures.length) {
                this.$bus.$emit('alert-display', {
                    message:
                        message +
                        '<br><br>' +
                        failures
                            .map(file => this.quotedName(file.name) + ': ' + this.errorMessage(file.code))
                            .join('<br>')
                });
            } else {
                this.$bus.$emit('message-display', { message, type: error ? 'warning' : 'success', lifeTime: 3 });
            }
        },
        errorMessage (code) {
            const known = [
                'permission',
                'missing',
                'space',
                'exists',
                'invalid-name',
                'files-only',
                'folder-upload-unsupported',
                'same-file',
                'changed',
                'extension'
            ];
            return this.$t('file.manager.errors.' + (known.includes(code) ? code : 'failed'));
        },
        quotedName (name) {
            const element = document.createElement('strong');
            element.textContent = name;
            element.style.overflowWrap = 'anywhere';
            return element.outerHTML;
        },
        addNewFile () {
            if (this.busy || this.isLoading) return;
            const context = this.context();
            this.$bus.$emit('confirm-display', {
                dialogLabel: this.$t('file.addNewFile'),
                message: this.$t('file.manager.newFile'),
                hasInput: true,
                okLabel: this.$t('file.addNewFile'),
                validate: name => !!name.trim() || this.$t('file.manager.errors.invalid-name'),
                okClick: name => this.createFile(name, context)
            });
        },
        async createFile (name, context) {
            if (this.busy || !this.currentContext(context)) return;
            this.operation = 'create';
            this.failures = [];
            const result = await this.request('create', { ...context, name: name.trim() });
            this.notify(
                result.status ? this.$t('file.manager.created') : this.errorMessage(result.code),
                !result.status
            );
            this.operation = '';
            if (this.currentContext(context)) await this.loadFiles();
        },
        bulkDelete () {
            this.confirmDelete(this.items.filter(file => this.selectedItems.includes(file.name) && file.isFile));
        },
        confirmDelete (files) {
            if (this.busy || this.isLoading || !files.length) return;
            const context = this.context();
            const targets = files.map(file => ({ name: file.name, revision: file.revision }));
            this.$bus.$emit('confirm-display', {
                dialogLabel: this.$t('ui.delete'),
                message: this.$t('file.manager.deleteConfirm', {
                    files: targets.map(file => this.quotedName(file.name)).join(', ')
                }),
                isDanger: true,
                okLabel: this.$t('ui.delete'),
                okClick: () => this.deleteFiles(targets, context)
            });
        },
        async deleteFiles (files, context) {
            if (this.busy || !this.currentContext(context)) return;
            this.operation = 'delete';
            this.failures = [];
            const result = await this.request('delete', { ...context, files });
            this.failures = result.failed || [];
            this.notify(
                result.status ? this.$t('file.removeFilesSuccessMsg') : this.$t('file.manager.deleteError'),
                !result.status,
                this.failures
            );
            this.selectedItems = this.selectedItems.filter(name => !(result.deleted || []).includes(name));
            this.operation = '';
            if (this.currentContext(context)) await this.loadFiles();
        },
        fileExtension (filename) {
            const name = filename.split(/[/\\]/).pop();
            const dot = name.lastIndexOf('.');
            return dot > 0 ? name.slice(dot + 1).toLowerCase() : '';
        },
        async pickFiles (multiple, filters = []) {
            return mainProcessAPI.invoke('app-main-process-select-files', false, filters, {
                returnResult: true,
                multiple
            });
        },
        async uploadFiles () {
            if (this.busy || this.isLoading) return;
            const context = this.context();
            this.operation = 'pick';
            try {
                const result = await this.pickFiles(true);
                this.operation = '';
                if (result && !result.canceled && this.currentContext(context))
                    await this.uploadQueue(result.filePaths, context);
            } catch (_) {
                this.operation = '';
                this.notify(this.errorMessage('failed'), true);
            }
        },
        async replaceFile (file) {
            if (this.busy || this.isLoading || !file.isFile) return;
            const context = this.context();
            const target = { name: file.name, revision: file.revision };
            this.operation = 'pick';
            try {
                const extension = this.fileExtension(file.name);
                const result = await this.pickFiles(
                    false,
                    extension ? [{ name: extension.toUpperCase(), extensions: [extension] }] : []
                );
                this.operation = '';
                if (!result || result.canceled || !result.filePaths.length || !this.currentContext(context)) return;
                const source = result.filePaths[0];
                if (this.fileExtension(source) !== extension) {
                    this.$bus.$emit('confirm-display', {
                        dialogLabel: this.$t('file.manager.replaceFile'),
                        message: this.$t(extension ? 'file.manager.replaceFormat' : 'file.manager.replaceNoExtension', {
                            filename: this.quotedName(target.name),
                            extension: this.quotedName('.' + extension)
                        }),
                        okLabel: this.$t('file.manager.chooseFile'),
                        okClick: () => {
                            if (this.currentContext(context)) this.replaceFile(file);
                        }
                    });
                    return;
                }
                this.$bus.$emit('confirm-display', {
                    dialogLabel: this.$t('file.manager.replaceFile'),
                    message: this.$t('file.manager.replaceConfirm', {
                        filename: this.quotedName(target.name),
                        source: this.quotedName(source.split(/[/\\]/).pop())
                    }),
                    okLabel: this.$t('file.manager.replace'),
                    okClick: () => this.uploadQueue([source], context, target)
                });
            } catch (_) {
                this.operation = '';
                this.notify(this.errorMessage('failed'), true);
            }
        },
        async uploadQueue (paths, context, replacement = null) {
            if (this.busy || !this.currentContext(context) || !paths.length) return;
            this.operation = 'upload';
            this.fileIsOver = false;
            this.failures = [];
            this.completed = 0;
            this.total = paths.length;
            this.stopRequested = false;
            this.applyToAll = false;
            let rememberedChoice = '';
            let added = 0;
            let skipped = 0;
            for (const source of paths.slice()) {
                if (this.stopRequested || !this.currentContext(context)) break;
                const config = { ...context, source, policy: replacement ? 'replace' : 'skip', ...(replacement || {}) };
                let result = await this.request('upload', config);
                if (!this.currentContext(context)) break;
                if (!replacement && result.code === 'exists' && !this.stopRequested) {
                    let choice = rememberedChoice || (await this.chooseConflict(result));
                    if (this.applyToAll && choice !== 'stop') rememberedChoice = choice;
                    if (choice === 'stop') break;
                    if (choice === 'skip') {
                        skipped++;
                        this.completed++;
                        continue;
                    }
                    result = await this.request('upload', { ...config, policy: choice, revision: result.revision });
                }
                if (result.status) added++;
                else this.failures.push({ name: source.split(/[/\\]/).pop(), code: result.code });
                this.completed++;
            }
            const remaining = this.total - this.completed;
            this.operation = '';
            if (!this.currentContext(context)) return;
            if (replacement) {
                this.notify(
                    this.failures.length
                        ? this.$t('file.manager.replaceError', { filename: this.quotedName(replacement.name) })
                        : this.$t('file.manager.replaced'),
                    this.failures.length > 0,
                    this.failures
                );
                await this.loadFiles();
                return;
            }
            const summary = [
                added ? this.$t('file.manager.addedCount', { count: added }) : '',
                skipped ? this.$t('file.manager.skippedCount', { count: skipped }) : '',
                this.failures.length ? this.$t('file.manager.failedCount', { count: this.failures.length }) : '',
                remaining ? this.$t('file.manager.remainingCount', { count: remaining }) : ''
            ]
                .filter(Boolean)
                .join(' ');
            this.notify(summary, this.failures.length > 0, this.failures);
            if (this.currentContext(context)) await this.loadFiles();
        },
        chooseConflict (result) {
            this.conflict = result;
            return new Promise(resolve => {
                this._conflictDecision = resolve;
                this.$bus.$emit('confirm-display', {
                    dialogLabel: this.$t('file.manager.duplicateTitle'),
                    message: this.$t('file.manager.duplicate', { filename: this.quotedName(result.name) }),
                    choiceLabel: this.$t('file.manager.duplicateTitle'),
                    choices: ['skip', 'replace', 'keep-both'].map(value => ({
                        value,
                        label: this.$t('file.manager.' + (value === 'keep-both' ? 'keepBoth' : value))
                    })),
                    choice: 'skip',
                    checkLabel: this.$t('file.manager.applyToAll'),
                    okLabel: this.$t('ui.ok'),
                    cancelLabel: this.$t('file.manager.stopRemaining'),
                    okClick: (choice, applyToAll) => {
                        this.applyToAll = applyToAll;
                        this.resolveConflict(choice);
                    },
                    cancelClick: this.stopUpload
                });
            });
        },
        resolveConflict (choice) {
            this.conflict = null;
            if (this._conflictDecision) {
                const resolve = this._conflictDecision;
                this._conflictDecision = null;
                resolve(choice);
            }
        },
        stopUpload () {
            this.stopRequested = true;
            this.resolveConflict('stop');
        },
        showDropOverlay (event) {
            if (this.busy || this.isLoading || document.body.classList.contains('has-popup-visible')) return;
            if (event.dataTransfer && Array.from(event.dataTransfer.types).includes('Files')) this.fileIsOver = true;
        },
        hideDropOverlay (event) {
            if (!event.relatedTarget || !event.currentTarget.contains(event.relatedTarget)) {
                this.fileIsOver = false;
            }
        },
        async dropFiles (event) {
            this.fileIsOver = false;
            if (this.busy || this.isLoading || document.body.classList.contains('has-popup-visible')) return;
            const context = this.context();
            const files = Array.from(event.dataTransfer.files);
            if (!files.length) return;
            this.operation = 'pick';
            try {
                const paths = await Promise.all(files.map(file => mainProcessAPI.getPathForFile(file)));
                this.operation = '';
                await this.uploadQueue(paths, context);
            } catch (_) {
                this.operation = '';
                this.notify(this.errorMessage('failed'), true);
            }
        }
    }
};
</script>

<style scoped>
.file-manager {
    display: flex;
    flex-direction: column;
    overflow: auto;

    & > .heading {
        flex-shrink: 0;
    }

    .filters {
        display: flex;
        flex-shrink: 0;
        align-items: flex-start;
        justify-content: space-between;
        font-size: 1.35rem;
        line-height: var(--line-height-base);
        min-height: calc(1.35rem * var(--line-height-base) + 8px);
        margin-top: -2.2rem;
        margin-bottom: var(--space-6);
    }

    .refresh-button {
        align-items: center;
        display: inline-flex;
        font-size: inherit;
        height: auto;
        line-height: inherit;
        margin-top: 8px;
        padding: 0;
    }

    .refresh-content {
        align-items: center;
        display: inline-flex;
        gap: 6px;

        .is-refreshing {
            animation: file-manager-refresh .8s linear .2s infinite;
        }
    }

    .directory-link {
        align-items: baseline;
        display: inline-flex;
        appearance: none;
        background: transparent;
        border: 0;
        padding: 0;
        color: var(--text-light-color);
        cursor: pointer;
        font: inherit;
        font-size: 1.35rem;
        transition: var(--transition-default);
        &:hover,
        &.is-active {
            color: var(--link-primary-color);
        }

        & + .directory-link {
            margin-left: var(--space-8);
        }

        &:disabled {
            cursor: default;
        }
    }

    .file-loading {
        font-size: var(--font-size-ui-sm);
        color: var(--text-light-color);
    }

    .file-empty-state {
        flex: 1;
        min-height: 420px;
        position: relative;
    }

    .file-empty-state > .empty-state {
        top: calc(40% - clamp(0px, calc(20vh - 120px), 58px));
    }

    .file-empty-actions {
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        gap: var(--space-1);
    }

    .file-list {
        flex: 1;
        min-height: 0;
        position: relative;
        display: flex;
        flex-direction: column;
    }

    .file-list ::v-deep .collection-wrapper {
        flex: 1;
        min-height: 0;
        position: relative;
    }

    .file-list ::v-deep .collection {
        top: 0;
        width: 100%;
    }

    .file-link {
        overflow-wrap: anywhere;
    }

    .file-link:focus-visible,
    .directory-link:focus-visible,
    input:focus-visible {
        outline: 2px solid var(--input-border-focus);
        outline-offset: 2px;
    }

    .transfer-status {
        flex-shrink: 0;
        font-size: var(--font-size-ui-sm);
        margin-bottom: var(--space-4);
        overflow-wrap: anywhere;
    }

    .transfer-status ::v-deep .progress-wrapper {
        padding: var(--space-3) 0;
    }

    .file-drop-overlay {
        position: absolute;
        z-index: var(--layer-overlay);
        pointer-events: none;
    }

    .visually-hidden {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        overflow: hidden;
        clip-path: inset(50%);
        white-space: nowrap;
    }
}
@keyframes file-manager-refresh {
    to {
        transform: rotate(-360deg);
    }
}

@media (prefers-reduced-motion: reduce) {
    .file-manager .refresh-content .is-refreshing {
        animation: none;
    }
}
</style>
