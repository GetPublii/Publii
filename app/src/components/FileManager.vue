<template>
    <section class="content file-manager">
        <p-header
            :title="$t('file.files')">
            <header-search
                slot="search"
                ref="search"
                :placeholder="$t('file.filterOrSearchFiles')"
                onChangeEventName="files-filter-value-changed" />

            <p-button
                :onClick="goBack"
                slot="buttons"
                type="clean back">
                {{ $t('ui.backToTools') }}
            </p-button>

            <p-button
                :onClick="addNewFile"
                slot="buttons"
                type="secondary icon"
                icon="plus">
                {{ $t('file.addNewFile') }}
            </p-button>

            <p-button
                :onClick="uploadFiles"
                slot="buttons"
                type="icon"
                icon="upload-file">
                {{ $t('file.uploadFiles') }}
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

                {{ $t('file.rootDirectory') }}
            </a>

            <a
                :class="{ 'directory-link': true, 'is-active': isMedia }"
                @click="changeDirectory('media/files')">
                <icon
                    name="folder"
                    customWidth="22"
                    customHeight="16"
                    :primaryColor="isMedia ? 'color-1' : 'color-7'" />

                {{ $t('file.mediaFiles') }}
            </a>
        </div>

        <collection
            v-if="!emptySearchResults && hasFiles"
            :itemsCount="5">
            <collection-header slot="header">
                <collection-cell>
                    <checkbox
                        value="all"
                        :checked="anyCheckboxIsSelected"
                        :onClick="toggleAllCheckboxes.bind(this, true)" />
                </collection-cell>

                <collection-cell>
                    {{ $t('file.filename') }}
                </collection-cell>

                <collection-cell min-width="100px">
                    {{ $t('file.fileSize') }}
                </collection-cell>

                <collection-cell min-width="130px">
                    {{ $t('file.creationDate') }}
                </collection-cell>

                <collection-cell min-width="200px">
                    {{ $t('ui.lastModified') }}
                </collection-cell>

                <div
                    v-if="anyCheckboxIsSelected"
                    class="tools">
                    <p-button
                        icon="trash"
                        type="small danger icon light"
                        :onClick="bulkDelete">
                        {{ $t('ui.delete') }}
                    </p-button>
                </div>
            </collection-header>

            <collection-row
                v-for="(item, index) in filteredFiles"
                slot="content"
                :key="'collection-row-' + index">
                <collection-cell>
                    <checkbox
                        :value="item.name"
                        :checked="isChecked(index)"
                        :onClick="toggleSelection.bind(this, index)"
                        :key="'collection-row-checkbox-' + index" />
                </collection-cell>

                <collection-cell
                    type="titles">
                    <a
                        :href="item.name"
                        class="file-link"
                        :data-is-binary="item.isBinary"
                        @click="openFile($event, item.fullPath)">
                        <icon
                            size="s"
                            :name="item.icon"
                            :customCssClasses="'file ' + item.icon"
                            iconset="svg-map-file-extensions"
                            customWidth="22"
                            customHeight="24" />

                        {{ item.name }}
                    </a>
                </collection-cell>

                <collection-cell>
                    {{ item.size }}
                </collection-cell>

                <collection-cell>
                    {{ item.createdAt }}
                </collection-cell>

                <collection-cell>
                    {{ item.modifiedAt }}
                </collection-cell>
            </collection-row>
        </collection>

        <empty-state
            v-if="hasFiles && emptySearchResults"
            :description="$t('file.noFileMatchingCriteriaInfo')"></empty-state>

        <empty-state
            v-if="!hasFiles && isRoot"
            :description="$t('file.noFileInRootDirInfo')"></empty-state>

        <empty-state
            v-if="!hasFiles && isMedia"
            :description="$t('file.noFileInMediaFilesDirInfo')"></empty-state>
    </section>
</template>

<script>
import BackToTools from './mixins/BackToTools.js';
import CollectionCheckboxes from './mixins/CollectionCheckboxes.js';

export default {
    name: 'file-manager',
    mixins: [
        BackToTools,
        CollectionCheckboxes
    ],
    data () {
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
        hasFiles () {
            return !!this.items.length;
        },
        emptySearchResults () {
            return this.filterValue !== '' && !this.items.length;
        },
        isRoot () {
            return this.dirPath === 'root-files';
        },
        isMedia () {
            return this.dirPath !== 'root-files';
        },
        filteredFiles () {
            return this.items.filter(file => {
                if(this.filterValue.trim() === '') {
                    return true;
                }

                return file.name.indexOf(this.filterValue) > -1;
            });
        }
    },
    mounted () {
        this.$bus.$on('posts-filter-value-changed', (newValue) => {
            this.filterValue = newValue.trim().toLowerCase();
        });

        mainProcessAPI.receive('app-files-selected', (data) => {
            if (data.paths !== undefined && data.paths.filePaths.length) {
                this.uploadFile(data.paths.filePaths);
            }
        });

        this.loadFiles();
    },
    beforeDestroy () {
        mainProcessAPI.stopReceiveAll('app-files-selected');
    },
    methods: {
        loadFiles () {
            this.isLoading = true;

            mainProcessAPI.send('app-file-manager-list', {
                siteName: this.$store.state.currentSite.config.name,
                dirPath: this.dirPath
            });

            mainProcessAPI.receiveOnce('app-file-manager-listed', (data) => {
                this.items = data.map(file => {
                    file.size = this.formatBytes(file.size, 2);
                    file.createdAt = this.getFormatedDate(file.createdAt);
                    file.modifiedAt = this.getFormatedDate(file.modifiedAt);

                    return file;
                });

                this.isLoading = false;
            });
        },
        getFormatedDate (timestamp) {
            if(this.$store.state.app.config.timeFormat == 12) {
                return this.$moment(timestamp).format('MMM DD, YYYY  hh:mm a');
            } else {
                return this.$moment(timestamp).format('MMM DD, YYYY  HH:mm');
            }
        },
        bulkDelete () {
            this.$bus.$emit('confirm-display', {
                message: this.$t('file.removeFilesConfirmMsg'),
                isDanger: true,
                okClick: this.deleteSelected
            });
        },
        deleteSelected () {
            mainProcessAPI.send('app-file-manager-delete', {
                siteName: this.$store.state.currentSite.config.name,
                dirPath: this.dirPath,
                filesToDelete: this.getSelectedFiles()
            });

            mainProcessAPI.receiveOnce('app-file-manager-deleted', (data) => {
                this.loadFiles();

                this.$bus.$emit('message-display', {
                    message: this.$t('file.removeFilesSuccessMsg'),
                    type: 'success',
                    lifeTime: 3
                });

                this.selectedItems = [];
            });
        },
        formatBytes (bytes, decimals) {
            if(bytes == 0) {
                return '0 bytes';
            }

            let k = 1024;
            let dm = decimals || 2;
            let sizes = ['bytes', 'kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
            let i = Math.floor(Math.log(bytes) / Math.log(k));

            return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
        },
        openFile (e, filePath) {
            e.preventDefault();
            // Uncomment this when file editor will be ready
            // if(item.attr('data-is-binary') === 'true') {
                mainProcessAPI.shellOpenPath(filePath);
            // } else {
            //    console.log('OPENING: ' + item.attr('href'));
            // }

        },
        changeDirectory (dirPath) {
            if(this.dirPath === dirPath) {
                return;
            }

            this.dirPath = dirPath;
            this.loadFiles();
            this.$refs.search.isOpen = false;
            this.$refs.search.value = '';
            this.$refs.search.updateValue();
        },
        addNewFile () {
            this.$bus.$emit('confirm-display', {
                message: this.$t('file.provideNameForNewFile'),
                hasInput: true,
                okClick: this.addFile
            });
        },
        addFile (fileName) {
            if(fileName === false) {
                return;
            }

            mainProcessAPI.send('app-file-manager-create', {
                siteName: this.$store.state.currentSite.config.name,
                dirPath: this.dirPath,
                fileToSave: fileName
            });

            mainProcessAPI.receiveOnce('app-file-manager-created', (data) => {
                if(data === false) {
                    this.$bus.$emit('alert-display', {
                        message: this.$t('file.selectedFilenameInUseMsg'),
                    });

                    return;
                }

                this.loadFiles();
            });
        },
        async uploadFiles () {
            await mainProcessAPI.invoke('app-main-process-select-files', false);
        },
        uploadFile (queue) {
            if(!queue.length) {
                if(this.existingItems.length) {
                    this.$bus.$emit('alert-display', {
                        'message': this.$t('file.selectedFileExistsMsg') + this.existingItems.join(', ')
                    });

                    this.existingFiles = [];
                }

                this.loadFiles();

                return;
            }

            let fileToMove = queue.pop();

            mainProcessAPI.send('app-file-manager-upload', {
                siteName: this.$store.state.currentSite.config.name,
                dirPath: this.dirPath,
                fileToMove: fileToMove
            });

            mainProcessAPI.receiveOnce('app-file-manager-uploaded', (data) => {
                if(data === false) {
                    let fileName = fileToMove.split('/').pop();
                    this.existingItems.push(fileName);
                }

                this.uploadFile(queue);
            });
        },
        filenameIsInUse (filename) {
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
            font-size: 1.35rem;
            transition: var(--transition);

            &:hover {
                color: var(--link-primary-color);
            }

            & + .directory-link {
                margin-left: 2rem;
            }

            &.is-active {
                color: var(--link-primary-color);
            }
        }
    }
}
</style>
