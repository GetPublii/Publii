<template>
    <section class="content tools-log-viewer">
        <p-header title="Log viewer">
            <p-button
                :onClick="goBack"
                slot="buttons"
                type="outline">
                Back to tools
            </p-button>
        </p-header>

        <div class="tools-log-viewer-selector">
            <dropdown
                id="selectedFile"
                ref="selectedFile"
                :items="files"
                selected=""
                :onChange="loadFile"></dropdown>
        </div>

        <codemirror-editor
            id="log-viewer"
            ref="codemirror"
            :readonly="true">
        </codemirror-editor>
    </section>
</template>

<script>
import { ipcRenderer } from 'electron';
import BackToTools from './mixins/BackToTools.js';

export default {
    name: 'log-viewer',
    mixins: [
        BackToTools
    ],
    data: function() {
        return {
            files: {}
        };
    },
    mounted: function() {
        this.loadFilesList();
    },
    methods: {
        loadFilesList: function() {
            ipcRenderer.send('app-log-files-load');

            ipcRenderer.once('app-log-files-loaded', (event, data) => {
                let items = {};
                items[""] = 'Select file to load';

                if(data.files.length) {
                    for(let file of data.files) {
                        items[file] = file;
                    }
                }

                this.files = items;
            });
        },
        loadFile: function(filename) {
            if (filename === '') {
                this.$refs.codemirror.editor.setValue('');
                return;
            }

            ipcRenderer.send('app-log-file-load', filename);

            ipcRenderer.once('app-log-file-loaded', (event, data) => {
                if(typeof data.fileContent === 'string') {
                    if(data.fileContent.trim() !== '') {
                        this.$refs.codemirror.editor.setValue(data.fileContent);
                    } else {
                        this.$refs.codemirror.editor.setValue('This log file is empty...');
                    }
                }

                this.$refs.codemirror.editor.refresh();
            });
        }
    }
}
</script>

<style lang="scss" scoped>
@import '../scss/variables.scss';
</style>
