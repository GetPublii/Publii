<template>
    <section class="content backups">
        <p-header
            v-if="!noBackups"
            :title="$t('file.backups')">

            <p-button
                :onClick="goBack"
                slot="buttons"
                type="clean back">
                {{ $t('ui.backToTools') }}
            </p-button>

            <p-button
                :onClick="createBackup"
                slot="buttons"
                :type="operationInProgress ? 'disabled preloader' : 'primary icon'"
                :disabled="operationInProgress"
                icon="plus">
                {{ $t('file.createBackup') }}
            </p-button>

        </p-header>

        <empty-state
            v-if="noBackups"
            imageName="backups.svg"
            imageWidth="344"
            imageHeight="286"
            :title="$t('file.noBackupsAvailable')"
            :description="$t('file.createFirstBackupMsg')">
            <p-button
                slot="button"
                icon="plus"
                :type="operationInProgress ? 'disabled preloader' : 'icon'"
                :onClick="createBackup"
                :disabled="operationInProgress">
                {{ $t('file.createBackup') }}
            </p-button>
        </empty-state>

        <collection
            v-if="!noBackups"
            :itemsCount="5">
            <collection-header slot="header">
                <collection-cell>
                    <checkbox
                        value="all"
                        :checked="anyCheckboxIsSelected"
                        :onClick="toggleAllCheckboxes" />
                </collection-cell>

                <collection-cell>
                    {{ $t('file.filename') }}
                </collection-cell>

                <collection-cell min-width="120px">
                    {{ $t('file.fileSize') }}
                </collection-cell>

                <collection-cell min-width="160px">
                    {{ $t('file.creationDate') }}
                </collection-cell>

                <collection-cell min-width="150px">
                    {{ $t('file.operations') }}
                </collection-cell>

                <div
                    v-if="anyCheckboxIsSelected"
                    class="tools">
                    <p-button
                        icon="trash"
                        type="small light icon"
                        :onClick="bulkDelete">
                        {{ $t('ui.delete') }}
                    </p-button>
                </div>
            </collection-header>

            <collection-row
                v-for="(item, index) in items"
                slot="content"
                :key="'collection-row-' + index">
                <collection-cell>
                    <checkbox
                        :id="item.name"
                        :value="item.id"
                        :checked="isChecked(item.id)"
                        :onClick="toggleSelection"
                        :key="'collection-row-checkbox-' + index" />
                </collection-cell>

                <collection-cell type="titles">
                    <h2 class="title">
                        <a
                            :href="item.url"
                            @click.prevent.stop="showFileInFolder(item.url)">
                            {{ item.name }}
                        </a>
                    </h2>
                </collection-cell>

                <collection-cell>
                    {{ item.size }}
                </collection-cell>

                <collection-cell>
                    {{ item.createdAt }}
                </collection-cell>

                <collection-cell class="col-buttons">
                    <p-button
                        :type="operationInProgress ? 'disabled outline small' : 'outline small'"
                        :onClick="renameFile.bind(this, item.name)">
                        {{ $t('file.rename') }}
                    </p-button>

                    <p-button
                        :type="operationInProgress ? 'disabled secondary small' : 'secondary small'"
                        :onClick="restoreFile.bind(this, item.name)"
                        :disabled="operationInProgress">
                        {{ $t('file.restore') }}
                    </p-button>
                </collection-cell>
            </collection-row>
        </collection>
    </section>
</template>

<script>
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
            fileToRename: '',
            fileToRestore: ''
        };
    },
    computed: {
        noBackups () {
            return this.items.length === 0;
        }
    },
    mounted: function() {
        mainProcessAPI.send('app-backups-list-load', {
            site: this.$store.state.currentSite.config.name
        });

        mainProcessAPI.receiveOnce('app-backups-list-loaded', (data) => {
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
                message: this.$t('file.deleteBackupsConfirmMsg'),
                isDanger: true,
                okClick: this.deleteSelected
            });
        },
        deleteSelected: function() {
            let backupsToRemove = this.selectedItems.map(id => {
                return document.querySelector('input[value="' + id + '"]').getAttribute('id');
            });

            mainProcessAPI.send('app-backup-remove', {
                site: this.$store.state.currentSite.config.name,
                backupsNames: backupsToRemove
            });

            mainProcessAPI.receiveOnce('app-backup-removed', (data) => {
                this.items = data.backups;
                this.selectedItems = [];

                if (!data.status) {
                    this.$bus.$emit('message-display', {
                        message: this.$t('file.deleteBackupsErrorMsg'),
                        type: 'warning',
                        lifeTime: 3
                    });
                } else {
                    this.$bus.$emit('message-display', {
                        message: this.$t('file.deleteBackupsSuccessMsg'),
                        type: 'success',
                        lifeTime: 3
                    });
                }
            });
        },
        showFileInFolder: function(url) {
            mainProcessAPI.shellShowItemInFolder(url);
        },
        renameFile: function(originalName) {
            let oldFilename = originalName.substr(0, originalName.length - 4);
            this.fileToRename = oldFilename;

            this.$bus.$emit('confirm-display', {
                hasInput: true,
                message: this.$t('file.renameBackupConfirmMsg'),
                okClick: this.rename,
                okLabel: this.$t('file.renameBackupConfirmLabel'),
                cancelLabel: this.$t('ui.cancel'),
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
                    message: this.$t('file.renameBackupNameEmptyMsg'),
                    type: 'warning',
                    lifeTime: 3
                });

                return;
            }

            if(this.fileToRename === newFilename) {
                this.$bus.$emit('message-display', {
                    message: this.$t('file.renameBackupSameNameMsg'),
                    type: 'warning',
                    lifeTime: 3
                });

                return;
            }

            if(this.filenameIsInUse(newFilename)) {
                this.$bus.$emit('message-display', {
                    message: this.$t('file.renameBackupNameInUseMsg'),
                    type: 'warning',
                    lifeTime: 3
                });

                return;
            }

            mainProcessAPI.send('app-backup-rename', {
                site: this.$store.state.currentSite.config.name,
                oldBackupName: this.fileToRename,
                newBackupName: newFilename
            });

            mainProcessAPI.receiveOnce('app-backup-renamed', (data) => {
                if (!data.status) {
                    this.$bus.$emit('message-display', {
                        message: this.$t('file.renameBackupErrorMsg'),
                        type: 'warning',
                        lifeTime: 3
                    });
                } else {
                    this.$bus.$emit('message-display', {
                        message: this.$t('file.renameBackupSuccessMsg'),
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
                message: this.$t('file.createBackupConfirmMsg'),
                okClick: this.create,
                okLabel: this.$t('file.createBackup'),
                cancelLabel: this.$t('ui.cancel'),
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
                    message: this.$t('file.createBackupNameEmptyMsg'),
                    type: 'warning',
                    lifeTime: 3
                });

                return;
            }

            if (this.filenameIsInUse(filename)) {
                this.$bus.$emit('message-display', {
                    message: this.$t('file.createBackupNameInUseMsg', { filename }),
                    type: 'warning',
                    lifeTime: 3
                });

                return;
            }

            this.operationInProgress = true;

            mainProcessAPI.send('app-backup-create', {
                site: this.$store.state.currentSite.config.name,
                filename: filename
            });

            mainProcessAPI.receiveOnce('app-backup-created', (data) => {
                if (data.status) {
                    this.items = data.backups;

                    this.$bus.$emit('message-display', {
                        message: this.$t('file.createBackupSuccessMsg'),
                        type: 'success',
                        lifeTime: 3
                    });
                } else {
                    this.$bus.$emit('message-display', {
                        message: this.$t('file.createBackupErrorMsg'),
                        type: 'warning',
                        lifeTime: 3
                    });

                    if (data.error) {
                        this.$bus.$emit('alert-display', {
                            message: data.error,
                            buttonStyle: 'danger'
                        });
                    }
                }

                this.operationInProgress = false;
            });
        },
        restoreFile: function(fileName) {
            this.fileToRestore = fileName;

            this.$bus.$emit('confirm-display', {
                message: this.$t('file.restoreBackupConfirmMsg'),
                okClick: this.restore,
                okLabel: this.$t('file.restoreBackupConfirmLabel'),
                cancelLabel: this.$t('ui.cancel'),
            });
        },
        restore: function() {
            this.operationInProgress = true;

            mainProcessAPI.send('app-backup-restore', {
                site: this.$store.state.currentSite.config.name,
                backupName: this.fileToRestore
            });

            mainProcessAPI.receiveOnce('app-backup-restored', (data) => {
                if (!data.status) {
                    this.$bus.$emit('message-display', {
                        message: this.$t('file.restoreBackupErrorMsg') + ' ' + this.$t(data.error),
                        type: 'warning',
                        lifeTime: 3
                    });
                } else {
                    this.$bus.$emit('message-display', {
                        message: this.$t('file.restoreBackupSuccessMsg'),
                        type: 'success',
                        lifeTime: 3
                    });

                    mainProcessAPI.send('app-site-reload', {
                        siteName: this.$store.state.currentSite.config.name
                    });

                    mainProcessAPI.receiveOnce('app-site-reloaded', (result) => {
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
