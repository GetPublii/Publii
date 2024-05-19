const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('mainProcessAPI', {
    shellShowItemInFolder: (url) => ipcRenderer.invoke('publii-shell-show-item-in-folder', url),
    shellOpenPath: (filePath) => ipcRenderer.invoke('publii-shell-open-path', filePath),
    shellOpenExternal: (url) => ipcRenderer.invoke('publii-shell-open-external', url),
    existsSync: (pathToCheck) => ipcRenderer.invoke('publii-native-exists-sync', pathToCheck),
    normalizePath: (pathToNormalize) => ipcRenderer.invoke('publii-native-normalize-path', pathToNormalize),
    createMD5: (value) => ipcRenderer.invoke('publii-native-md5', value),
    getEnv: () => ({
        name: process.env.NODE_ENV,
        nodeVersion: process.versions.node,
        chromeVersion: process.versions.chrome,
        electronVersion: process.versions.electron,
        platformName: process.platform
    }),
    send: (channel, ...data) => {
        const validChannels = [
            'app-save-color-theme',
            'app-license-load',
            'app-config-save',
            'app-backup-set-location',
            'app-theme-upload',
            'app-author-save',
            'app-author-cancel',
            'app-authors-load',
            'app-author-delete',
            'app-backups-list-load',
            'app-backup-remove',
            'app-backup-rename',
            'app-backup-create',
            'app-backup-restore',
            'app-site-reload',
            'app-site-css-load',
            'app-site-css-save',
            'app-site-config-save',
            'app-site-check-website-to-restore',
            'app-site-check-website-catalog-availability',
            'app-site-restore-from-backup',
            'app-site-remove-temporary-backup-files',
            'app-site-restore-from-backup',
            'app-file-manager-list',
            'app-file-manager-delete',
            'app-file-manager-create',
            'app-file-manager-upload',
            'app-log-files-load',
            'app-log-file-load',
            'app-menu-update',
            'publii-set-spellchecker-language',
            'app-post-load',
            'app-post-save',
            'app-post-cancel',
            'app-page-load',
            'app-page-save',
            'app-page-cancel',
            'app-pages-hierarchy-load',
            'app-pages-hierarchy-save',
            'app-image-upload',
            'app-image-upload-remove',
            'app-post-delete',
            'app-post-duplicate',
            'app-post-status-change',
            'app-page-delete',
            'app-page-duplicate',
            'app-page-status-change',
            'app-site-regenerate-thumbnails',
            'app-site-abort-regenerate-thumbnails',
            'app-preview-render',
            'app-deploy-test',
            'app-site-regenerate-thumbnails-required',
            'app-site-switch',
            'app-site-create',
            'app-site-clone',
            'app-site-delete',
            'app-license-accept',
            'app-deploy-render-abort',
            'app-deploy-abort',
            'app-deploy-continue',
            'app-deploy-render',
            'app-deploy-upload',
            'app-sync-is-done',
            'app-tag-save',
            'app-tag-cancel',
            'app-tags-load',
            'app-tags-status-change',
            'app-tag-delete',
            'app-site-theme-config-save',
            'app-theme-delete',
            'app-notifications-retrieve',
            'app-wxr-check',
            'app-wxr-import',
            'app-language-upload',
            'app-language-delete',
            'app-plugin-upload',
            'app-plugin-delete',
            'app-site-get-plugins-state',
            'app-site-plugin-activate',
            'app-site-plugin-deactivate',
            'app-site-get-plugin-config',
            'app-site-save-plugin-config',
            'app-close',
            'app-set-ui-zoom-level'
        ];

        if (validChannels.includes(channel)) {
            ipcRenderer.send(channel, ...data);
        } else {
            console.info('Event: ', channel, ' is not supported in send');
        }
    },
    receive: (channel, func) => {
        const validChannels = [
            'app-data-loaded',
            'app-deploy-render-error',
            'app-theme-mode:changed',
            'app-files-selected',
            'app-site-regenerate-thumbnails-progress',
            'app-rendering-progress',
            'app-deploy-rendered',
            'app-connection-in-progress',
            'app-connection-error',
            'app-connection-success',
            'app-uploading-progress',
            'app-wxr-import-progress',
            'app-show-search-form',
            'block-editor-undo',
            'block-editor-redo',
            'no-remote-files'
        ];

        if (validChannels.includes(channel)) {
            // Strip event as it includes `sender` 
            ipcRenderer.on(channel, (event, ...args) => func(...args));
        } else {
            console.info('Event: ', channel, ' is not supported in receive');
        }
    },
    receiveOnce: (channel, func) => {
        const validChannels = [
            'app-license-loaded',
            'app-config-saved',
            'app-file-selected',
            'app-theme-uploaded',
            'app-author-saved',
            'app-authors-loaded',
            'app-author-deleted',
            'app-backups-list-loaded',
            'app-backup-removed',
            'app-backup-renamed',
            'app-backup-created',
            'app-backup-restored',
            'app-site-reloaded',
            'app-site-css-loaded',
            'app-site-css-saved',
            'app-site-config-saved',
            'app-site-backup-checked',
            'app-site-restored-from-backup',
            'app-site-website-catalog-availability-checked',
            'app-site-restored-from-backup',
            'app-file-manager-listed',
            'app-file-manager-deleted',
            'app-file-manager-created',
            'app-file-manager-uploaded',
            'app-log-files-loaded',
            'app-log-file-loaded',
            'app-post-loaded',
            'app-post-saved',
            'app-post-deleted',
            'app-post-duplicated',
            'app-post-status-changed',
            'app-page-loaded',
            'app-page-saved',
            'app-page-deleted',
            'app-page-duplicated',
            'app-page-status-changed',
            'app-pages-hierarchy-loaded',
            'app-site-regenerate-thumbnails-error',
            'app-site-regenerate-thumbnails-success',
            'app-preview-rendered',
            'app-preview-render-error',
            'app-deploy-test-success',
            'app-deploy-test-write-error',
            'app-deploy-test-error',
            'app-site-regenerate-thumbnails-required-status',
            'app-site-switched',
            'app-site-creation-error',
            'app-site-creation-duplicate',
            'app-site-creation-db-error',
            'app-site-created',
            'app-site-cloned',
            'app-site-deleted',
            'app-license-accepted',
            'app-deploy-aborted',
            'app-deploy-uploaded',
            'app-sync-is-done-saved',
            'app-tag-saved',
            'app-tags-loaded',
            'app-tags-status-changed',
            'app-tag-deleted',
            'app-site-theme-config-saved',
            'app-theme-deleted',
            'app-notifications-retrieved',
            'app-wxr-imported',
            'app-wxr-checked',
            'app-directory-selected',
            'app-image-uploaded',
            'app-files-selected',
            'app-language-uploaded',
            'app-language-deleted',
            'app-plugin-uploaded',
            'app-plugin-deleted',
            'app-site-plugin-config-saved',
            'app-site-plugins-state-loaded',
            'app-site-plugin-activated',
            'app-site-plugin-deactivated',
            'app-site-get-plugin-config-retrieved'
        ];

        if (validChannels.includes(channel)) {
            // Strip event as it includes `sender` 
            ipcRenderer.once(channel, (event, ...args) => func(...args));
        } else {
            console.info('Event: ', channel, ' is not supported in receiveOnce');
        }
    },
    invoke: (command, ...data) => {
        const validCommands = [
            'app-theme-mode:set-light',
            'app-theme-mode:set-dark',
            'app-theme-mode:get-theme',
            'app-theme-mode:set-system',
            'app-credits-list:get-app-path',
            'app-main-process-is-osx11-or-higher',
            'app-main-process-select-file',
            'app-main-process-create-slug',
            'app-main-process-select-files',
            'publii-get-spellchecker-language',
            'app-main-get-spellchecker-languages',
            'app-main-set-spellchecker-language-for-webview',
            'app-main-process-load-password',
            'app-window:minimize',
            'app-window:maximize',
            'app-window:unmaximize',
            'app-window:close',
            'app-main-process-select-directory',
            'app-main-webview-search-find-in-page',
            'app-main-webview-search-stop-find-in-page', 
            'app-main-load-language',
            'app-plugins-api:save-config-file',
            'app-plugins-api:save-language-file',
            'app-plugins-api:read-config-file',
            'app-plugins-api:read-language-file',
            'app-plugins-api:read-theme-file',
            'app-plugins-api:delete-config-file',
            'app-plugins-api:delete-language-file'
        ];

        if (validCommands.includes(command)) {
            return ipcRenderer.invoke(command, ...data);
        } else {
            console.info('Event: ', channel, ' is not supported in invoke');
        }

        return false;
    },
    stopReceive: (channel, func) => {
        const validChannels = [
            'app-preview-render-error',
            'app-connection-error',
            'app-wxr-imported',
            'app-wxr-import-progress'
        ];

        if (validChannels.includes(channel)) {
            ipcRenderer.removeListener(channel, func);
        } else {
            console.info('Event: ', channel, ' is not supported in stopReceive');
        }
    },
    stopReceiveAll: (channel) => {
        const validChannels = [
            'app-license-accepted',
            'app-files-selected',
            'app-site-regenerate-thumbnails-error',
            'app-site-regenerate-thumbnails-progress',
            'app-site-regenerate-thumbnails-success',
            'app-preview-render-error',
            'app-rendering-progress',
            'app-site-created',
            'app-site-creation-duplicate',
            'app-site-creation-db-error',
            'app-site-creation-error',
            'app-connection-error',
            'app-show-search-form',
            'block-editor-undo',
            'block-editor-redo'
        ];

        if (validChannels.includes(channel)) {
            ipcRenderer.removeAllListeners(channel);
        } else {
            console.info('Event: ', channel, ' is not supported in stopReceiveAll');
        }
    }
});
