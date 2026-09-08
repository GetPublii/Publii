const extensions = {
    theme: {
        completed: 'uploadedTheme',
        error: 'theme.uploadThemeErrorMessage'
    },
    plugin: {
        completed: 'uploadedPlugin',
        error: 'plugins.uploadPluginErrorMessage'
    },
    language: {
        completed: 'uploadedLanguage',
        error: 'langs.uploadLanguageErrorMessage'
    }
};

export default {
    data () {
        return {
            installingExtension: false,
            installationLoading: false,
            installationPickerOpen: false,
            installationTimer: null,
            installationSequence: 0,
            installationDisposed: false
        };
    },
    methods: {
        async pickExtensionFile (kind) {
            if (this.installingExtension || this.installationPickerOpen) {
                return;
            }

            this.installationPickerOpen = true;

            try {
                const result = await mainProcessAPI.invoke(
                    'app-main-process-select-files',
                    'extension-install',
                    [],
                    { returnResult: true, multiple: false }
                );

                if (!this.installationDisposed && result && !result.canceled && result.filePaths.length) {
                    await this.installExtension(kind, () => result.filePaths[0]);
                }
            } catch (error) {
                if (!this.installationDisposed) {
                    this.showExtensionInstallError(kind);
                }
            } finally {
                this.installationPickerOpen = false;
            }
        },
        installDroppedExtension (kind, file) {
            if (!file || this.installationPickerOpen) {
                return;
            }

            return this.installExtension(kind, async () => {
                const filePath = await mainProcessAPI.getPathForFile(file);
                return mainProcessAPI.normalizePath(filePath);
            });
        },
        async installExtension (kind, resolvePath) {
            if (this.installingExtension || this.installationDisposed) {
                return;
            }

            const sequence = ++this.installationSequence;
            this.installingExtension = true;
            this.installationLoading = false;
            this.installationTimer = setTimeout(() => {
                this.installationLoading = true;
            }, 200);

            try {
                const sourcePath = await resolvePath();

                if (this.installationDisposed || sequence !== this.installationSequence) {
                    return;
                }

                if (!sourcePath) {
                    throw new Error('Missing extension source path');
                }

                mainProcessAPI.receiveOnce('app-' + kind + '-uploaded', data => {
                    if (this.installationDisposed || sequence !== this.installationSequence) {
                        return;
                    }

                    this.finishExtensionInstallation();
                    this[extensions[kind].completed](data);
                });
                mainProcessAPI.send('app-' + kind + '-upload', { sourcePath });
            } catch (error) {
                if (!this.installationDisposed && sequence === this.installationSequence) {
                    this.finishExtensionInstallation();
                    this.showExtensionInstallError(kind);
                }
            }
        },
        finishExtensionInstallation () {
            clearTimeout(this.installationTimer);
            this.installationTimer = null;
            this.installationLoading = false;
            this.installingExtension = false;
            this.installationSequence++;
        },
        showExtensionInstallError (kind) {
            this.$bus.$emit('message-display', {
                message: this.$t(extensions[kind].error),
                type: 'warning',
                lifeTime: 3
            });
        }
    },
    beforeDestroy () {
        this.installationDisposed = true;
        this.finishExtensionInstallation();
    }
};
