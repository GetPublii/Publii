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
            selectedFile: '',
            editorReady: false
        };
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
    beforeDestroy () {
        this.$bus.$off('log-viewer-editor-loaded', this.onEditorLoaded);
    },
    methods: {
        onEditorLoaded () {
            this.editorReady = true;
            this.loadRequestedFile();
        },
        loadRequestedFile () {
            let filename = this.$route.query.file;

            if (!this.editorReady || typeof filename !== 'string' || filename === '' ||
                !Object.prototype.hasOwnProperty.call(this.files, filename)) {
                return;
            }

            this.selectedFile = filename;
            this.loadFile(filename);
        },
        loadFilesList () {
            mainProcessAPI.send('app-log-files-load');

            mainProcessAPI.receiveOnce('app-log-files-loaded', (data) => {
                let items = {};
                items[""] = this.$t('tools.selectFileToLoad');

                if(data.files.length) {
                    for(let file of data.files) {
                        items[file] = file;
                    }
                }

                this.files = items;
                this.loadRequestedFile();
            });
        },
        loadFile (filename) {
            if (filename === '') {
                this.$refs.codemirror.editor.setValue('');
                return;
            }

            mainProcessAPI.send('app-log-file-load', filename);

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
