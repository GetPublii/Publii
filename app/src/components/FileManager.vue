<template>
    <section class="content file-manager">
        <p-header
            title="Files">
            <header-search
                slot="search"
                ref="search"
                placeholder="Filter or search files..."
                onChangeEventName="files-filter-value-changed" />

            <p-button
                :onClick="goBack"
                slot="buttons"
                type="outline">
                Back to tools
            </p-button>

            <p-button
                :onClick="addNewFile"
                slot="buttons"
                type="primary icon"
                icon="plus">
                Add new file
            </p-button>

            <p-button
                :onClick="uploadFiles"
                slot="buttons"
                type="icon"
                icon="upload-file">
                Upload files
            </p-button>
        </p-header>

        <div class="filters">
            <a
                :class="{ 'directory-link': true, 'is-active': isRoot }"
                @click="changeDirectory('root-files')">
                <icon
                    name="folder"
                    customWidth="22"
                    customHeight="16"
                    :primaryColor="isRoot ? 'color-1' : 'color-7'" />

                root directory
            </a>

            <a
                :class="{ 'directory-link': true, 'is-active': isMedia }"
                @click="changeDirectory('media/files')">
                <icon
                    name="folder"
                    customWidth="22"
                    customHeight="16"
                    :primaryColor="isMedia ? 'color-1' : 'color-7'" />

                media/files
            </a>
        </div>

        <collection v-if="!emptySearchResults && hasFiles">
            <collection-header slot="header">
                <collection-cell width="40px">
                    <checkbox
                        value="all"
                        :checked="anyCheckboxIsSelected"
                        :onClick="toggleAllCheckboxes.bind(this, true)" />
                </collection-cell>

                <collection-cell width="calc(100% - 590px)">
                    Filename
                </collection-cell>

                <collection-cell width="150px">
                    File size
                </collection-cell>

                <collection-cell width="200px">
                    Creation date
                </collection-cell>

                <collection-cell width="200px">
                    Last modified
                </collection-cell>

                <div
                    v-if="anyCheckboxIsSelected"
                    class="tools">
                    <p-button
                        icon="trash"
                        type="small danger icon"
                        :onClick="bulkDelete">
                        Delete
                    </p-button>
                </div>
            </collection-header>

            <collection-row
                v-for="(item, index) in filteredFiles"
                slot="content"
                :key="index">
                <collection-cell width="40px">
                    <checkbox
                        :value="item.name"
                        :checked="isChecked(index)"
                        :onClick="toggleSelection.bind(this, index)" />
                </collection-cell>

                <collection-cell
                    type="titles"
                    width="calc(100% - 590px)">
                    <a
                        :href="item.name"
                        class="file-link"
                        :data-is-binary="item.isBinary"
                        @click="openFile($event, item.fullPath)">
                        <icon
                            size="s"
                            :name="item.icon"
                            :customCssClasses="'file ' + item.icon"
                            iconset="file-extensions-map"
                            customWidth="22"
                            customHeight="24" />

                        {{ item.name }}
                    </a>
                </collection-cell>

                <collection-cell width="150px">
                    {{ item.size }}
                </collection-cell>

                <collection-cell width="200px">
                    {{ item.createdAt }}
                </collection-cell>

                <collection-cell width="200px">
                    {{ item.modifiedAt }}
                </collection-cell>
            </collection-row>
        </collection>

        <empty-state
            v-if="hasFiles && emptySearchResults"
            description="There are no files matching your criteria."></empty-state>

        <empty-state
            v-if="!hasFiles && isRoot"
            description="There are no files in the root directory..."></empty-state>

        <empty-state
            v-if="!hasFiles && isMedia"
            description="There are no files in the media/files directory..."></empty-state>
    </section>
</template>

<script>
import { ipcRenderer, shell, remote } from 'electron';
import BackToTools from './mixins/BackToTools.js';
import CollectionCheckboxes from './mixins/CollectionCheckboxes.js';
const mainProcess = remote.require('./main');

export default {
    name: 'file-manager',
    mixins: [
        BackToTools,
        CollectionCheckboxes
    ],
    data: function() {
        return {
            filterValue: '',
            items: [],
            selectedItems: [],
            existingItems: [],
            dirPath: 'root-files',
            isLoading: true
        };
    },
    computed: {
        hasFiles: function() {
            return !!this.items.length;
        },
        emptySearchResults: function() {
            return this.filterValue !== '' && !this.items.length;
        },
        isRoot: function() {
            return this.dirPath === 'root-files';
        },
        isMedia: function() {
            return this.dirPath !== 'root-files';
        },
        filteredFiles: function() {
            return this.items.filter(file => {
                if(this.filterValue.trim() === '') {
                    return true;
                }

                return file.name.indexOf(this.filterValue) > -1;
            });
        }
    },
    mounted: function() {
        this.$bus.$on('posts-filter-value-changed', (newValue) => {
            this.filterValue = newValue.trim().toLowerCase();
        });

        ipcRenderer.on('app-files-selected', (event, data) => {
            if (data.paths !== undefined && data.paths.filePaths.length) {
                this.uploadFile(data.paths.filePaths);
            }
        });

        this.loadFiles();
    },
    beforeDestroy: function() {
        ipcRenderer.removeAllListeners('app-files-selected');
    },
    methods: {
        loadFiles: function() {
            this.isLoading = true;

            ipcRenderer.send('app-file-manager-list', {
                siteName: this.$store.state.currentSite.config.name,
                dirPath: this.dirPath
            });

            ipcRenderer.once('app-file-manager-listed', (event, data) => {
                this.items = data.map(file => {
                    file.size = this.formatBytes(file.size, 2);
                    file.createdAt = this.getFormatedDate(file.createdAt);
                    file.modifiedAt = this.getFormatedDate(file.modifiedAt);

                    return file;
                });

                this.isLoading = false;
            });
        },
        getFormatedDate: function(timestamp) {
            if(this.$store.state.app.config.timeFormat == 12) {
                return this.$moment(timestamp).format('MMM DD, YYYY  hh:mm a');
            } else {
                return this.$moment(timestamp).format('MMM DD, YYYY  HH:mm');
            }
        },
        bulkDelete: function() {
            this.$bus.$emit('confirm-display', {
                message: 'Do you really want to remove selected files? It cannot be undone.',
                okClick: this.deleteSelected
            });
        },
        deleteSelected: function() {
            ipcRenderer.send('app-file-manager-delete', {
                siteName: this.$store.state.currentSite.config.name,
                dirPath: this.dirPath,
                filesToDelete: this.getSelectedFiles()
            });

            ipcRenderer.once('app-file-manager-deleted', (event, data) => {
                this.loadFiles();

                this.$bus.$emit('message-display', {
                    message: 'Selected files have been removed',
                    type: 'success',
                    lifeTime: 3
                });

                this.selectedItems = [];
            });
        },
        formatBytes: function(bytes, decimals) {
            if(bytes == 0) {
                return '0 bytes';
            }

            let k = 1024;
            let dm = decimals || 2;
            let sizes = ['bytes', 'kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
            let i = Math.floor(Math.log(bytes) / Math.log(k));

            return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
        },
        openFile: function(e, filePath) {
            e.preventDefault();
            // Uncomment this when file editor will be ready
            // if(item.attr('data-is-binary') === 'true') {
                shell.openItem(filePath);
            // } else {
            //    console.log('OPENING: ' + item.attr('href'));
            // }

        },
        changeDirectory: function(dirPath) {
            if(this.dirPath === dirPath) {
                return;
            }

            this.dirPath = dirPath;
            this.loadFiles();
            this.$refs.search.isOpen = false;
            this.$refs.search.value = '';
            this.$refs.search.updateValue();
        },
        addNewFile: function() {
            this.$bus.$emit('confirm-display', {
                message: 'Please provide name for a new file',
                hasInput: true,
                okClick: this.addFile
            });
        },
        addFile: function(fileName) {
            if(fileName === false) {
                return;
            }

            ipcRenderer.send('app-file-manager-create', {
                siteName: this.$store.state.currentSite.config.name,
                dirPath: this.dirPath,
                fileToSave: fileName
            });

            ipcRenderer.once('app-file-manager-created', (event, data) => {
                if(data === false) {
                    this.$bus.$emit('alert-display', {
                        message: 'The selected filename is in use. Please try to use a different filename.'
                    });

                    return;
                }

                this.loadFiles();
            });
        },
        uploadFiles: function() {
            mainProcess.selectFiles(false);
        },
        uploadFile: function(queue) {
            if(!queue.length) {
                if(this.existingItems.length) {
                    this.$bus.$emit('alert-display', {
                        'message': 'The following files exists in the selected directory so it cannot be copied: ' + this.existingItems.join(', ')
                    });

                    this.existingFiles = [];
                }

                this.loadFiles();

                return;
            }

            let fileToMove = queue.pop();

            ipcRenderer.send('app-file-manager-upload', {
                siteName: this.$store.state.currentSite.config.name,
                dirPath: this.dirPath,
                fileToMove: fileToMove
            });

            ipcRenderer.once('app-file-manager-uploaded', (event, data) => {
                if(data === false) {
                    let fileName = fileToMove.split('/').pop();
                    this.existingItems.push(fileName);
                }

                this.uploadFile(queue);
            });
        },
        filenameIsInUse(filename) {
            for(let file of this.items) {
                if(filename === file.name) {
                    return true;
                }
            }

            return false;
        },
        getSelectedFiles () {
            let selectedItems;
            let visibleNames = this.items.map(item => item.name);

            selectedItems = this.selectedItems.map(
                item => this.items[item].name
            ).filter(
                name => visibleNames.indexOf(name) > -1
            );

            return selectedItems;
        }
    },
    beforeDestroy () {
        this.$bus.$off('posts-filter-value-changed');
    }
}
</script>

<style lang="scss" scoped>
@import '../scss/variables.scss';

.file-manager {
    .filters {
        margin-top: -1.5rem;

        .directory-link {
            color: var(--text-light-color);
            cursor: pointer;
            font-size: 1.4rem;
            transition: var(--transition);
            
            &:hover {
                color: var(--link-primary-color);
            }

            & + .directory-link {
                margin-left: 2rem;
            }

            &.is-active {
                color: var(--primary-color);
            }
        }
    }
}
</style>
