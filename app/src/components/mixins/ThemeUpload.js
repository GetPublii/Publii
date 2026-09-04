/**
 * Shared theme upload flow: picks a theme ZIP file, adds it to the theme
 * library and refreshes the themes in the store.
 *
 * A component can override `themeUploadedHint(data)` to append a sentence to
 * the success toast, e.g. what to do with the new library version next;
 * `data.directory` names the uploaded theme.
 */
export default {
    methods: {
        themeUploadedHint () {
            return '';
        },
        async installThemeFromFile () {
            await mainProcessAPI.invoke('app-main-process-select-file', 'file-select');

            mainProcessAPI.receiveOnce('app-file-selected', (data) => {
                if (data.path === undefined || !data.path.filePaths.length) {
                    return;
                }

                mainProcessAPI.send('app-theme-upload', {
                    sourcePath: data.path.filePaths[0]
                });

                mainProcessAPI.receiveOnce('app-theme-uploaded', this.uploadedTheme);
            });
        },
        uploadedTheme (data) {
            this.$store.commit('replaceAppThemes', data.themes);
            this.$store.commit('updateSiteThemes');

            let messageConfig = {
                message: '',
                type: 'success',
                lifeTime: 3
            };

            if (data.status === 'added') {
                messageConfig.message = this.$t('theme.addThemeSuccessMessage');
            } else if (data.status === 'updated') {
                messageConfig.message = this.$t('theme.updateThemeSuccessMessage');
            } else if (data.status === 'wrong-format') {
                messageConfig.message = this.$t('theme.uploadThemeErrorMessage');
                messageConfig.type = 'warning';
            }

            if (messageConfig.type === 'success') {
                let hint = this.themeUploadedHint(data);

                if (hint) {
                    messageConfig.message += ' ' + hint;
                    messageConfig.lifeTime = 6;
                }
            }

            this.$bus.$emit('app-update-notifications-counters');
            this.$bus.$emit('message-display', messageConfig);
        }
    }
};
