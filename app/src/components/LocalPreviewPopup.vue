<template>
    <div
        v-if="isVisible"
        class="overlay">
        <div
            ref="dialog"
            class="popup local-preview-popup"
            role="dialog"
            aria-modal="true"
            aria-labelledby="local-preview-title"
            tabindex="-1">
            <header class="local-preview-header">
                <h2 id="local-preview-title">{{ $t('localPreview.title') }}</h2>
            </header>

            <div class="local-preview-content">
                <section
                    class="local-preview-section"
                    aria-labelledby="local-preview-server-title">
                    <h3 id="local-preview-server-title">
                        <icon
                            name="local-preview-server"
                            size="s"
                            non-interactive
                            aria-hidden="true" />
                        {{ $t('localPreview.server') }}
                    </h3>

                    <div
                        class="local-preview-row"
                        :class="{ 'is-stopped': !isRunning }">
                        <p
                            :class="{ 'local-preview-status': true, 'is-running': isRunning }"
                            role="status">
                            <template v-if="isRunning">
                                {{ $t('localPreview.serverRunningAt') }}
                                <span class="local-preview-address">{{ serverAddress }}</span>
                            </template>
                            <template v-else>
                                {{ $t('localPreview.serverStopped') }}
                            </template>
                        </p>

                        <p
                            v-if="!isRunning"
                            class="local-preview-note">
                            {{ $t('localPreview.serverStoppedInfo') }}
                        </p>

                        <p-button
                            v-if="isRunning"
                            appearance="outline"
                            size="small"
                            loading-layout="overlay"
                            :loading="isStopping"
                            :disabled="isStopping"
                            :onClick="stopServer">
                            {{ $t('localPreview.stopServer') }}
                        </p-button>
                    </div>

                    <p
                        v-if="portWasBusy"
                        class="local-preview-note is-warning">
                        {{ $t('localPreview.portWasBusy', { requestedPort: localPreview.requestedPort, port: localPreview.port }) }}
                    </p>

                    <div class="local-preview-port">
                        <label
                            class="local-preview-label"
                            for="local-preview-port">
                            {{ $t('localPreview.port') }}
                        </label>

                        <div class="local-preview-port-controls">
                            <text-input
                                id="local-preview-port"
                                type="number"
                                size="small"
                                min="1024"
                                max="65535"
                                step="1"
                                v-model="port"
                                :disabled="isRunning || isSavingPort"
                                :invalid="portError !== ''"
                                :spellcheck="false"
                                :ariaDescribedby="portError ? 'local-preview-port-note local-preview-port-error' : 'local-preview-port-note'" />

                            <p-button
                                intent="primary"
                                size="small"
                                loading-layout="overlay"
                                :loading="isSavingPort"
                                :disabled="isRunning || isSavingPort || !portWasChanged"
                                :onClick="savePort">
                                {{ $t('localPreview.savePort') }}
                            </p-button>
                        </div>

                        <p
                            v-if="portError"
                            id="local-preview-port-error"
                            class="local-preview-note is-error"
                            role="alert">
                            {{ portError }}
                        </p>

                        <p
                            id="local-preview-port-note"
                            class="local-preview-note">
                            {{ isRunning ? $t('localPreview.portLockedInfo') : $t('localPreview.portInfo') }}
                        </p>
                    </div>
                </section>

                <section
                    class="local-preview-section"
                    aria-labelledby="local-preview-active-title">
                    <h3 id="local-preview-active-title">
                        <icon
                            name="full-preview-monitor"
                            size="s"
                            non-interactive
                            aria-hidden="true" />
                        {{ $t('localPreview.activePreviews') }}
                    </h3>

                    <p
                        v-if="!activePreviews.length"
                        class="local-preview-note">
                        {{ $t('localPreview.noActivePreviews') }}
                    </p>

                    <ul
                        v-else
                        class="local-preview-list">
                        <li
                            v-for="preview in activePreviews"
                            :key="'active-preview-' + preview.name"
                            class="local-preview-list-item local-preview-active-item">
                            <div class="local-preview-site">
                                <span class="local-preview-list-name">{{ preview.displayName }}</span>
                                <a
                                    href="#"
                                    class="local-preview-list-url"
                                    @click.prevent="openPreview(preview.url)">
                                    {{ preview.url }}/
                                    <icon
                                        name="external-link"
                                        size="xxs"
                                        non-interactive
                                        aria-hidden="true" />
                                </a>
                            </div>

                            <p-button
                                appearance="outline"
                                size="small"
                                loading-layout="overlay"
                                :loading="busySite === preview.name"
                                :disabled="busySite === preview.name"
                                :onClick="disablePreview.bind(this, preview.name)">
                                {{ $t('localPreview.disablePreview') }}
                            </p-button>
                        </li>
                    </ul>
                </section>

                <section
                    class="local-preview-section"
                    aria-labelledby="local-preview-files-title">
                    <h3 id="local-preview-files-title">
                        <icon
                            name="folder"
                            size="s"
                            non-interactive
                            aria-hidden="true" />
                        {{ $t('localPreview.previewFiles') }}
                    </h3>

                    <p class="local-preview-note">
                        {{ $t('localPreview.previewFilesInfo') }}
                    </p>

                    <p
                        v-if="filesAreLoaded && !previewFiles.length"
                        class="local-preview-note">
                        {{ $t('localPreview.noPreviewFiles') }}
                    </p>

                    <template v-else-if="filesAreLoaded">
                        <div class="local-preview-summary">
                            <button
                                type="button"
                                class="local-preview-summary-toggle"
                                :aria-expanded="filesAreExpanded ? 'true' : 'false'"
                                aria-controls="local-preview-files"
                                @click="filesAreExpanded = !filesAreExpanded">
                                <icon
                                    name="arrow-down"
                                    size="xs"
                                    non-interactive
                                    aria-hidden="true" />
                                <span>
                                    <template v-if="allSizesAreKnown">
                                        {{ $t('localPreview.previewFilesSummary', { count: previewFiles.length, size: formatBytes(totalSize) }) }}
                                    </template>
                                    <template v-else>
                                        {{ $t('localPreview.previewFilesCount', { count: previewFiles.length }) }}
                                    </template>
                                </span>
                            </button>

                            <p-button
                                v-if="!allSizesAreKnown"
                                appearance="outline"
                                size="small"
                                loading-layout="overlay"
                                :loading="isCheckingSizes"
                                :disabled="isCheckingSizes"
                                :onClick="checkSizes">
                                {{ $t('localPreview.checkSize') }}
                            </p-button>
                        </div>

                        <div
                            v-show="filesAreExpanded"
                            id="local-preview-files">
                            <div class="local-preview-search">
                                <label
                                    class="local-preview-label"
                                    for="local-preview-search">
                                    {{ $t('localPreview.filterWebsites') }}
                                </label>
                                <text-input
                                    id="local-preview-search"
                                    type="search"
                                    icon="magnifier"
                                    v-model="filesSearch"
                                    :placeholder="$t('localPreview.filterWebsitesPlaceholder')"
                                    :spellcheck="false" />
                            </div>

                            <p class="local-preview-note local-preview-files-note">
                                {{ $t('localPreview.clearPreviewInfo') }}
                            </p>

                            <p
                                v-if="!filteredPreviewFiles.length"
                                class="local-preview-empty"
                                role="status">
                                {{ $t('localPreview.noMatchingWebsites') }}
                            </p>

                            <ul
                                v-else
                                class="local-preview-list local-preview-files-list">
                                <li
                                    v-for="item in filteredPreviewFiles"
                                    :key="'preview-files-' + item.name"
                                    class="local-preview-list-item local-preview-file-item">
                                    <span class="local-preview-list-name">{{ item.displayName }}</span>

                                    <span
                                        v-if="checkedSite === item.name"
                                        class="local-preview-list-size"
                                        role="status">
                                        {{ $t('localPreview.checkingSize') }}
                                    </span>
                                    <span
                                        v-else
                                        class="local-preview-list-size">
                                        {{ formatBytes(item.size) }}
                                    </span>

                                    <p-button
                                        appearance="outline"
                                        size="small"
                                        loading-layout="overlay"
                                        :loading="busySite === item.name"
                                        :disabled="busySite === item.name"
                                        :onClick="askForClearing.bind(this, item)">
                                        {{ $t('localPreview.clearPreview') }}
                                    </p-button>
                                </li>
                            </ul>
                        </div>
                    </template>
                </section>

                <section
                    class="local-preview-section"
                    aria-labelledby="local-preview-file-types-title">
                    <h3 id="local-preview-file-types-title">
                        <icon
                            name="file-manager"
                            size="s"
                            non-interactive
                            aria-hidden="true" />
                        {{ $t('localPreview.fileTypes') }}
                    </h3>

                    <p class="local-preview-note">
                        {{ $t('localPreview.fileTypesInfo') }}
                    </p>

                    <div class="local-preview-summary">
                        <button
                            type="button"
                            class="local-preview-summary-toggle"
                            :aria-expanded="fileTypesAreExpanded ? 'true' : 'false'"
                            aria-controls="local-preview-file-types"
                            @click="fileTypesAreExpanded = !fileTypesAreExpanded">
                            <icon
                                name="arrow-down"
                                size="xs"
                                non-interactive
                                aria-hidden="true" />
                            <span>
                                {{ $t('localPreview.fileTypesSummary', { builtIn: builtInMimeTypes.length, custom: customMimeTypes.length }) }}
                            </span>
                        </button>
                    </div>

                    <div
                        v-show="fileTypesAreExpanded"
                        id="local-preview-file-types">
                        <ul
                            v-if="customMimeTypes.length"
                            class="local-preview-list local-preview-file-types-list">
                            <li
                                v-for="item in customMimeTypes"
                                :key="'file-type-' + item.extension"
                                class="local-preview-list-item local-preview-file-type-item">
                                <span class="local-preview-list-extension">{{ item.extension }}</span>
                                <span class="local-preview-list-mime-type">{{ item.mimeType }}</span>

                                <p-button
                                    appearance="outline"
                                    size="small"
                                    loading-layout="overlay"
                                    :disabled="isSavingMimeTypes"
                                    :onClick="removeMimeType.bind(this, item.extension)">
                                    {{ $t('localPreview.removeFileType') }}
                                </p-button>
                            </li>
                        </ul>

                        <div class="local-preview-file-type-form">
                            <div>
                                <label
                                    class="local-preview-label"
                                    for="local-preview-file-extension">
                                    {{ $t('localPreview.fileTypeExtension') }}
                                </label>
                                <text-input
                                    id="local-preview-file-extension"
                                    size="small"
                                    placeholder=".zip"
                                    v-model="newExtension"
                                    :disabled="isSavingMimeTypes"
                                    :invalid="mimeTypeErrorField === 'extension'"
                                    :spellcheck="false"
                                    :ariaDescribedby="mimeTypeError ? 'local-preview-file-type-error' : ''" />
                            </div>

                            <div>
                                <label
                                    class="local-preview-label"
                                    for="local-preview-file-mime-type">
                                    {{ $t('localPreview.fileTypeMimeType') }}
                                </label>
                                <text-input
                                    id="local-preview-file-mime-type"
                                    size="small"
                                    placeholder="application/zip"
                                    v-model="newMimeType"
                                    :disabled="isSavingMimeTypes"
                                    :invalid="mimeTypeErrorField === 'mimeType'"
                                    :spellcheck="false"
                                    :ariaDescribedby="mimeTypeError ? 'local-preview-file-type-error' : ''" />
                            </div>

                            <p-button
                                intent="primary"
                                size="small"
                                loading-layout="overlay"
                                :loading="isSavingMimeTypes"
                                :disabled="isSavingMimeTypes || !newExtension.trim() || !newMimeType.trim()"
                                :onClick="addMimeType">
                                {{ $t('localPreview.addFileType') }}
                            </p-button>
                        </div>

                        <p
                            v-if="mimeTypeError"
                            id="local-preview-file-type-error"
                            class="local-preview-note is-error"
                            role="alert">
                            {{ mimeTypeError }}
                        </p>

                        <p class="local-preview-note">
                            {{ $t('localPreview.builtInFileTypes') }}
                            <span class="local-preview-extensions">{{ builtInExtensions }}</span>
                        </p>
                    </div>
                </section>
            </div>

            <div class="buttons">
                <p-button
                    appearance="popup-cancel"
                    size="medium"
                    width="full"
                    square
                    :onClick="hide">
                    {{ $t('ui.close') }}
                </p-button>
            </div>
        </div>
    </div>
</template>

<script>
const DEFAULT_PORT = 3000;
const MIN_PORT = 1024;
const MAX_PORT = 65535;

export default {
    name: 'local-preview-popup',
    data () {
        return {
            isVisible: false,
            isStopping: false,
            isSavingPort: false,
            filesAreLoaded: false,
            filesRequestID: 0,
            filesAreExpanded: false,
            filesSearch: '',
            isCheckingSizes: false,
            checkedSite: '',
            sizesCheckID: 0,
            busySite: '',
            port: String(DEFAULT_PORT),
            portError: '',
            files: [], // websites with preview files: { name, size } - size is null until it is checked
            fileTypesAreExpanded: false,
            isSavingMimeTypes: false,
            builtInMimeTypes: [], // always served: { extension, mimeType }
            customMimeTypes: [], // added by the user: { extension, mimeType }
            newExtension: '',
            newMimeType: '',
            mimeTypeError: '',
            mimeTypeErrorField: ''
        };
    },
    computed: {
        localPreview () {
            return this.$store.state.app.localPreview;
        },
        isRunning () {
            return this.localPreview.running;
        },
        serverAddress () {
            return 'http://127.0.0.1:' + this.localPreview.port;
        },
        portWasBusy () {
            return this.isRunning && !!this.localPreview.requestedPort && this.localPreview.requestedPort !== this.localPreview.port;
        },
        savedPort () {
            let port = parseInt(this.$store.state.app.config.previewServerPort, 10);
            return this.isValidPort(port) ? port : DEFAULT_PORT;
        },
        portWasChanged () {
            return String(this.port).trim() !== String(this.savedPort);
        },
        activePreviews () {
            return this.localPreview.sites.map(site => ({
                name: site.name,
                displayName: this.getDisplayName(site.name),
                url: site.url
            }));
        },
        previewFiles () {
            // Alphabetical order keeps the rows in place while their sizes are being checked
            return this.files
                .map(file => ({
                    name: file.name,
                    displayName: this.getDisplayName(file.name),
                    size: file.size
                }))
                .sort((itemA, itemB) => itemA.displayName.localeCompare(itemB.displayName));
        },
        filteredPreviewFiles () {
            let query = this.filesSearch.trim().toLocaleLowerCase();

            if (!query) {
                return this.previewFiles;
            }

            return this.previewFiles.filter(file => {
                return file.displayName.toLocaleLowerCase().includes(query);
            });
        },
        builtInExtensions () {
            return this.builtInMimeTypes.map(item => item.extension).join(', ');
        },
        allSizesAreKnown () {
            return this.files.length > 0 && this.files.every(file => file.size !== null);
        },
        totalSize () {
            return this.files.reduce((total, file) => total + (file.size || 0), 0);
        }
    },
    watch: {
        '$store.state.app.config.previewServerMimeTypes' () {
            if (this.isVisible && !this.isSavingMimeTypes) {
                this.loadMimeTypes();
            }
        },
        savedPort (newPort) {
            if (!this.isSavingPort) {
                this.port = String(newPort);
            }
        }
    },
    mounted () {
        this.$bus.$on('local-preview-popup-show', this.show);
        document.body.addEventListener('keydown', this.onDocumentKeyDown);

        // Preview files were generated or cleared - also by another window
        mainProcessAPI.receive('app-local-preview-files-changed', () => {
            if (this.isVisible) {
                this.loadFiles();
            }
        });
    },
    methods: {
        show () {
            this.returnFocusTo = document.activeElement;
            this.port = String(this.savedPort);
            this.portError = '';
            this.files = [];
            this.filesAreLoaded = false;
            this.filesAreExpanded = false;
            this.filesSearch = '';
            this.fileTypesAreExpanded = false;
            this.newExtension = '';
            this.newMimeType = '';
            this.mimeTypeError = '';
            this.mimeTypeErrorField = '';
            this.isVisible = true;
            document.body.classList.add('has-popup-visible');
            this.loadFiles();
            this.loadMimeTypes();
            this.$nextTick(() => {
                if (this.$refs.dialog) {
                    this.$refs.dialog.focus();
                }
            });
        },
        hide () {
            this.isVisible = false;
            this.stopCheckingSizes();
            document.body.classList.remove('has-popup-visible');
            this.$nextTick(() => {
                if (this.returnFocusTo && this.returnFocusTo.isConnected) {
                    this.returnFocusTo.focus();
                }

                this.returnFocusTo = null;
            });
        },
        onDocumentKeyDown (e) {
            // Let a confirmation displayed over this popup manage its own keyboard focus.
            if (!this.isVisible || e.defaultPrevented || e.isComposing || document.querySelectorAll('.overlay').length !== 1) {
                return;
            }

            if (e.key === 'Escape') {
                e.preventDefault();
                this.hide();
                return;
            }

            if (e.key !== 'Tab') {
                return;
            }

            let dialog = this.$refs.dialog;
            let controls = Array.from(dialog.querySelectorAll('button:not(:disabled), input:not(:disabled), a[href]'))
                .filter(control => control.getClientRects().length > 0);
            let first = controls[0];
            let last = controls[controls.length - 1];
            let activeElement = document.activeElement;
            let focusIsOutside = !controls.includes(activeElement);

            if (e.shiftKey && (activeElement === first || focusIsOutside)) {
                e.preventDefault();
                (last || dialog).focus();
            } else if (!e.shiftKey && (activeElement === last || focusIsOutside)) {
                e.preventDefault();
                (first || dialog).focus();
            }
        },
        getDisplayName (siteName) {
            return this.$store.getters.siteDisplayNames[siteName] || siteName;
        },
        isValidPort (port) {
            return Number.isInteger(port) && port >= MIN_PORT && port <= MAX_PORT;
        },
        // Cheap - it lists websites with preview files and the sizes which are already known, without reading the files
        async loadFiles () {
            let requestID = ++this.filesRequestID;
            let files = await mainProcessAPI.invoke('app-local-preview:get-files-overview');

            // Only the newest request counts
            if (requestID !== this.filesRequestID) {
                return;
            }

            this.files = Array.isArray(files) ? files : [];
            this.filesAreLoaded = true;
        },
        // Big previews contain thousands of files, so their sizes are checked only on demand - website by website
        async checkSizes () {
            let checkID = ++this.sizesCheckID;
            let siteNames = this.files.filter(file => file.size === null).map(file => file.name);
            this.isCheckingSizes = true;

            try {
                for (let siteName of siteNames) {
                    this.checkedSite = siteName;
                    let result = await mainProcessAPI.invoke('app-local-preview:get-size', siteName);

                    // The popup was closed in the meantime
                    if (checkID !== this.sizesCheckID) {
                        return;
                    }

                    let file = this.files.find(file => file.name === siteName);

                    if (file && result && result.status === true) {
                        file.size = result.size;
                    }
                }
            } finally {
                if (checkID === this.sizesCheckID) {
                    this.isCheckingSizes = false;
                    this.checkedSite = '';
                }
            }
        },
        stopCheckingSizes () {
            this.sizesCheckID++;
            this.isCheckingSizes = false;
            this.checkedSite = '';
        },
        async loadMimeTypes () {
            let mimeTypes = await mainProcessAPI.invoke('app-local-preview:get-mime-types');

            this.builtInMimeTypes = mimeTypes && Array.isArray(mimeTypes.builtIn) ? mimeTypes.builtIn : [];
            this.customMimeTypes = mimeTypes && Array.isArray(mimeTypes.custom) ? mimeTypes.custom : [];
        },
        addMimeType () {
            let mimeTypes = this.customMimeTypes.concat([{
                extension: this.newExtension,
                mimeType: this.newMimeType
            }]);

            return this.saveMimeTypes(mimeTypes, true);
        },
        removeMimeType (extension) {
            return this.saveMimeTypes(this.customMimeTypes.filter(item => item.extension !== extension), false);
        },
        // The whole list is always sent - the main process checks it, saves it and applies it to the working server
        async saveMimeTypes (mimeTypes, isAdding) {
            this.mimeTypeError = '';
            this.mimeTypeErrorField = '';
            this.isSavingMimeTypes = true;

            try {
                let result = await mainProcessAPI.invoke('app-local-preview:set-mime-types', mimeTypes);

                if (result && result.status === true) {
                    this.customMimeTypes = result.mimeTypes;
                    this.$store.commit('setAppConfig', { previewServerMimeTypes: result.mimeTypes });

                    if (isAdding) {
                        this.newExtension = '';
                        this.newMimeType = '';
                    }

                    return;
                }

                let errors = {
                    'invalid-extension': ['extension', 'localPreview.fileTypeInvalidExtension'],
                    'built-in-extension': ['extension', 'localPreview.fileTypeBuiltIn'],
                    'duplicated-extension': ['extension', 'localPreview.fileTypeDuplicated'],
                    'invalid-mime-type': ['mimeType', 'localPreview.fileTypeInvalidMimeType'],
                    'too-many': ['', 'localPreview.fileTypeTooMany']
                };
                let error = errors[result && result.reason] || ['', 'localPreview.fileTypesSaveError'];

                this.mimeTypeErrorField = isAdding ? error[0] : '';
                this.mimeTypeError = this.$t(error[1]);
            } finally {
                this.isSavingMimeTypes = false;
            }
        },
        async stopServer () {
            this.isStopping = true;

            try {
                await mainProcessAPI.invoke('app-local-preview:stop');
            } finally {
                this.isStopping = false;
            }
        },
        async savePort () {
            let rawPort = String(this.port).trim();
            let port = /^\d+$/.test(rawPort) ? parseInt(rawPort, 10) : NaN;

            if (!this.isValidPort(port)) {
                this.portError = this.$t('localPreview.portInvalid', { min: MIN_PORT, max: MAX_PORT });
                return;
            }

            this.portError = '';
            this.isSavingPort = true;

            try {
                let result = await mainProcessAPI.invoke('app-local-preview:set-port', port);

                if (result && result.status === true) {
                    this.$store.commit('setAppConfig', { previewServerPort: port });
                    this.port = String(port);

                    this.$bus.$emit('message-display', {
                        message: this.$t('localPreview.portSaved'),
                        type: 'success',
                        lifeTime: 3
                    });

                    return;
                }

                let errors = {
                    'invalid-port': this.$t('localPreview.portInvalid', { min: MIN_PORT, max: MAX_PORT }),
                    'server-running': this.$t('localPreview.portLockedInfo')
                };

                this.portError = errors[result && result.reason] || this.$t('localPreview.portSaveError');
            } finally {
                this.isSavingPort = false;
            }
        },
        openPreview (url) {
            mainProcessAPI.shellOpenExternal(url + '/');
        },
        async disablePreview (siteName) {
            this.busySite = siteName;

            try {
                await mainProcessAPI.invoke('app-local-preview:disable-site', siteName);
            } finally {
                this.busySite = '';
            }
        },
        askForClearing (item) {
            let isActive = this.localPreview.sites.some(site => site.name === item.name);
            let message = this.$t('localPreview.clearPreviewConfirm', {
                name: item.displayName,
                size: item.size === null ? '' : ' (' + this.formatBytes(item.size) + ')'
            });

            if (isActive) {
                message += ' ' + this.$t('localPreview.clearActivePreviewConfirm');
            }

            this.$bus.$emit('confirm-display', {
                dialogLabel: this.$t('localPreview.clearPreviewTitle'),
                message: message,
                isDanger: true,
                okLabel: this.$t('localPreview.clearPreview'),
                okClick: () => this.clearPreview(item.name)
            });
        },
        async clearPreview (siteName) {
            this.busySite = siteName;

            try {
                let result = await mainProcessAPI.invoke('app-local-preview:clear', siteName);

                if (result && result.status === true) {
                    this.$bus.$emit('message-display', {
                        message: this.$t('localPreview.previewCleared'),
                        type: 'success',
                        lifeTime: 3
                    });
                } else {
                    let isRendering = result && result.reason === 'rendering-in-progress';

                    this.$bus.$emit('message-display', {
                        message: this.$t(isRendering ? 'localPreview.clearPreviewRenderingError' : 'localPreview.clearPreviewError'),
                        type: 'warning',
                        lifeTime: 3
                    });
                }
            } finally {
                this.busySite = '';
            }
        },
        formatBytes (bytes) {
            if (!Number.isFinite(bytes) || bytes < 0) return '—';
            if (bytes === 0) return '0 bytes';
            const index = Math.min(4, Math.floor(Math.log(bytes) / Math.log(1024)));
            return (
                parseFloat((bytes / Math.pow(1024, index)).toFixed(2)) + ' ' + ['bytes', 'kB', 'MB', 'GB', 'TB'][index]
            );
        }
    },
    beforeDestroy () {
        this.$bus.$off('local-preview-popup-show', this.show);
        document.body.removeEventListener('keydown', this.onDocumentKeyDown);
        mainProcessAPI.stopReceiveAll('app-local-preview-files-changed');
    }
}
</script>

<style scoped>
@import '../css/popup-common.css';

.local-preview-popup {
    display: flex;
    flex-direction: column;
    max-height: calc(100vh - var(--space-8) * 2);
    max-width: 76rem;
    min-width: 0;
    outline: none;
    padding: 0;
    width: calc(100vw - var(--space-8) * 2);
}

.local-preview-header {
    flex-shrink: 0;
    padding: var(--space-8) var(--space-12);

    h2 {
        margin: 0;
    }
}

.local-preview-content {
    display: flex;
    flex-direction: column;
    gap: var(--space-6);
    min-height: 0;
    overflow-y: auto;
    overscroll-behavior: contain;
    padding: 0 var(--space-8) var(--space-8);
    scrollbar-gutter: stable both-edges;
    text-align: left;
    user-select: text;
}

.local-preview-section {
    background: var(--popup-bg);
    border: 1px solid var(--border-light-color);
    border-radius: var(--radius-base);
    flex-shrink: 0;
    min-width: 0;
    padding: var(--space-6);

    h3 {
        align-items: center;
        color: var(--headings-color);
        display: flex;
        font-size: var(--font-size-ui-md);
        font-weight: var(--font-weight-semibold);
        gap: var(--space-3);
        margin: 0 0 var(--space-4);

        .icon {
            color: var(--icon-secondary-color);
            fill: currentColor;
            flex-shrink: 0;
        }
    }
}

.local-preview-row,
.local-preview-port-controls {
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-4);
}

.local-preview-row {
    justify-content: space-between;

    &.is-stopped {
        align-items: baseline;
        display: grid;
        gap: var(--space-6);
        grid-template-columns: max-content minmax(0, 1fr);

        .local-preview-note {
            margin: 0;
        }
    }
}

.local-preview-status {
    color: var(--text-primary-color);
    margin: 0;
    min-width: 0;
    overflow-wrap: anywhere;

    &::before {
        background: var(--color-text-faint);
        border-radius: 50%;
        content: "";
        display: inline-block;
        height: .8rem;
        margin-right: var(--space-2);
        width: .8rem;
    }

    &.is-running::before {
        background: var(--color-success);
    }
}

.local-preview-address {
    font-family: var(--font-family-mono);
    font-size: var(--font-size-ui-sm);
}

.local-preview-port {
    border-top: 1px solid var(--border-light-color);
    margin-top: var(--space-6);
    padding-top: var(--space-6);
}

.local-preview-label {
    color: var(--label-color);
    display: block;
    font-size: var(--font-size-ui-sm);
    margin-bottom: var(--space-3);
}

.local-preview-note {
    color: var(--text-light-color);
    font-size: var(--font-size-ui-sm);
    line-height: var(--line-height-base);
    margin: var(--space-3) 0 0;
    overflow-wrap: anywhere;

    &.is-warning {
        color: var(--color-warning);
    }

    &.is-error {
        color: var(--color-danger);
    }
}

.local-preview-summary {
    align-items: center;
    background: var(--color-surface-subtle);
    border-radius: var(--radius-base);
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-3);
    margin-top: var(--space-6);
    padding: var(--space-3);
}

.local-preview-summary-toggle {
    align-items: center;
    background: none;
    border: none;
    border-radius: var(--radius-base);
    color: var(--text-primary-color);
    cursor: pointer;
    display: flex;
    flex: 1 1 20rem;
    font: var(--font-weight-medium) var(--font-size-ui-sm)/var(--line-height-base) var(--font-family-sans);
    gap: var(--space-3);
    min-height: var(--button-height-small);
    min-width: 0;
    padding: var(--space-2);
    text-align: left;

    .icon {
        color: var(--icon-secondary-color);
        fill: currentColor;
        flex-shrink: 0;
        stroke: currentColor;
        stroke-width: 2;
        transform: rotate(-90deg);
    }

    &[aria-expanded="true"] .icon {
        transform: rotate(0);
    }

    &:hover {
        background: var(--color-control-surface-hover);
    }

    &:focus-visible {
        outline: 2px solid var(--input-border-focus);
        outline-offset: 2px;
    }
}

.local-preview-search {
    margin-top: var(--space-6);
}

.local-preview-files-note {
    margin-bottom: var(--space-4);
}

.local-preview-list {
    list-style: none;
    margin: 0;
    padding: 0;
}

.local-preview-list-item {
    align-items: center;
    border-bottom: 1px solid var(--border-light-color);
    gap: var(--space-4);
    padding: var(--space-4) 0;

    &:last-child {
        border-bottom: none;
        padding-bottom: 0;
    }
}

.local-preview-active-item {
    display: flex;
    flex-wrap: wrap;
    padding-top: 0;

    & + & {
        padding-top: var(--space-4);
    }
}

.local-preview-site {
    flex: 1 1 22rem;
    min-width: 0;
}

.local-preview-list-name {
    color: var(--text-primary-color);
    display: block;
    min-width: 0;
    overflow-wrap: anywhere;
}

.local-preview-list-url {
    color: var(--link-primary-color);
    display: inline-block;
    font-family: var(--font-family-mono);
    font-size: var(--font-size-ui-sm);
    margin-top: var(--space-1);
    max-width: 100%;
    overflow-wrap: anywhere;

    .icon {
        fill: currentColor;
        margin-left: var(--space-1);
        vertical-align: middle;
    }

    &:focus-visible {
        border-radius: var(--radius-base);
        outline: 2px solid var(--input-border-focus);
        outline-offset: 2px;
    }
}

.local-preview-file-item {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto auto;
}

.local-preview-file-types-list {
    margin-top: var(--space-4);
}

.local-preview-file-type-item {
    display: grid;
    grid-template-columns: minmax(8rem, 1fr) minmax(0, 3fr) auto;
}

.local-preview-list-extension,
.local-preview-list-mime-type,
.local-preview-extensions {
    font-family: var(--font-family-mono);
    font-size: var(--font-size-ui-sm);
}

.local-preview-list-extension {
    color: var(--text-primary-color);
}

.local-preview-list-mime-type {
    color: var(--text-light-color);
    min-width: 0;
    overflow-wrap: anywhere;
}

.local-preview-file-type-form {
    align-items: end;
    border-top: 1px solid var(--border-light-color);
    display: grid;
    gap: var(--space-4);
    grid-template-columns: minmax(0, 1fr) minmax(0, 2fr) auto;
    margin-top: var(--space-6);
    padding-top: var(--space-6);
}

.local-preview-list-size {
    color: var(--text-light-color);
    font-size: var(--font-size-ui-sm);
    font-variant-numeric: tabular-nums;
    text-align: right;
    white-space: nowrap;
}

.local-preview-empty {
    color: var(--text-light-color);
    font-size: var(--font-size-ui-sm);
    margin: 0;
    padding: var(--space-6) 0;
    text-align: center;
}

.local-preview-popup .button {
    flex-shrink: 0;
    height: auto;
    max-width: 100%;
    min-height: var(--button-height-small);
    overflow-wrap: anywhere;
    padding-block: var(--space-1);
    white-space: normal;
}

.buttons {
    display: flex;
    flex-shrink: 0;
    margin: 0;
    text-align: center;

    .button {
        min-height: var(--button-height-large);
    }
}

@media (max-width: 520px) {
    .local-preview-popup {
        max-height: calc(100vh - var(--space-4) * 2);
        width: calc(100vw - var(--space-4) * 2);
    }

    .local-preview-header {
        padding: var(--space-6);
    }

    .local-preview-content {
        padding: 0 var(--space-4) var(--space-4);
    }

    .local-preview-row.is-stopped {
        gap: var(--space-2);
        grid-template-columns: minmax(0, 1fr);
    }

    .local-preview-file-type-form {
        grid-template-columns: minmax(0, 1fr);
    }

    .local-preview-file-item {
        grid-template-columns: minmax(0, 1fr) auto;

        .local-preview-list-name {
            grid-column: 1 / -1;
        }

        .local-preview-list-size {
            text-align: left;
        }
    }
}
</style>
