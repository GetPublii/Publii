<template>
    <section class="content backups">
        <p-header
            v-if="!noBackups"
            :title="$t('file.backups')">

            <p-button
                :onClick="goBack"
                slot="buttons"
                appearance="clean"
                back>
                {{ $t('ui.backToTools') }}
            </p-button>

            <p-button
                :onClick="createBackup"
                slot="buttons"
                intent="primary"
                :disabled="backupActionsDisabled"
                :loading="activeOperation === 'create'"
                loading-layout="overlay"
                :aria-label="activeOperation === 'create' ? $t('file.creatingBackup') : null"
                icon="plus">
                {{ $t('file.createBackup') }}
            </p-button>

        </p-header>

        <empty-state
            v-if="noBackups"
            illustrationName="backups"
            illustrationWidth="344"
            illustrationHeight="286"
            :title="$t('file.noBackupsAvailable')"
            :description="$t('file.createFirstBackupMsg')">
            <p-button
                slot="button"
                icon="plus"
                :onClick="createBackup"
                :disabled="backupActionsDisabled"
                :loading="activeOperation === 'create'"
                loading-layout="overlay"
                :aria-label="activeOperation === 'create' ? $t('file.creatingBackup') : null">
                {{ $t('file.createBackup') }}
            </p-button>
        </empty-state>

        <collection
            v-if="!noBackups"
            :columns="5">
            <collection-header slot="header">
                <collection-cell>
                    <checkbox
                        value="all"
                        :checked="anyCheckboxIsSelected"
                        :onClick="toggleAllCheckboxes" />
                </collection-cell>

                <collection-cell v-for="column in columns" :key="column.field"
                    :variant="column.field === 'sizeBytes' ? 'file-size' : ''">
                    <collection-sort-button :label="column.label" :active="orderBy === column.field" :order="order"
                        :disabled="backupActionsDisabled || isLoading" @click="ordering(column.field)" />
                </collection-cell>

                <collection-cell min-width="150px">
                    {{ $t('file.operations') }}
                </collection-cell>

                <div
                    v-if="anyCheckboxIsSelected"
                    class="tools">
                    <p-button
                        icon="trash"
                        appearance="light"
                        size="small"
                        :onClick="bulkDelete"
                        :disabled="backupActionsDisabled">
                        {{ $t('ui.delete') }}
                    </p-button>
                </div>
            </collection-header>

            <collection-row
                v-for="(item, index) in sortedItems"
                slot="content"
                :key="item.name">
                <collection-cell>
                    <checkbox
                        :id="item.name"
                        :value="item.id"
                        :checked="isChecked(item.id)"
                        :onClick="toggleSelection"
                        :key="'collection-row-checkbox-' + index" />
                </collection-cell>

                <collection-cell variant="titles" justify-content="stretch">
                    <inline-name-editor
                        v-if="fileToRename === item.name"
                        ref="nameEditor"
                        :value="item.name.slice(0, -4)"
                        :validate="validateBackupName"
                        :input-label="$t('file.filename')"
                        :save-label="$t('file.saveBackupName')"
                        suffix=".tar"
                        persistent
                        :pending="activeOperation === 'rename'"
                        :pending-label="$t('file.renamingBackup')"
                        :error-message="renameError"
                        @input="renameError = ''"
                        @save="rename"
                        @cancel="cancelRename" />
                    <h2 v-else class="title">
                        <a
                            :href="item.url"
                            @click.prevent.stop="showFileInFolder(item.url)">
                            {{ item.name }}
                        </a>
                    </h2>
                    <p
                        v-if="isRestoring(item.name)"
                        class="backup-status"
                        role="status">
                        {{ $t('file.restoringBackup') }}
                    </p>
                </collection-cell>

                <collection-cell variant="file-size">
                    {{ item.size }}
                </collection-cell>

                <collection-cell>
                    {{ item.createdAt }}
                </collection-cell>

                <collection-cell variant="actions">
                    <p-button
                        appearance="outline"
                        size="small"
                        :disabled="backupActionsDisabled"
                        :ref="'renameButton-' + item.id"
                        :onClick="renameFile.bind(this, item.name)">
                        {{ $t('file.rename') }}
                    </p-button>

                    <p-button
                        appearance="secondary"
                        size="small"
                        :onClick="restoreFile.bind(this, item.name)"
                        :loading="isRestoring(item.name)"
                        loading-layout="overlay"
                        :aria-label="isRestoring(item.name) ? $t('file.restoringBackup') : null"
                        :disabled="backupActionsDisabled">
                        {{ $t('file.restore') }}
                    </p-button>
                </collection-cell>
            </collection-row>
        </collection>
    </section>
</template>

<script>
import InlineNameEditor from './basic-elements/InlineNameEditor.vue';
import BackToTools from './mixins/BackToTools.js';
import CollectionCheckboxes from './mixins/CollectionCheckboxes.js';
import CollectionOrdering from './mixins/CollectionOrdering.js';
import CollectionSortButton from './basic-elements/CollectionSortButton.vue';

export default {
    name: 'backups',
    components: { InlineNameEditor, CollectionSortButton },
    mixins: [
        BackToTools,
        CollectionCheckboxes
    ],
    data: function() {
        return {
            isLoading: true,
            items: [],
            orderBy: 'createdAtTimestamp',
            order: 'DESC',
            activeOperation: '',
            renameError: '',
            selectedItems: [],
            fileToRename: '',
            fileToRestore: ''
        };
    },
    computed: {
        columns () {
            return [
                { field: 'name', label: this.$t('file.filename') },
                { field: 'sizeBytes', label: this.$t('file.fileSize') },
                { field: 'createdAtTimestamp', label: this.$t('file.creationDate') }
            ];
        },
        sortedItems () {
            const collator = new Intl.Collator(this.$i18n.locale, { numeric: true, sensitivity: 'base' });
            return this.items.slice().sort((a, b) => {
                const value = this.orderBy === 'name' ? collator.compare(a.name, b.name) :
                    (a[this.orderBy] || 0) - (b[this.orderBy] || 0);
                return this.order === 'DESC' ? -value : value;
            });
        },
        operationInProgress () {
            return this.activeOperation !== '';
        },
        backupActionsDisabled () {
            return this.operationInProgress || this.fileToRename !== '';
        },
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
        ordering (field) {
            if (this.backupActionsDisabled || this.isLoading) return;
            CollectionOrdering.methods.ordering.call(this, field);
        },
        saveOrdering (orderBy, order) {
            this.orderBy = orderBy;
            this.order = order;
        },
        goToSettings: function() {
            this.$router.push('/app-settings');
        },
        bulkDelete: function() {
            if (this.backupActionsDisabled) return;
            this.$bus.$emit('confirm-display', {
                message: this.$t('file.deleteBackupsConfirmMsg'),
                isDanger: true,
                okClick: this.deleteSelected
            });
        },
        deleteSelected: function() {
            if (this.backupActionsDisabled) return;
            let backupsToRemove = this.items.filter(item => this.selectedItems.includes(item.id)).map(item => item.name);
            if (!backupsToRemove.length) return;

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
            if (this.backupActionsDisabled) return;
            this.fileToRename = originalName;
            this.renameError = '';
        },
        cancelRename: function(_name, { restoreFocus = true } = {}) {
            if (this.operationInProgress) return;
            let originalName = this.fileToRename;
            this.fileToRename = '';
            this.renameError = '';
            if (restoreFocus) this.focusRenameButton(originalName);
        },
        focusRenameButton: function(filename) {
            this.$nextTick(() => {
                let item = this.items.find(item => item.name === filename);
                let buttons = item && this.$refs['renameButton-' + item.id];
                let button = Array.isArray(buttons) ? buttons[0] : buttons;
                if (button && button.$el) button.$el.focus();
            });
        },
        validateBackupName: function(filename) {
            if (!filename.trim()) return this.$t('file.renameBackupNameEmptyMsg');
            if (!/^[a-z0-9_-]+$/i.test(filename)) return this.$t('file.renameBackupInvalidNameMsg');
            if (filename + '.tar' !== this.fileToRename && this.filenameIsInUse(filename)) {
                return this.$t('file.renameBackupNameInUseMsg');
            }
            return true;
        },
        rename: function(newFilename, { restoreFocus = true } = {}) {
            if (this.operationInProgress || !this.fileToRename) return;
            let validation = this.validateBackupName(newFilename);
            if (validation !== true) {
                this.renameError = validation;
                return;
            }
            let originalName = this.fileToRename;
            if (newFilename + '.tar' === originalName) {
                this.cancelRename(undefined, { restoreFocus });
                return;
            }
            this.activeOperation = 'rename';
            this.renameError = '';

            mainProcessAPI.receiveOnce('app-backup-renamed', (data) => {
                this.activeOperation = '';
                if (!data.status) {
                    // Keep both the original file identity and the user's draft for retry.
                    this.renameError = this.$t('file.renameBackupErrorMsg');
                    if (restoreFocus) {
                        this.$nextTick(() => {
                            let editors = this.$refs.nameEditor;
                            let editor = Array.isArray(editors) ? editors[0] : editors;
                            if (editor) editor.focusInput();
                        });
                    }
                    return;
                }

                // Backend IDs come from directory enumeration and can change after rename.
                let selectedNames = this.items
                    .filter(item => this.selectedItems.includes(item.id))
                    .map(item => item.name === originalName ? newFilename + '.tar' : item.name);
                this.items = data.backups;
                this.selectedItems = this.items
                    .filter(item => selectedNames.includes(item.name))
                    .map(item => item.id);
                this.fileToRename = '';
                this.renameError = '';
                this.$bus.$emit('message-display', {
                    message: this.$t('file.renameBackupSuccessMsg'),
                    type: 'success',
                    lifeTime: 3
                });
                if (restoreFocus) this.focusRenameButton(newFilename + '.tar');
            });

            mainProcessAPI.send('app-backup-rename', {
                site: this.$store.state.currentSite.config.name,
                oldBackupName: originalName.slice(0, -4),
                newBackupName: newFilename
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
            if (this.backupActionsDisabled) return;
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
            if (this.backupActionsDisabled) return;
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

            this.activeOperation = 'create';

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

                this.activeOperation = '';
            });
        },
        isRestoring: function(filename) {
            return this.activeOperation === 'restore' && this.fileToRestore === filename;
        },
        restoreFile: function(fileName) {
            if (this.backupActionsDisabled) return;
            this.fileToRestore = fileName;
            // Confirm renders sanitized HTML; keep the filename literal and wrappable.
            let filename = document.createElement('strong');
            filename.textContent = fileName;
            filename.style.overflowWrap = 'anywhere';

            this.$bus.$emit('confirm-display', {
                message: this.$t('file.restoreNamedBackupConfirmMsg', { filename: filename.outerHTML }),
                isDanger: true,
                cancelClick: () => { this.fileToRestore = ''; },
                okClick: this.restore,
                okLabel: this.$t('file.restoreBackupConfirmLabel'),
                cancelLabel: this.$t('ui.cancel'),
            });
        },
        restore: function() {
            if (this.backupActionsDisabled || !this.fileToRestore) return;
            this.activeOperation = 'restore';

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
                this.activeOperation = '';
            });
        }
    }
}
</script>
<style scoped>
.backup-status {
    color: var(--text-light-color);
    font-size: var(--font-size-ui-xs);
    font-weight: var(--font-weight-regular);
    margin: var(--space-2) 0 0;
}
</style>
