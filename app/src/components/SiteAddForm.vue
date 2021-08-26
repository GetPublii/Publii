<template>
    <div class="site-create-wrapper">
        <div class="site-create">
            <tabs
                ref="site-create-tabs"
                id="site-create-options-tabs"
                :items="tabsItems"
                isHorizontal>
                <div slot="tab-0">
                    <div class="site-create-form">
                        <logo-creator ref="logo-creator" />

                        <div class="site-create-field">
                            <label for="site-name">
                                {{ $t('site.websiteName') }}:
                                <span
                                    v-if="siteNameError"
                                    class="site-create-field-error">
                                    {{ $t('site.websiteNameRequired') }}
                                </span>
                            </label>

                            <text-input
                                ref="site-name"
                                id="site-name"
                                :spellcheck="false"
                                changeEventName="add-website-name-changed"
                                :customCssClasses="siteNameCssClasses" />
                        </div>

                        <div class="site-create-field">
                            <label for="author-name">
                                {{ $t('author.authorName') }}:
                                <span
                                    v-if="authorNameError"
                                    class="site-create-field-error">
                                    {{ $t('site.websiteAuthorRequired') }}
                                </span>
                            </label>

                            <text-input
                                ref="author-name"
                                id="author-name"
                                :spellcheck="false"
                                changeEventName="add-website-author-changed"
                                :customCssClasses="authorNameCssClasses" />
                        </div>
                    </div>
                </div>
                <div slot="tab-1">
                    <image-upload
                        slot="field"
                        v-model="backupFile" />
                </div>
            </tabs>

            <div :data-mode="status" class="site-create-buttons">
                <p-button
                    type="primary bottom"
                    :onClick="addWebsite">
                    {{ $t('site.createWebsite') }}
                </p-button>

                <p-button
                    v-if="this.$store.getters.siteNames.length"
                    type="outline bottom"
                    :onClick="goBack">
                    {{ $t('ui.cancel') }}
                </p-button>
            </div>
        </div>

        <overlay v-if="overlayIsVisible">
            <div>
                <div class="loader"><span></span></div>
                {{ $t('site.creationInProgress') }}
            </div>
        </overlay>
    </div>
</template>

<script>
import defaultSiteConfig from './../../config/AST.currentSite.config';
import Utils from './../helpers/utils.js';
import GoToLastOpenedWebsite from './mixins/GoToLastOpenedWebsite';

export default {
    name: 'site-add-form',
    mixins: [
        GoToLastOpenedWebsite
    ],
    data () {
        return {
            siteName: '',
            authorName: '',
            siteNameError: false,
            authorNameError: false,
            overlayIsVisible: false,
            backupFile: null,
        }
    },
    computed: {
        status () {
            if(this.$store.getters.siteNames.length) {
                return 'new-website';
            }

            return 'first-website';
        },
        header () {
            if(this.status === 'new-website') {
                return this.$t('site.createNewWebsite');
            }

            return this.$t('site.createYourFirstWebsite');
        },
        siteNameCssClasses () {
            if(this.siteNameError) {
                return 'has-error';
            }
        },
        authorNameCssClasses () {
            if(this.authorNameError) {
                return 'has-error';
            }
        },
        defaultSiteConfig () {
            return JSON.parse(JSON.stringify(defaultSiteConfig));
        },
        tabsItems () {
            return [
                this.header,
                this.$t('site.installFromBackup'),
            ];
        }
    },
    mounted () {
        this.$bus.$on('add-website-name-changed', (newValue) => {
            this.siteName = newValue;
            this.siteNameError = false;
        });

        this.$bus.$on('add-website-author-changed', (newValue) => {
            this.authorName = newValue;
            this.authorNameError = false;
        });

        this.$bus.$emit('add-website-form-displayed');
        document.body.addEventListener('keydown', this.onDocumentKeyDown);
    },
    methods: {
        checkWebsiteName () {
            if(this.siteName.trim() === '') {
                this.siteNameError = true;
            } else {
                this.siteNameError = false;
            }
        },
        checkAuthorName () {
            if(this.authorName.trim() === '' || this.authorName.trim() === '') {
                this.authorNameError = true;
            } else {
                this.authorNameError = false;
            }
        },
        formIsInvalid () {
            this.checkWebsiteName();
            this.checkAuthorName();

            if (this.siteNameError || this.authorNameError) {
                return true;
            }

            return false;
        },
        addWebsite (e) {
            let self = this;

            if (this.formIsInvalid()) {
                return;
            }

            this.overlayIsVisible = true;

            setTimeout(() => {
                mainProcessAPI.send('app-site-create', this.setBaseConfig(), this.authorName.trim());

                mainProcessAPI.receiveOnce('app-site-creation-error', (data) => {
                    this.overlayIsVisible = false;
                    if (data.name) {
                        this.siteNameError = true;
                    }

                    if (data.author) {
                        this.authorNameError = true;
                    }

                    mainProcessAPI.stopReceiveAll('app-site-created');
                    mainProcessAPI.stopReceiveAll('app-site-creation-duplicate');
                    mainProcessAPI.stopReceiveAll('app-site-creation-db-error');
                });

                mainProcessAPI.receiveOnce('app-site-creation-duplicate', (data) => {
                    this.overlayIsVisible = false;
                    this.siteNameError = true;

                    this.$bus.$emit('alert-display', {
                        message: this.$t('site.siteWithThisNameExists'),
                        textCentered: true
                    });

                    mainProcessAPI.stopReceiveAll('app-site-created');
                    mainProcessAPI.stopReceiveAll('app-site-creation-error');
                });

                mainProcessAPI.receiveOnce('app-site-creation-db-error', (data) => {
                    this.overlayIsVisible = false;
                    this.siteNameError = true;

                    this.$bus.$emit('alert-display', {
                        message: this.$t('site.erroOcurredDuringSiteDatabaseCreationInfo'),
                        textCentered: true
                    });

                    mainProcessAPI.stopReceiveAll('app-site-created');
                    mainProcessAPI.stopReceiveAll('app-site-creation-error');
                });

                mainProcessAPI.receiveOnce('app-site-created', (data) => {
                    this.overlayIsVisible = false;
                    data.authors = self.setAuthor(data.authorName);
                    this.$store.commit('addNewSite', data);
                    window.localStorage.setItem('publii-last-opened-website', data.siteConfig.name);
                    this.$router.push(`/site/${data.siteConfig.name}`);

                    mainProcessAPI.stopReceiveAll('app-site-creation-error');
                    mainProcessAPI.stopReceiveAll('app-site-creation-duplicate');
                    mainProcessAPI.stopReceiveAll('app-site-creation-db-error');
                });
            }, 250);
        },
        setBaseConfig () {
            let baseConfig = {
                name: this.siteName.trim(),
                displayName: this.siteName.trim(),
                synced: false,
                logo: {
                    color: this.$refs['logo-creator'].getActiveColor(),
                    icon: this.$refs['logo-creator'].getActiveIcon()
                }
            };

            return Utils.deepMerge(this.defaultSiteConfig, baseConfig);
        },
        setAuthor (authorName) {
            return [{
                id: 1,
                name: this.authorName.trim(),
                username: authorName,
                config: "{}",
                additionalData: "{}",
                postCounter: 0
            }];
        },
        onDocumentKeyDown (e) {
            if (e.code === 'Enter' && !event.isComposing) {
                this.addWebsite();
            }
        },
        onEnterKey () {
            this.onOk();
        }
    },
    beforeDestroy () {
        this.$bus.$off('add-website-name-changed');
        this.$bus.$off('add-website-author-changed');
        document.body.removeEventListener('keydown', this.onDocumentKeyDown);
    }
}
</script>

<style lang="scss" scoped>
@import '../scss/variables.scss';

/*
 * Site create form
 */
.site-create {
    background: var(--popup-bg);
    border-radius: 5px;
    box-shadow: 0 0 60px rgba($color-4, 0.07);
    font-size: 1.6rem;
    margin: 0;
    left: 50%;
    padding: 4.8rem 4.8rem 5.6rem 4.8rem;
    position: absolute;
    text-align: center;
    top: 50%;
    transform: translateX(-50%) translateY(-50%);
    user-select: none;
    width: 770px;

    &-form {
        overflow: hidden;

        /deep/ .logo-creator-preview {
            min-width: 10rem !important;
        }
    }

    .title {
        color: var(--text-primary-color);
        font-size: 1.8rem;
        font-weight: 600;
        margin: 0 0 4rem 0!important;
        text-transform: none;
    }

    &-field {
        margin: 0 0 3rem 0;
        text-align: left;

        & > label {
            display: block;
            font-size: 1.6rem;
            font-weight: 400;
            line-height: 1.4;
            margin-bottom: 1rem;
        }

        &-error {
            color: var(--warning);
        }

        &:last-child {
            margin-bottom: 0;
        }
    }

    &-buttons {
        display: flex;
        margin: 0 -4.8rem -5.6rem -4.8rem;
        overflow: hidden;
        padding: 5.6rem 0 0 0;
        position: relative;
        text-align: center;
        top: 1px;

        .button {
            border-radius: 0 0 0 3px;

            & + .button {
                box-shadow: none!important;
                border-top: 1px solid var(--input-border-color);
                border-radius: 0 0 3px 0;
                color: var(--popup-btn-cancel-color);
                margin-left: 0;

                &:hover {
                   background: var(--popup-btn-cancel-hover-bg);
                   color: var(--popup-btn-cancel-hover-color);
                }
            }
        }
    }

    &-wrapper {
        .loader {
            display: block;
            height: 2.8rem;
            margin: -5.6rem auto 2rem;
            width: 2.8rem;

            & > span {
                animation: spin .9s infinite linear;
                border-top: 2px solid var(--border-light-color);
                border-right: 2px solid var(--border-light-color);
                border-bottom: 2px solid var(--border-light-color);
                border-left: 2px solid var(--gray-4);
                border-radius: 50%;
                display: block;
                height: 3.5rem;
                width: 3.5rem;

                &::after {
                    border-radius: 50%;
                    content: "";
                    display: block;
                }

                @at-root {
                    @keyframes spin {
                       100% {
                          transform: rotate(360deg);
                       }
                    }
                }
          }
       }
    }
}
</style>
