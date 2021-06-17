<template>
    <div class="post-editor post-block-editor" ref="post-editor">
        <topbar-appbar />
        <post-editor-top-bar />

        <div class="post-editor-wrapper">
            <div class="post-editor-form">
                <div>
                    <webview
                        :src="editorHtmlPath"
                        nodeintegration
                        :webpreferences="$store.state.currentSite.config.spellchecking ? 'spellcheck' : ''"
                        :preload="editorPreloadPath"></webview>
                    <textarea id="post-editor"></textarea>
                </div>
            </div>

            <p-button
                id="post-help-button"
                type="clean icon small"
                icon="help"
                :title="$t('ui.help')"
                @click.native="toggleHelp">
                <template v-if="!helpPanelOpen">{{ $t('editor.viewHelp') }}</template>
                <template v-else>{{ $t('editor.hideHelp') }}</template>
            </p-button>

            <sidebar :isVisible="sidebarVisible" />
            <author-popup />
            <date-popup />
            <help-panel-block-editor :isOpen="helpPanelOpen" />
            <search-popup />
        </div>
    </div>
</template>

<script>
import Vue from 'vue';
import PostEditorSidebar from './post-editor/Sidebar';
import AuthorPopup from './post-editor/AuthorPopup';
import DatePopup from './post-editor/DatePopup';
import HelpPanelBlockEditor from './post-editor/HelpPanelBlockEditor';
import TopBarAppBar from './TopBarAppBar';
import PostEditorTopBar from './post-editor/TopBar';
import PostHelper from './post-editor/PostHelper';
import SearchPopup from './post-editor/SearchPopup';
import Utils from './../helpers/utils';
import path from 'path';
import url from 'url';
import PostEditorsCommon from './mixins/PostEditorsCommon';

export default {
    name: 'post-editor-block-editor',
    editorType: 'blockeditor',
    mixins: [
        PostEditorsCommon
    ],
    components: {
        'author-popup': AuthorPopup,
        'date-popup': DatePopup,
        'sidebar': PostEditorSidebar,
        'topbar-appbar': TopBarAppBar,
        'post-editor-top-bar': PostEditorTopBar,
        'search-popup': SearchPopup,
        'help-panel-block-editor': HelpPanelBlockEditor
    },
    data () {
        return {
            webContentsID: null,
            postID: this.$route.params.post_id || 0,
            newPost: true,
            helpPanelOpen: false,
            postSlugEdited: false,
            possibleDataLoss: false,
            unwatchDataLoss: null,
            sidebarVisible: false,
            filesList: null,
            postData: {
                editor: this.$options.editorType,
                title: '',
                text: '',
                slug: '',
                author: 1,
                tags: [],
                mainTag: '',
                template: '',
                creationDate: {
                    text: '',
                    timestamp: 0
                },
                modificationDate: {
                    text: '',
                    timestamp: 0
                },
                isFeatured: false,
                isHidden: false,
                isExcludedOnHomepage: false,
                status: '',
                metaTitle: '',
                metaDescription: '',
                metaRobots: 'index, follow',
                canonicalUrl: '',
                featuredImage: {
                    path: '',
                    alt: '',
                    caption: '',
                    credits: ''
                },
                postViewOptions: {}
            },
            saveAction: {
                status: '',
                preview: false,
                closeEditor: false
            }
        };
    },
    computed: {
        isEdit () {
            return !!this.postID;
        },
        editorHtmlPath () {
            return url.format({
                pathname: path.join(window.__dirname, '/../node_modules/publii-block-editor/dist/index.html'),
                protocol: 'file',
                slashes: true
            });
        },
        editorPreloadPath () {
            return url.format({
                pathname: path.join(window.__dirname, '/editor-webview-preload.js'),
                protocol: 'file',
                slashes: true
            });
        }
    },
    mounted () {
        if (this.$store.state.app.config.spellchecking) {
            mainProcessAPI.send('publii-set-spellchecker-language', this.$store.state.currentSite.config.language);
        } else {
            mainProcessAPI.send('publii-set-spellchecker-language', '');
        }

        this.$bus.$on('date-changed', (timestamp) => {
            let format = 'MMM DD, YYYY  HH:mm';

            if (this.$store.state.app.config.timeFormat == 12) {
                format = 'MMM DD, YYYY  hh:mm a';
            }

            this.postData.creationDate.timestamp = timestamp;
            this.postData.creationDate.text = this.$moment(this.postData.creationDate.timestamp).format(format);
        });

        this.$bus.$on('post-editor-possible-data-loss', () => {
            this.possibleDataLoss = true;
        });

        this.webview = document.querySelector('webview');
        this.initCommunicationWithEditor();

        this.webview.addEventListener('dom-ready', () => {
            // this.webview.openDevTools();
            if (this.isEdit) {
                this.newPost = false;
                this.loadPostData();
            } else {
                this.setDataLossWatcher();
            }

            setTimeout(async () => {
                this.webContentsID = document.querySelector('webview').getWebContentsId();
                await mainProcessAPI.invoke('app-main-initialize-context-menu-for-webview', this.webContentsID);
                await mainProcessAPI.invoke('app-main-webview-search-init', this.webContentsID);
                mainProcessAPI.receive('app-main-webview-input-response', this.handleMainThreadResponse);
                await this.setWebViewSpellcheckerLanguage(this.webContentsID);
                this.webview.send('set-app-theme', await this.$root.getCurrentAppTheme());
                this.webview.send('set-post-id', this.postID);
                this.webview.send('set-site-name', this.$store.state.currentSite.config.name);

                mainProcessAPI.send('app-file-manager-list', {
                    siteName: this.$store.state.currentSite.config.name,
                    dirPath: 'root-files'
                });

                mainProcessAPI.receiveOnce('app-file-manager-listed', (data) => {
                    this.filesList = data.map(file => file.name);

                    mainProcessAPI.send('app-file-manager-list', {
                        siteName: this.$store.state.currentSite.config.name,
                        dirPath: 'media/files'
                    });

                    mainProcessAPI.receiveOnce('app-file-manager-listed', (data) => {
                        this.filesList = this.filesList.concat(data.map(file => 'media/files/' + file.name));

                        this.webview.send('set-current-site-data', {
                            tags: this.$store.state.currentSite.tags,
                            posts: this.$store.state.currentSite.posts,
                            authors: this.$store.state.currentSite.authors,
                            files: this.filesList
                        });
                    });
                });
            }, 0);
        });
    },
    methods: {
        initCommunicationWithEditor () {
            this.webview.addEventListener('ipc-message', this.editorOnIpcMessage);
        },
        editorOnIpcMessage(event) {
            const {args, channel} = event;

            if (channel === 'editor-title-updated') {
                this.updateTitle(args[0]);
            }

            if (channel === 'editor-content-updated') {
                this.$bus.$emit('post-editor-possible-data-loss');
            }

            if (channel === 'editor-post-saved') {
                document.querySelector('#post-editor').value = args[0];
                let postData = PostHelper.preparePostData(this.saveAction.status, this.postID, this.$store, this.postData);

                if (!this.saveAction.preview) {
                    this.savingPost(this.saveAction.status, postData, this.saveAction.closeEditor);
                } else {
                    this.$bus.$emit('rendering-popup-display', {
                        itemID: this.postID,
                        postData: postData,
                        postOnly: true
                    });
                }
            }
        },
        updateTitle (newTitle) {
            this.postData.title = newTitle;
            this.updateSlug();
        },
        loadPostData () {
            // Send request for a post to the back-end
            mainProcessAPI.send('app-post-load', {
                'site': this.$store.state.currentSite.config.name,
                'id': this.postID
            });

            // Load post data
            mainProcessAPI.receiveOnce('app-post-loaded', (data) => {
                if(data !== false && this.postID !== 0) {
                    let loadedPostData = PostHelper.loadPostData(data, this.$store, this.$moment);
                    this.postData = Utils.deepMerge(this.postData, loadedPostData);
                    this.webview.send('set-post-text', this.postData.text);
                    this.webview.send('set-post-title', this.postData.title);
                }

                setTimeout(() => {
                    this.possibleDataLoss = false;
                    this.setDataLossWatcher();
                }, 100);
            });
        },
        setDataLossWatcher () {
            this.unwatchDataLoss = this.$watch('postData', (newValue, oldValue) => {
                this.possibleDataLoss = true;
                this.unwatchDataLoss();
            }, { deep: true });
        },
        savePost (newPostStatus, preview = false, closeEditor = false) {
            if (this.postData.title.trim() === '') {
                this.$bus.$emit('alert-display', {
                    message: this.$t('editor.cantSavePostWithEmptyTitle')
                });

                return;
            }

            this.saveAction.status = newPostStatus;
            this.saveAction.preview = preview;
            this.saveAction.closeEditor = closeEditor;
            this.webview.send('post-save');
        },
        savingPost (newStatus, postData, closeEditor = false) {
            // Send form data to the back-end
            mainProcessAPI.send('app-post-save', postData);

            // Post save
            mainProcessAPI.receiveOnce('app-post-saved', (data) => {
                if (this.postID === 0) {
                    this.postID = data.postID;
                }

                if (data.posts) {
                    this.savedPost(newStatus, data, closeEditor);
                } else {
                    alert(this.$t('editor.errorOccured'));
                }
            });
        },
        savedPost (newStatus, updatedData, closeEditor = false) {
            this.$store.commit('refreshAfterPostUpdate', updatedData);

            if (closeEditor) {
                this.closeEditor();
                return;
            } else {
                this.webview.send('set-post-id', this.postID);
            }

            this.$router.push('/site/' + this.$route.params.name + '/posts/editor/blockeditor/' + this.postID);
            let message = this.$t('editor.changesSaved');

            if (this.newPost) {
                this.newPost = false;

                if (newStatus === 'draft') {
                    message = this.$t('editor.newDraftCreated');
                } else {
                    message = this.$t('editor.newPostCreated');
                }
            }

            this.$bus.$emit('message-display', {
                message: message,
                type: 'success',
                lifeTime: 3
            });

            this.loadPostData();
            this.possibleDataLoss = false;
        },
        toggleHelp () {
            this.helpPanelOpen = !this.helpPanelOpen;
        },
        async setWebViewSpellcheckerLanguage (webContentsID) {
            if (mainProcessAPI.getEnv().platformName === 'darwin') {
                return;
            }

            let language = await mainProcessAPI.invoke('publii-get-spellchecker-language');
            language = language.toLocaleLowerCase();
            let availableLanguages = await mainProcessAPI.invoke('app-main-get-spellchecker-languages');

            if (availableLanguages.indexOf(language) > -1) {
                await mainProcessAPI.invoke('app-main-set-spellchecker-language-for-webview', webContentsID, [language]);
                return;
            }

            language = language.split('-');
            language = language[0];

            if (availableLanguages.indexOf(language) > -1) {
                await mainProcessAPI.invoke('app-main-set-spellchecker-language-for-webview', webContentsID, [language]);
                return;
            }

            console.log(this.$t('editor.unableToSetSpellCheckerForLanguage') + language);
        },
        handleMainThreadResponse (sender, response) {
            if (response.webContentsID !== this.webContentsID) {
                return;
            }

            if (response.action === 'show-search') {
                this.$bus.$emit('app-show-search-form');
            } else if (response.action === 'undo') {
                this.webview.send('block-editor-undo');
            } else if (response.action === 'redo') {
                this.webview.send('block-editor-redo');
            }
        }
    },
    beforeDestroy () {
        if (this.unwatchDataLoss) {
            this.unwatchDataLoss();
        }

        this.webview.removeEventListener('ipc-message', this.editorOnIpcMessage);
        this.$bus.$off('date-changed');
        this.$bus.$off('post-editor-possible-data-loss');
        mainProcessAPI.stopReceiveAll('app-main-webview-input-response', this.handleMainThreadResponse);
    }
};
</script>

<style lang="scss" scoped>
@import '../scss/variables.scss';
@import '../scss/mixins.scss';
@import '../scss/editor/post-editors-common.scss';

.post-editor {
    overflow-x: hidden;
    position: relative;
    width: 100%;
    z-index: 2;

    &-wrapper {
        overflow: auto;
        padding-top: var(--topbar-height);
    }

    &-form {
        height: calc(100vh - var(--topbar-height));
        overflow: scroll;

        & > div {
            padding: 9rem 4rem 3rem 4rem;

            & > webview {
                bottom: 0;
                left: 0;
                position: absolute;
                right: 0;
                top: 8rem;
            }
        }
    }

    #post-editor {
        display: none;
    }
}

#post-help-button {
    bottom: 20px;
    position: absolute;
    right: 20px;
    z-index: 100;
}

body[data-os="win"] {
    .post-editor-wrapper {
        height: 100vh;
        padding-top: 2.2rem;
    }

    .post-editor-form {
        height: calc(100vh - 2.2rem);
    }
}

body[data-os="linux"] {
    .post-editor-wrapper {
        height: 100vh;
        padding-top: 0;
    }

    .post-editor-form {
        height: 100vh;
    }
}
</style>
