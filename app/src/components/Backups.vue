<template>
    <section class="content backups">
        <p-header
            v-if="!(noLocation || noBackups)"
            title="Backups">

            <p-button
                :onClick="goBack"
                slot="buttons"
                type="outline">
                Back to tools
            </p-button>

            <p-button
                :onClick="createBackup"
                slot="buttons"
                :type="addBackupButtonType"
                icon="plus">
                Create backup
            </p-button>

        </p-header>

        <empty-state
            v-if="noLocation"
            imageName="backup-path.svg"
            imageWidth="254"
            imageHeight="284"
            title="Set your default backup location."
            description="Your backup save file path hasn't been specified; let's fix that!">
            <p-button
                slot="button"
                :onClick="goToSettings">
                Set the backup location
            </p-button>
        </empty-state>

        <empty-state
            v-if="noBackups"
            imageName="backups.svg"
            imageWidth="254"
            imageHeight="284"
            title="No backups available"
            description="You don't have any backups, yet. Let's create the first one!">
            <p-button
                slot="button"
                icon="plus"
                type="icon"
                :onClick="createBackup"
                :disabled="operationInProgress">
                <template v-if="!operationInProgress">Create the first backup</template>
                <template v-if="operationInProgress">Creating backup&hellip;</template>
            </p-button>
        </empty-state>

        <collection v-if="!(noLocation || noBackups)">
            <collection-header slot="header">
                <collection-cell width="40px">
                    <checkbox
                        value="all"
                        :checked="anyCheckboxIsSelected"
                        :onClick="toggleAllCheckboxes" />
                </collection-cell>

                <collection-cell width="calc(100% - 485px)">
                    Filename
                </collection-cell>

                <collection-cell width="100px">
                    File Size
                </collection-cell>

                <collection-cell width="175px">
                    Creation date
                </collection-cell>

                <collection-cell width="170px">
                    Operations
                </collection-cell>

                <div
                    v-if="anyCheckboxIsSelected"
                    class="tools">
                    <p-button
                        icon="trash"
                        type="small light icon"
                        :onClick="bulkDelete">
                        Delete
                    </p-button>
                </div>
            </collection-header>

            <collection-row
                v-for="(item, index) in items"
                slot="content"
                :key="index">
                <collection-cell width="40px">
                    <checkbox
                        :id="item.name"
                        :value="item.id"
                        :checked="isChecked(item.id)"
                        :onClick="toggleSelection" />
                </collection-cell>

                <collection-cell width="calc(100% - 485px)">
                    <a
                        :href="item.url"
                        @click.prevent.stop="showFileInFolder(item.url)">
                        {{ item.name }}
                    </a>
                </collection-cell>

                <collection-cell width="100px">
                    {{ item.size }}
                </collection-cell>

                <collection-cell width="175px">
                    {{ item.createdAt }}
                </collection-cell>

                <collection-cell width="170px">
                    <p-button
                        :type="renameButtonType"
                        :onClick="renameFile.bind(this, item.name)">
                        Rename
                    </p-button>

                    <p-button
                        :type="restoreButtonType"
                        :onClick="restoreFile.bind(this, item.name)">
                        Restore
                    </p-button>
                </collection-cell>
            </collection-row>
        </collection>
    </section>
</template>

<script>
import { ipcRenderer, shell } from 'electron';
import BackToTools from './mixins/BackToTools.js';
import CollectionCheckboxes from './mixins/CollectionCheckboxes.js';

export default {
    name: 'backups',
    mixins: [
        BackToTools,
        CollectionCheckboxes
    ],
    data: function() {
        return {
            isLoading: true,
            items: [],
            operationInProgress: false,
            selectedItems: [],
            noLocation: this.$store.state.app.config.backupsLocation === '',
            fileToRename: '',
            fileToRestore: ''
        };
    },
    computed: {
        addBackupButtonType: function() {
            if(this.operationInProgress) {
                return 'disabled preloader';
            }

            return 'primary icon';
        },
        renameButtonType: function() {
            if(this.operationInProgress) {
                return 'disabled outline small';
            }

            return 'outline small';
        },
        restoreButtonType: function() {
            if(this.operationInProgress) {
                return 'disabled secondary small';
            }

            return 'secondary small';
        },
        noBackups: function() {
            return this.items.length === 0;
        }
    },
    mounted: function() {
        ipcRenderer.send('app-backups-list-load', {
            "site": this.$store.state.currentSite.config.name
        });

        ipcRenderer.once('app-backups-list-loaded', (event, data) => {
            if (data.status) {
                this.isLoading = false;
                this.items = data.backups;
            }
        });
    },
    methods: {
        goToSettings: function() {
            this.$router.push('/app-settings');
        },
        bulkDelete: function() {
            this.$bus.$emit('confirm-display', {
                message: 'Do you really want to remove the selected backups? This action cannot be undone.',
                okClick: this.deleteSelected
            });
        },
        deleteSelected: function() {
            let backupsToRemove = this.selectedItems.map(id => {
                return document.querySelector('input[value="' + id + '"]').getAttribute('id');
            });

            ipcRenderer.send('app-backup-remove', {
                site: this.$store.state.currentSite.config.name,
                backupsNames: backupsToRemove
            });

            ipcRenderer.once('app-backup-removed', (event, data) => {
                this.items = data.backups;
                this.selectedItems = [];

                if (!data.status) {
                    this.$bus.$emit('message-display', {
                        message: 'An error occurred during selected backup file removal. Please try again.',
                        type: 'warning',
                        lifeTime: 3
                    });
                } else {
                    this.$bus.$emit('message-display', {
                        message: 'Selected backups have been removed',
                        type: 'success',
                        lifeTime: 3
                    });
                }
            });
        },
        showFileInFolder: function(url) {
            shell.showItemInFolder(url);
        },
        renameFile: function(originalName) {
            let oldFilename = originalName.substr(0, originalName.length - 4);
            this.fileToRename = oldFilename;

            this.$bus.$emit('confirm-display', {
                hasInput: true,
                message: 'Please specify a new backup filename:',
                okClick: this.rename,
                okLabel: 'Rename file',
                cancelLabel: 'Cancel',
                defaultText: oldFilename
            });
        },
        rename: function(newFilename) {
            if (!newFilename) {
                return;
            }

            newFilename = newFilename.replace(/[^a-z0-9\-\_]/gmi, '');

            if(newFilename.trim() === '') {
                this.$bus.$emit('message-display', {
                    message: 'The backup filename cannot be empty. Please try again.',
                    type: 'warning',
                    lifeTime: 3
                });

                return;
            }

            if(this.fileToRename === newFilename) {
                this.$bus.$emit('message-display', {
                    message: 'The specified name is the same as the old name. Please try again.',
                    type: 'warning',
                    lifeTime: 3
                });

                return;
            }

            if(this.filenameIsInUse(newFilename)) {
                this.$bus.$emit('message-display', {
                    message: 'The specified name is used by other backup file. Please try again.',
                    type: 'warning',
                    lifeTime: 3
                });

                return;
            }

            ipcRenderer.send('app-backup-rename', {
                site: this.$store.state.currentSite.config.name,
                oldBackupName: this.fileToRename,
                newBackupName: newFilename
            });

            ipcRenderer.once('app-backup-renamed', (event, data) => {
                if (!data.status) {
                    this.$bus.$emit('message-display', {
                        message: 'An error occurred while renaming the selected backup file. Please try again.',
                        type: 'warning',
                        lifeTime: 3
                    });
                } else {
                    this.$bus.$emit('message-display', {
                        message: 'The backup has been sucessfully renamed.',
                        type: 'success',
                        lifeTime: 3
                    });
                }

                this.items = data.backups;
                this.fileToRename = '';
            });
        },
        filenameIsInUse(filename) {
            for(let backupData of this.items) {
                if(filename + '.tar' === backupData.name) {
                    return true;
                }
            }

            return false;
        },
        createBackup: function() {
            let siteNamePrefix = this.$store.state.currentSite.config.name;
            let defaultFilename = siteNamePrefix + '-' + this.$moment().format('MM-DD-YYYY-HH-mm-ss');

            this.$bus.$emit('confirm-display', {
                hasInput: true,
                message: 'Select a name for your backup - filename can contain only alphanumeric characters, dashes and underscores:',
                okClick: this.create,
                okLabel: 'Create backup',
                cancelLabel: 'Cancel',
                defaultText: defaultFilename
            });
        },
        create: function(filename) {
            if (filename === false) {
                return;
            }

            filename = filename.replace(/[^a-z0-9\-\_]/gmi, '');

            if (filename.trim() === '') {
                this.$bus.$emit('message-display', {
                    message: 'Provided filename cannot be empty. Please try again with a different name.',
                    type: 'warning',
                    lifeTime: 3
                });

                return;
            }

            if (this.filenameIsInUse(filename)) {
                this.$bus.$emit('message-display', {
                    message: 'Provided filename (<strong>' + filename + '</strong>) is used by an existing backup. Please try again with a different name.',
                    type: 'warning',
                    lifeTime: 3
                });

                return;
            }

            this.operationInProgress = true;

            ipcRenderer.send('app-backup-create', {
                site: this.$store.state.currentSite.config.name,
                filename: filename
            });

            ipcRenderer.once('app-backup-created', (event, data) => {
                if (data.status) {
                    this.items = data.backups;
                } else {
                    this.$bus.$emit('message-display', {
                        message: 'An error occurred during backup creation. Please try again.',
                        type: 'warning',
                        lifeTime: 3
                    });
                }

                this.operationInProgress = false;
            });
        },
        restoreFile: function(fileName) {
            this.fileToRestore = fileName;

            this.$bus.$emit('confirm-display', {
                message: 'Do you really want to restore the selected backup? Existing files will be overwritten.',
                okClick: this.restore,
                okLabel: 'Restore backup',
                cancelLabel: 'Cancel'
            });
        },
        restore: function() {
            this.operationInProgress = true;

            ipcRenderer.send('app-backup-restore', {
                site: this.$store.state.currentSite.config.name,
                backupName: this.fileToRestore
            });

            ipcRenderer.once('app-backup-restored', (event, data) => {
                if (!data.status) {
                    this.$bus.$emit('message-display', {
                        message: 'An error occurred while restoring the selected backup file: ' + data.error,
                        type: 'warning',
                        lifeTime: 3
                    });
                } else {
                    this.$bus.$emit('message-display', {
                        message: 'The website has been successfully restored.',
                        type: 'success',
                        lifeTime: 3
                    });

                    ipcRenderer.send('app-site-reload', {
                        siteName: this.$store.state.currentSite.config.name
                    });

                    ipcRenderer.once('app-site-reloaded', (event, result) => {
                        this.$store.commit('setSiteConfig', result);
                        this.$store.commit('switchSite', result.data);
                    });
                }

                this.fileToRestore = '';
                this.operationInProgress = false;
            });
        }
    }
}
</script>
<style lang="scss" scoped>
@import '../scss/variables.scss';
</style>
