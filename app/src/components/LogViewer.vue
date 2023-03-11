<template>
    <section class="content tools-log-viewer">
        <p-header :title="$t('tools.logViewer')">
            <p-button
                :onClick="goBack"
                slot="buttons"
                type="clean back">
                {{ $t('ui.backToTools') }}
            </p-button>
        </p-header>

        <div class="tools-log-viewer-selector">
            <dropdown
                id="selectedFile"
                ref="selectedFile"
                :items="files"
                selected=""
                :onChange="loadFile"></dropdown>
            
            <p-button
                :onClick="loadSelectedFile"
                type="secondary">
                {{ $t('ui.reloadFile') }}
            </p-button>
        </div>

        <codemirror-editor
            id="log-viewer"
            ref="codemirror"
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
            files: {}
        };
    },
    mounted () {
        this.loadFilesList();
    },
    methods: {
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
            let filename = this.$refs['selectedFile'].selectedValue;
            this.loadFile(filename);
        }
    }
}
</script>

<style lang="scss" scoped>
@import '../scss/variables.scss';

.tools-log-viewer-selector {
    display: flex;

    .button {
        margin-left: 1rem;
    }
}
</style>
