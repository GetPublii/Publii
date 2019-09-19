<template>
    <div :class="{ 'search-popup': true, 'is-visible': isVisible }">
        <input 
            @keyup="doKeyboardNavigation"
            ref="search-phrase-input"
            v-model="searchPhrase" />
        <span>
            <template v-if="resultsCount > 0">
                {{ currentResultIndex }} / 
            </template> 
            {{ resultsCount }}
        </span>        
        <button @click.prevent="getPrevResult()">
            <icon
                size="m"
                name="arrow-up"  />
        </button>
        <button @click.prevent="getNextResult()">
            <icon
                size="m"
                name="arrow-down"  />
        </button>
        <button @click.prevent="finishSearch()">
            <icon
                size="m"
                name="close"  />
        </button>
    </div>
</template>

<script>
import { ipcRenderer } from 'electron';

export default {
    name: 'search-popup',
    data () {
        return {
            webviewContents: null,
            searchPhrase: '',
            isVisible: false,
            currentResultIndex: 0,
            resultsCount: 0
        };
    },
    watch: {
        searchPhrase (newValue) {
            if (this.isVisible && newValue.trim() !== '') {
                this.webviewContents.findInPage(newValue);
            } else {
                this.resultsCount = 0;
                this.currentResultIndex = 0;
                this.webviewContents.stopFindInPage('clearSelection');
            }
        }
    },
    mounted () {
        document.querySelector('webview').addEventListener('dom-ready', () => {
            this.webviewContents = document.querySelector('webview').getWebContents();

            document.querySelector('webview').addEventListener('found-in-page', e => {
                this.currentResultIndex = e.result.activeMatchOrdinal;
                this.resultsCount = e.result.matches;
            });
        });

        ipcRenderer.on('app-show-search-form', () => {
            this.isVisible = true;
            this.$refs['search-phrase-input'].focus();
        });
    },
    methods: {
        getNextResult () {
            if (this.resultsCount === 0) {
                return;
            }

            this.webviewContents.findInPage(this.searchPhrase);
        },
        getPrevResult () {
            if (this.resultsCount === 0) {
                return;
            }

            this.webviewContents.findInPage(this.searchPhrase, {
                forward: false
            });
        },
        finishSearch () {
            this.webviewContents.stopFindInPage('clearSelection');
            this.isVisible = false;
        },
        doKeyboardNavigation (e) {
            if (e.code === 'Enter') {
                this.getNextResult();
            }
        }
    },
    beforeDestroy () {
        ipcRenderer.removeAllListeners('app-show-search-form');
    }
};
</script>

<style lang="scss" scoped>
@import '../../scss/variables.scss';
@import '../../scss/mixins.scss';

.search-popup {
    background: $color-10;
    border-radius: 6px;
    box-shadow: 0 0 5px rgba($color-5, .125);
    left: 50%;
    opacity: 0;
    padding: 15px 22px 15px 30px;
    pointer-events: none;
    position: fixed;
    top: 20px;
    transform: translateX(-50%);
    transition: all .25s ease-out;
    width: auto;
    z-index: 10000000;

    &.is-visible {
        opacity: 1;
        pointer-events: auto;
        top: 40px;
    }

    input {
        border: none;
        border-bottom: 1px solid $color-1;        
        color: $color-7;
        font-size: 18px;
        font-weight: 500;
        width: 300px;
    }
    
    span {
        color: $color-7;
        display: inline-block;
        font-size: 12px;  
        margin-right: 20px;
    }
    
    button {
        border: none;
        cursor: pointer;
        padding: 0;
        vertical-align: middle;
        text-align: center;
        
        & > svg {           
            stroke: $color-7;
        }
        
        &:hover {
            
            & > svg {           
                stroke: $color-1;
            }
        }
    }
}
</style>
