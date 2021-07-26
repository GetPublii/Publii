<template>
    <section class="content regenerate-thumbnails">
        <p-header :title="$t('tools.thumbnails.regenerateThumbnails')">
            <p-button
                :onClick="goBack"
                slot="buttons"
                type="outline">
                {{ $t('ui.backToTools') }}
            </p-button>
        </p-header>

        <fields-group v-if="currentSiteHasTheme">
            <p>
                {{ $t('tools.thumbnails.regenerateThumbnailsInfo') }}
            </p>

            <div class="result-wrapper">
                <p-button
                    v-if="regeneratingInProgress"
                    :onClick="abortRegenerate"
                    type="danger">
                    {{ $t('ui.cancel') }}
                </p-button>

                <p-button
                    :onClick="regenerate"
                    :type="buttonStatus">
                    {{ $t('tools.thumbnails.regenerateThumbnails') }}
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
            <p>{{ $t('tools.thumbnails.listRegeneratedFiles') }}</p>

            <ul
                class="list">
                <li
                    v-for="(file, index) in files"
                    :key="file + '-' + index"
                    class="item"
                    :title="getFilePhrase(file)">
                    {{ removeSiteDir(file) }}
                </li>
            </ul>
        </div>

        <p v-if="!currentSiteHasTheme">
            {{ $t('tools.thumbnails.regenerateThumbnailsNotNecessaryInfo') }}
        </p>
    </section>
</template>

<script>
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
        getFilePhrase (filePath) {
            if (filePath.translation) {
                return this.$t(filePath.translation);
            }

            return filePath;
        },
        removeSiteDir (filePath) {
            filePath = this.getFilePhrase(filePath);

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
            this.resultLabel = this.$t('tools.thumbnails.regeneratingThumbnails');
            this.resultCssClass = {
                'result': true,
                'error': false,
                'success': false
            };

            mainProcessAPI.stopReceiveAll('app-site-regenerate-thumbnails-error');
            mainProcessAPI.stopReceiveAll('app-site-regenerate-thumbnails-progress');
            mainProcessAPI.stopReceiveAll('app-site-regenerate-thumbnails-success');

            setTimeout(() => {
                mainProcessAPI.send('app-site-regenerate-thumbnails', {
                    name: this.$store.state.currentSite.config.name
                });

                mainProcessAPI.receiveOnce('app-site-regenerate-thumbnails-error', (data) => {
                    this.resultCssClass = {
                        'result': true,
                        'error': true,
                        'success': false
                    };
                    this.resultLabel = this.$t(data.message);
                    this.buttonStatus = '';
                });

                mainProcessAPI.receive('app-site-regenerate-thumbnails-progress', (data) => {
                    this.resultLabel = this.$t('tools.thumbnails.progress') + data.value + '%';

                    for(let file of data.files) {
                        if (file) {
                            this.files.unshift(file);
                        }
                    }
                });

                mainProcessAPI.receiveOnce('app-site-regenerate-thumbnails-success', (data) => {
                    this.resultCssClass = {
                        'result': true,
                        'error': false,
                        'success': true
                    };
                    this.resultLabel = this.$t('tools.thumbnails.thumbnailsCreated');
                    this.buttonStatus = '';
                    this.regeneratingInProgress = false;
                });
            }, 350);
        },
        abortRegenerate () {
            mainProcessAPI.stopReceiveAll('app-site-regenerate-thumbnails-progress');
            mainProcessAPI.stopReceiveAll('app-site-regenerate-thumbnails-error');
            mainProcessAPI.stopReceiveAll('app-site-regenerate-thumbnails-success');
            mainProcessAPI.send('app-site-abort-regenerate-thumbnails', true);

            this.resultCssClass = {
                'result': true,
                'error': false,
                'success': false
            };
            this.resultLabel = this.$t('tools.thumbnails.thumbnailsRegenerationCancelled');
            this.buttonStatus = '';
            this.regeneratingInProgress = false;
        }
    },
    beforeDestroy: function() {
        mainProcessAPI.stopReceiveAll('app-site-regenerate-thumbnails-error');
        mainProcessAPI.stopReceiveAll('app-site-regenerate-thumbnails-progress');
        mainProcessAPI.stopReceiveAll('app-site-regenerate-thumbnails-success');
    }
}
</script>

<style lang="scss" scoped>
@import '../scss/variables.scss';

.regenerate-thumbnails {
    user-select: none;

    .list {
        list-style-type: none;
        margin: 0;
        padding: 2rem 0;
        user-select: text;

        .item {
            border-top: 1px solid var(--gray-1);
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
            color: var(--warning);
        }

        &.success {
            color: var(--success);
        }
    }
}
</style>
