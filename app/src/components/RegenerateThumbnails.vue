<template>
    <section class="content regenerate-thumbnails">
        <p-header title="Regenerate Thumbnails">
            <p-button
                :onClick="goBack"
                slot="buttons"
                type="outline">
                Back to tools
            </p-button>
        </p-header>

        <fields-group v-if="currentSiteHasTheme">
            <p>
                If you've changed your theme or are having issues with your responsive images, you can regenerate them using the button below. This might take a while if your site has a lot of images, so please be patient.
            </p>

            <div class="result-wrapper">
                <p-button
                    v-if="regeneratingInProgress"
                    :onClick="abortRegenerate"
                    type="danger">
                    Cancel
                </p-button>

                <p-button
                    :onClick="regenerate"
                    :type="buttonStatus">
                    Regenerate thumbnails
                </p-button>

                <span
                    v-if="resultLabel"
                    :class="resultCssClass">
                    {{ resultLabel }}
                </span>
            </div>
        </fields-group>

        <div
            v-if="regeneratingStarted"
            class="regenerate-thumbnails-list">
            <p>List of the regenerated files:</p>

            <ul
                class="list">
                <li
                    v-for="(file) in files"
                    :key="file"
                    class="item"
                    :title="file">
                    {{ removeSiteDir(file) }}
                </li>
            </ul>
        </div>

        <p v-if="!currentSiteHasTheme">
            Currently you have no selected theme for this website. Thumbnails regeneration is not necessary.
        </p>
    </section>
</template>

<script>
import { ipcRenderer } from 'electron';
import BackToTools from './mixins/BackToTools.js';

export default {
    name: 'regenerate-thumbnails',
    mixins: [
        BackToTools
    ],
    data: function() {
        return {
            regeneratingInProgress: false,
            regeneratingStarted: false,
            resultLabel: '',
            resultCssClass: {
                'error': false,
                'success': false
            },
            buttonStatus: '',
            files: []
        };
    },
    computed: {
        currentSiteHasTheme: function() {
            return !!this.$store.state.currentSite.config.theme;
        }
    },
    methods: {
        removeSiteDir (filePath) {
            return filePath.replace(this.$store.state.currentSite.siteDir, '');
        },
        regenerate () {
            if(this.regeneratingInProgress) {
                return;
            }

            this.buttonStatus = 'disabled preloader';
            this.regeneratingInProgress = true;
            this.regeneratingStarted = true;
            this.files = [];
            this.resultLabel = 'Regenerating thumbnails...';
            this.resultCssClass = {
                'result': true,
                'error': false,
                'success': false
            };

            ipcRenderer.removeAllListeners('app-site-regenerate-thumbnails-error');
            ipcRenderer.removeAllListeners('app-site-regenerate-thumbnails-progress');
            ipcRenderer.removeAllListeners('app-site-regenerate-thumbnails-success');

            setTimeout(() => {
                ipcRenderer.send('app-site-regenerate-thumbnails', {
                    name: this.$store.state.currentSite.config.name
                });

                ipcRenderer.once('app-site-regenerate-thumbnails-error', (event, data) => {
                    this.resultCssClass = {
                        'result': true,
                        'error': true,
                        'success': false
                    };
                    this.resultLabel = data.message;
                    this.buttonStatus = '';
                });

                ipcRenderer.on('app-site-regenerate-thumbnails-progress', (event, data) => {
                    this.resultLabel = 'Progress: ' + data.value + '%';

                    for(let file of data.files) {
                        if (file) {
                            this.files.unshift(file);
                        }
                    }
                });

                ipcRenderer.once('app-site-regenerate-thumbnails-success', (event, data) => {
                    this.resultCssClass = {
                        'result': true,
                        'error': false,
                        'success': true
                    };
                    this.resultLabel = 'All thumbnails have been created.';
                    this.buttonStatus = '';
                    this.regeneratingInProgress = false;
                });
            }, 350);
        },
        abortRegenerate () {
            ipcRenderer.removeAllListeners('app-site-regenerate-thumbnails-progress');
            ipcRenderer.removeAllListeners('app-site-regenerate-thumbnails-error');
            ipcRenderer.removeAllListeners('app-site-regenerate-thumbnails-success');
            ipcRenderer.send('app-site-abort-regenerate-thumbnails', true);

            this.resultCssClass = {
                'result': true,
                'error': false,
                'success': false
            };
            this.resultLabel = 'Thumbnails regeneration cancelled.';
            this.buttonStatus = '';
            this.regeneratingInProgress = false;
        }
    },
    beforeDestroy: function() {
        ipcRenderer.removeAllListeners('app-site-regenerate-thumbnails-error');
        ipcRenderer.removeAllListeners('app-site-regenerate-thumbnails-progress');
        ipcRenderer.removeAllListeners('app-site-regenerate-thumbnails-success');
    }
}
</script>

<style lang="scss" scoped>
@import '../scss/variables.scss';

.regenerate-thumbnails {
    .list {
        list-style-type: none;
        margin: 0;
        padding: 2rem 0;

        .item {
            border-top: 1px solid $color-9;
            padding: .5rem 0;

            &:first-child {
                border-top: none;
            }
        }
    }

    .result {
        padding-left: 2rem;

        &-wrapper {
            align-items: center;
            display: flex;
        }

        &.error {
            color: $color-3;
        }

        &.success {
            color: $color-2;
        }
    }
}
</style>
