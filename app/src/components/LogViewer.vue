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
                :onChange="loadFile"></dropdown>
            
            <p-button
                :onClick="loadSelectedFile"
                appearance="secondary">
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
            editorReady: false
        };
    },
    computed: {
        siteName () {
            return this.$store.state.currentSite.config.name;
        }
    },
    watch: {
        '$route.query.file' () {
            this.loadRequestedFile();
        }
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
        loadFile (filename) {
            if (filename === '') {
                this.$refs.codemirror.editor.setValue('');
                return;
            }

            mainProcessAPI.send('app-log-file-load', {
                site: this.siteName,
                filename: filename
            });

            mainProcessAPI.receiveOnce('app-log-file-loaded', (data) => {
                if(typeof data.fileContent === 'string') {
                    if(data.fileContent.trim() !== '') {
                        this.$refs.codemirror.editor.setValue(data.fileContent);
                    } else {
                        this.$refs.codemirror.editor.setValue(this.$t('tools.logFileEmpty'));
                    }
                }

                this.$refs.codemirror.editor.refresh();
            });
        },
        loadSelectedFile () {
            this.loadFile(this.selectedFile);
        }
    },
    beforeDestroy () {
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
}
</style>
