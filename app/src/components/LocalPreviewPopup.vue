<template>
    <div
        v-if="isVisible"
        class="overlay">
        <div
            class="popup"
            role="dialog"
            aria-modal="true"
            :aria-label="$t('localPreview.title')">
            <h2>{{ $t('localPreview.title') }}</h2>

            <div class="local-preview-content">
                <section class="local-preview-section">
                    <h3>{{ $t('localPreview.server') }}</h3>

                    <div class="local-preview-row">
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

                        <p-button
                            v-if="isRunning"
                            appearance="outline"
                            size="small"
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

                    <p
                        v-if="!isRunning"
                        class="local-preview-note">
                        {{ $t('localPreview.serverStoppedInfo') }}
                    </p>

                    <label
                        class="local-preview-label"
                        for="local-preview-port">
                        {{ $t('localPreview.port') }}
                    </label>

                    <div class="local-preview-row">
                        <text-input
                            id="local-preview-port"
                            type="number"
                            min="1024"
                            max="65535"
                            step="1"
                            v-model="port"
                            :disabled="isRunning || isSavingPort"
                            :invalid="portError !== ''"
                            :spellcheck="false"
                            ariaDescribedby="local-preview-port-note" />

                        <p-button
                            intent="primary"
                            size="small"
                            :loading="isSavingPort"
                            :disabled="isRunning || isSavingPort || !portWasChanged"
                            :onClick="savePort">
                            {{ $t('localPreview.savePort') }}
                        </p-button>
                    </div>

                    <p
                        v-if="portError"
                        class="local-preview-note is-error"
                        role="alert">
                        {{ portError }}
                    </p>

                    <p
                        id="local-preview-port-note"
                        class="local-preview-note">
                        {{ isRunning ? $t('localPreview.portLockedInfo') : $t('localPreview.portInfo') }}
                    </p>
                </section>

                <section class="local-preview-section">
                    <h3>{{ $t('localPreview.activePreviews') }}</h3>

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
                            class="local-preview-list-item">
                            <span class="local-preview-list-name">{{ preview.displayName }}</span>

                            <a
                                href="#"
                                class="local-preview-list-url"
                                @click.prevent="openPreview(preview.url)">
                                {{ preview.url }}/
                            </a>

                            <p-button
                                appearance="outline"
                                size="small"
                                :disabled="busySite === preview.name"
                                :onClick="disablePreview.bind(this, preview.name)">
                                {{ $t('localPreview.disablePreview') }}
                            </p-button>
                        </li>
                    </ul>
                </section>

                <section class="local-preview-section">
                    <h3>{{ $t('localPreview.previewFiles') }}</h3>

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
                                :aria-controls="filesAreExpanded ? 'local-preview-files' : null"
                                @click="filesAreExpanded = !filesAreExpanded">
                                <template v-if="allSizesAreKnown">
                                    {{ $t('localPreview.previewFilesSummary', { count: previewFiles.length, size: formatBytes(totalSize) }) }}
                                </template>
                                <template v-else>
                                    {{ $t('localPreview.previewFilesCount', { count: previewFiles.length }) }}
                                </template>
                            </button>

                            <p-button
                                v-if="!allSizesAreKnown"
                                appearance="outline"
                                size="small"
                                :loading="isCheckingSizes"
                                :disabled="isCheckingSizes"
                                :onClick="checkSizes">
                                {{ $t('localPreview.checkSize') }}
                            </p-button>
                        </div>

                        <div
                            v-if="filesAreExpanded"
                            id="local-preview-files">
                            <p class="local-preview-note">
                                {{ $t('localPreview.clearPreviewInfo') }}
                            </p>

                            <ul class="local-preview-list">
                                <li
                                    v-for="item in previewFiles"
                                    :key="'preview-files-' + item.name"
                                    class="local-preview-list-item">
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
                                        :disabled="busySite === item.name"
                                        :onClick="askForClearing.bind(this, item)">
                                        {{ $t('localPreview.clearPreview') }}
                                    </p-button>
                                </li>
                            </ul>
                        </div>
                    </template>
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
            isCheckingSizes: false,
            checkedSite: '',
            sizesCheckID: 0,
            busySite: '',
            port: String(DEFAULT_PORT),
            portError: '',
            files: [] // websites with preview files: { name, size } - size is null until it is checked
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
        allSizesAreKnown () {
            return this.files.length > 0 && this.files.every(file => file.size !== null);
        },
        totalSize () {
            return this.files.reduce((total, file) => total + (file.size || 0), 0);
        }
    },
    watch: {
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
            this.port = String(this.savedPort);
            this.portError = '';
            this.files = [];
            this.filesAreLoaded = false;
            this.filesAreExpanded = false;
            this.isVisible = true;
            document.body.classList.add('has-popup-visible');
            this.loadFiles();
        },
        hide () {
            this.isVisible = false;
            this.stopCheckingSizes();
            document.body.classList.remove('has-popup-visible');
        },
        onDocumentKeyDown (e) {
            // A dialog displayed over this popup (i.e. the confirmation of clearing) handles the key on its own
            if (this.isVisible && e.key === 'Escape' && document.querySelectorAll('.overlay').length === 1) {
                this.hide();
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

.popup {
    max-width: 72rem;
    min-width: 72rem;
    padding: var(--space-16);
}

h2 {
    margin: 0 0 var(--space-8);
}

h3 {
    color: var(--headings-color);
    font-size: var(--font-size-ui-md);
    font-weight: var(--font-weight-semibold);
    margin: 0 0 var(--space-4);
}

.local-preview-content {
    max-height: calc(100vh - 32rem);
    overflow-y: auto;
    text-align: left;
    user-select: text;
}

.local-preview-section {
    border-top: 1px solid var(--border-light-color);
    padding: var(--space-6) 0;

    &:first-child {
        border-top: none;
        padding-top: 0;
    }
}

.local-preview-row {
    align-items: center;
    display: flex;
    gap: var(--space-4);
    justify-content: space-between;
}

.local-preview-status {
    color: var(--text-primary-color);
    margin: 0;

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

.local-preview-label {
    color: var(--label-color);
    display: block;
    font-size: var(--font-size-ui-sm);
    margin: var(--space-6) 0 var(--space-2);
}

.local-preview-note {
    color: var(--text-light-color);
    font-size: var(--font-size-ui-sm);
    margin: var(--space-2) 0 0;

    &.is-warning {
        color: var(--color-warning);
    }

    &.is-error {
        color: var(--color-danger);
    }
}

.local-preview-summary {
    align-items: center;
    background: var(--bg-secondary);
    border: 1px solid var(--border-light-color);
    border-radius: var(--radius-base);
    display: flex;
    gap: var(--space-4);
    margin-top: var(--space-4);
    padding: var(--space-2) var(--space-4);

    &:hover {
        border-color: var(--color-border-default);
    }
}

.local-preview-summary-toggle {
    align-items: center;
    background: none;
    border: none;
    border-radius: var(--radius-base);
    color: var(--text-primary-color);
    cursor: pointer;
    display: flex;
    flex: 1 1 0;
    font-family: var(--font-family-sans);
    font-size: var(--font-size-ui-md);
    font-weight: var(--font-weight-medium);
    min-height: 3.2rem;
    padding: 0;
    text-align: left;

    &::before {
        border-bottom: 2px solid currentColor;
        border-right: 2px solid currentColor;
        content: "";
        flex-shrink: 0;
        height: .7rem;
        margin: 0 var(--space-4) 0 var(--space-1);
        transform: rotate(-45deg);
        transition: var(--transition-default);
        width: .7rem;
    }

    &[aria-expanded="true"]::before {
        transform: rotate(45deg);
    }

    &:focus-visible {
        box-shadow: var(--input-shadow-focus);
        outline: none;
    }
}

.local-preview-list {
    list-style: none;
    margin: 0;
    padding: 0;
}

.local-preview-list-item {
    align-items: center;
    border-bottom: 1px solid var(--border-light-color);
    display: flex;
    gap: var(--space-4);
    padding: var(--space-2) 0;

    &:last-child {
        border-bottom: none;
    }

}

.local-preview-list-name {
    color: var(--text-primary-color);
    flex: 1 1 0;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.local-preview-list-url {
    color: var(--link-primary-color);
    flex: 2 1 0;
    font-family: var(--font-family-mono);
    font-size: var(--font-size-ui-sm);
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.local-preview-list-size {
    color: var(--text-light-color);
    font-size: var(--font-size-ui-sm);
    white-space: nowrap;
}

.buttons {
    display: flex;
    margin: var(--space-8) -4rem -4rem -4rem;
    position: relative;
    text-align: center;
    top: 1px;
}
</style>
