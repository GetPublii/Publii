<template>
    <section class="content tools-log-viewer">
        <p-header :title="$t('tools.logViewer')">
            <p-button
                :onClick="goBack"
                slot="buttons"
                appearance="clean"
                back>
                {{ $t('ui.backToTools') }}
            </p-button>
        </p-header>

        <div class="tools-log-viewer-selector">
            <dropdown
                id="selectedFile"
                v-model="selectedFile"
                :items="files"
                :disabled="!editorReady || isLoading"
                :onChange="loadFile"></dropdown>
            
            <p-button
                :onClick="loadSelectedFile"
                class="button-icon"
                appearance="secondary"
                :disabled="!canReload"
                :aria-busy="isLoading ? 'true' : null">
                <icon
                    :key="reloadAnimationID"
                    name="refresh"
                    :class="{ 'is-reloading': isReloading }"
                    customWidth="18"
                    customHeight="18"
                    non-interactive />
                {{ $t('ui.reloadFile') }}
            </p-button>
        </div>

        <codemirror-editor
            id="log-viewer"
            ref="codemirror"
            editorLoadedEventName="log-viewer-editor-loaded"
            :readonly="true">
        </codemirror-editor>
    </section>
</template>

<script>
import BackToTools from './mixins/BackToTools.js';

export default {
    name: 'log-viewer',
    mixins: [
        BackToTools
    ],
    data () {
        return {
            files: {},
            availableFiles: [],
            selectedFile: '',
            editorReady: false,
            isLoading: false,
            isReloading: false,
            reloadAnimationID: 0
        };
    },
    computed: {
        siteName () {
            return this.$store.state.currentSite.config.name;
        },
        canReload () {
            return this.editorReady &&
                this.availableFiles.includes(this.selectedFile) &&
                !this.isLoading;
        }
    },
    watch: {
        '$route.query.file' () {
            this.loadRequestedFile();
        }
    },
    created () {
        this._pendingFile = null;
        this._reloadTimer = null;
        this._disposed = false;
    },
    mounted () {
        this.$bus.$on('log-viewer-editor-loaded', this.onEditorLoaded);
        this.loadFilesList();
    },
    methods: {
        onEditorLoaded () {
            this.editorReady = true;
            this.loadRequestedFile();
        },
        loadRequestedFile () {
            let filename = this.$route.query.file;

            if (!this.editorReady || typeof filename !== 'string' || filename === '' ||
                this.availableFiles.indexOf(filename) === -1) {
                return;
            }

            this.selectedFile = filename;
            this.loadFile(filename);
        },
        loadFilesList () {
            // The main process returns only logs of this website and the general logs of the app
            mainProcessAPI.send('app-log-files-load', this.siteName);

            mainProcessAPI.receiveOnce('app-log-files-loaded', (data) => {
                if (this._disposed) {
                    return;
                }

                let siteFiles = Array.isArray(data.siteFiles) ? data.siteFiles : [];
                let appFiles = Array.isArray(data.appFiles) ? data.appFiles : [];
                let toItems = files => files.reduce((items, file) => {
                    items[file] = { label: file };
                    return items;
                }, {});
                let groups = {
                    ungrouped: {
                        '': { label: this.$t('tools.selectFileToLoad') }
                    }
                };

                if (siteFiles.length) {
                    groups[this.$t('tools.websiteLogs')] = toItems(siteFiles);
                }

                if (appFiles.length) {
                    groups[this.$t('tools.applicationLogs')] = toItems(appFiles);
                }

                this.availableFiles = siteFiles.concat(appFiles);
                this.files = {
                    hasGroups: true,
                    groups: groups
                };
                this.loadRequestedFile();
            });
        },
        loadFile (filename, reload = false) {
            if (this._disposed || !this.editorReady) {
                return;
            }

            if (this.isLoading) {
                this._pendingFile = filename;
                return;
            }

            this.stopReloadAnimation();

            if (filename === '') {
                this.$refs.codemirror.editor.setValue('');
                return;
            }

            if (!this.availableFiles.includes(filename)) {
                return;
            }

            const siteName = this.siteName;
            const startedAt = Date.now();
            this.isLoading = true;
            this.isReloading = reload;

            if (reload) {
                this.reloadAnimationID++;
            }

            mainProcessAPI.receiveOnce('app-log-file-loaded', data => {
                if (this._disposed) {
                    return;
                }

                this.isLoading = false;

                if (this._pendingFile !== null) {
                    const pendingFile = this._pendingFile;
                    this._pendingFile = null;
                    this.loadFile(pendingFile);
                    return;
                }

                if (siteName !== this.siteName) {
                    this.stopReloadAnimation();
                    return;
                }

                if (reload) {
                    this._reloadTimer = setTimeout(() => {
                        this.isReloading = false;
                        this._reloadTimer = null;
                    }, Math.max(0, 800 - (Date.now() - startedAt)));
                }

                if (typeof data.fileContent === 'string') {
                    const content = data.fileContent.trim() !== ''
                        ? data.fileContent
                        : this.$t('tools.logFileEmpty');
                    this.$refs.codemirror.editor.setValue(content);
                }

                this.$refs.codemirror.editor.refresh();
            });

            mainProcessAPI.send('app-log-file-load', {
                site: siteName,
                filename: filename
            });
        },
        loadSelectedFile () {
            if (!this.canReload || this._disposed) {
                return;
            }

            this.loadFile(this.selectedFile, true);
        },
        stopReloadAnimation () {
            clearTimeout(this._reloadTimer);
            this._reloadTimer = null;
            this.isReloading = false;
        }
    },
    beforeDestroy () {
        this._disposed = true;
        this.stopReloadAnimation();
        this.$bus.$off('log-viewer-editor-loaded', this.onEditorLoaded);
    }
}
</script>

<style scoped>

.tools-log-viewer-selector {
    display: flex;

    .button {
        margin-left: var(--space-4);
    }

    .is-reloading {
        animation: log-viewer-reload .8s linear infinite;
    }
}

@keyframes log-viewer-reload {
    from {
        transform: translateY(-50%) rotate(0deg);
    }

    to {
        transform: translateY(-50%) rotate(-360deg);
    }
}

@media (prefers-reduced-motion: reduce) {
    .tools-log-viewer-selector .is-reloading {
        animation: none;
    }
}
</style>
