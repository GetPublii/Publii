<template>
    <div
        @drop.stop.prevent="uploadTheme"
        @dragleave.stop.prevent="hideOverlay"
        @dragover.stop.prevent="showOverlay"
        @drag.stop.prevent
        @dragstart.stop.prevent
        @dragend.stop.prevent
        @dragenter.stop.prevent
        class="themes">
        <theme-item
            v-for="(theme, index) in themes"
            :themeData="theme"
            :key="index" />

        <overlay
            v-if="themeIsOver"
            :hasBorder="true">
            Drop your theme here
        </overlay>
    </div>
</template>

<script>
import { ipcRenderer } from 'electron';
import ThemesListItem from './ThemesListItem';

export default {
    name: 'themes-list',
    data: function() {
        return {
            themeIsOver: false
        };
    },
    components: {
        'theme-item': ThemesListItem
    },
    computed: {
        themes: function() {
            return this.$store.getters.themes;
        }
    },
    methods: {
        showOverlay: function(e) {
            this.themeIsOver = true;
        },
        hideOverlay: function(e) {
            this.themeIsOver = false;
        },
        uploadTheme: function(e) {
            this.themeIsOver = false;

            ipcRenderer.send('app-theme-upload', {
                sourcePath: e.dataTransfer.files[0].path
            });

            ipcRenderer.once('app-theme-uploaded', this.uploadedTheme);
        },
        uploadedTheme: function(event, data) {
            this.$store.commit('replaceAppThemes', data.themes);
            this.$store.commit('updateSiteThemes');

            let messageConfig = {
                message: '',
                type: 'success',
                lifeTime: 3
            };

            if(data.status === 'added') {
                messageConfig.message = 'Theme has been successfully added.';
            } else if(data.status === 'updated') {
                messageConfig.message = 'Theme has been successfully updated.';
            } else if(data.status === 'wrong-format') {
                messageConfig.message = 'The uploaded files are incorrect. Please upload theme directory or theme ZIP file.';
                messageConfig.type = 'warning';
            }

            this.$bus.$emit('message-display', messageConfig);
        }
    }
}
</script>

<style lang="scss" scoped>
@import '../scss/variables.scss';

.themes {
    overflow: hidden;
    position: relative;
}
</style>
