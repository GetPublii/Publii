<template>
    <div
        @drop.stop.prevent="uploadTheme"
        @dragleave.stop.prevent="hideOverlay"
        @dragenter.stop.prevent="showOverlay"
        @dragover.stop.prevent="showOverlay"
        @drag.stop.prevent="showOverlay"
        @dragstart.stop.prevent
        @dragend.stop.prevent
        :class="{ 'themes': true, 'theme-is-over': themeIsOver }">
        <div
            class="add-more-theme">
                <a href="https://marketplace.getpublii.com/" target="_blank">
                    <icon                   
                        customWidth="50"
                        customHeight="46"
                        properties="not-clickable"
                        name="add" />
                
                    <h3>Get more themes</h3>  
                </a>
        </div>

        <theme-item
            v-for="(theme, index) in themes"
            :themeData="theme"
            :key="index" />

        <overlay
            v-if="themeIsOver"
            :hasBorder="true"
            :isBlue="true">
            <div>Drop your theme here</div>
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
        themes () {
            return this.$store.getters.themes;
        }
    },
    methods: {
        showOverlay (e) {
            this.themeIsOver = true;
        },
        hideOverlay (e) {
            if (e.target.classList.contains('themes')) {
                this.themeIsOver = false;
            }
        },
        uploadTheme (e) {
            this.themeIsOver = false;

            ipcRenderer.send('app-theme-upload', {
                sourcePath: e.dataTransfer.files[0].path
            });

            ipcRenderer.once('app-theme-uploaded', this.uploadedTheme);
        },
        uploadedTheme (event, data) {
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
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    grid-gap: 5rem 3rem; 
    overflow: hidden;
    position: relative;
    user-select: none;

    &.theme-is-over {
        & > * {
            pointer-events: none;
        }
    }
}

.add-more-theme {   
    background: var(--gray-1);   
    border: 1px solid transparent;  
    border-radius: 4px;
    margin: 0;   
    transition: var(--transition);
    
    &:hover {
         background: var(--bg-primary);
         border-color: var(--secondary-color);
         box-shadow: 0 0 26px rgba(black, .07);
        
         svg {
             fill: var(--primary-color);
         }
        
         h3 {
             color: var(--primary-color);
         }
    }
    
    & > a {  
         align-items: center;
         display: flex;
         flex-direction: column;
         height: 100%;
         justify-content: center;        
         width: 100%;
    }
    
    h3 {
         color: var(--text-primary-color);
         font-size: 1.6rem; 
         font-weight: 500; 
         margin-bottom: 0;    
         transition: inherit;
    }
    
    svg {
         fill: var(--gray-5);   
         transition: inherit;
    }
}
</style>
