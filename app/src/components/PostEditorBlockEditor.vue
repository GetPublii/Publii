<template>
    <div class="post-editor post-block-editor" ref="post-editor">
        <topbar-appbar />
        <post-editor-top-bar 
            :itemType="itemType" />

        <div class="post-editor-wrapper">
            <div :class="{
                'post-editor-form': true,
                'sidebar-open': sidebarVisible
            }">
                <div>
                    <publii-block-editor 
                        :itemType="itemType" />
                </div>
            </div>

            <p-button
                id="post-help-button"
                type="clean-invert icon small"
                icon="help"
                :title="$t('ui.help')"
                @click.native="toggleHelp">
                <template v-if="!helpPanelOpen">{{ $t('editor.viewHelp') }}</template>
                <template v-else>{{ $t('editor.hideHelp') }}</template>
            </p-button>

            <sidebar 
                :isVisible="sidebarVisible"
                :itemType="itemType" />
            <author-popup 
                :itemType="itemType" />
            <date-popup 
                :itemType="itemType" />
            <help-panel-block-editor 
                :isOpen="helpPanelOpen" />
        </div>
    </div>
</template>

<script>
import PostEditorSidebar from './post-editor/Sidebar';
import AuthorPopup from './post-editor/AuthorPopup';
import DatePopup from './post-editor/DatePopup';
import HelpPanelBlockEditor from './post-editor/HelpPanelBlockEditor';
import TopBarAppBar from './TopBarAppBar';
import PostEditorTopBar from './post-editor/TopBar';
import ItemHelper from './post-editor/ItemHelper';
import Utils from './../helpers/utils';
import PostEditorsCommon from './mixins/PostEditorsCommon';
import PubliiBlockEditor from './block-editor/PubliiBlockEditor';

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
        'help-panel-block-editor': HelpPanelBlockEditor,
        'publii-block-editor': PubliiBlockEditor
    },
    data () {
        return {
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
                viewOptions: {}
            },
            saveAction: {
                status: '',
                preview: false,
                closeEditor: false
            }
        };
    },
    computed: {
        itemType () {
            return this.$route.path.indexOf('/pages/editor/blockeditor/') > -1 ? 'page' : 'post';
        },
        isEdit () {
            return !!this.postID;
        }
    },
    mounted () {
        if (this.itemType === 'page') {
            delete this.postData.tags;
            delete this.postData.mainTag;
            delete this.postData.isExcludedOnHomepage;
            delete this.postData.isHidden;
            delete this.postData.isFeatured;
        }

        window.onbeforeunload = e => {
            if (this.possibleDataLoss) {
                e.returnValue = false;

                this.$bus.$emit('confirm-display', {
                    message: this.$t('core.sureYouWantQuit'),
                    isDanger: true,
                    okClick: () => {
                        window.onbeforeunload = null;
                        mainProcessAPI.send('app-close', true);
                    }
                });
            }
        };

        this.$bus.$on('date-changed', this.setCreationDate);
        this.$bus.$on('post-editor-possible-data-loss', this.setPossibleDataLoss);
        this.$bus.$on('block-editor-title-updated', this.updateTitle);
        this.$bus.$on('block-editor-content-updated', this.setPossibleDataLoss);
        this.$bus.$on('block-editor-post-saved', this.editorPostSaved);

        if (this.isEdit) {
            this.newPost = false;
            this.loadPostData();
        } else {
            this.setDataLossWatcher();
        }

        setTimeout(async () => {
            this.$bus.$emit('block-editor-set-post-id', this.postID);
            
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

                    this.$bus.$emit('block-editor-set-current-site-data', {
                        tags: this.$store.state.currentSite.tags,
                        pages: this.$store.state.currentSite.pages,
                        posts: this.$store.state.currentSite.posts,
                        authors: this.$store.state.currentSite.authors,
                        files: this.filesList
                    });
                });
            });
        }, 0);
    },
    methods: {
        setCreationDate (timestamp) {
            let format = 'MMM DD, YYYY  HH:mm';

            if (this.$store.state.app.config.timeFormat == 12) {
                format = 'MMM DD, YYYY  hh:mm a';
            }

            this.postData.creationDate.timestamp = timestamp;
            this.postData.creationDate.text = this.$moment(this.postData.creationDate.timestamp).format(format);
        },
        setPossibleDataLoss () {
            this.possibleDataLoss = true;
        },
        async editorPostSaved () {
            let postData = await ItemHelper.prepareItemData(this.saveAction.status, this.postID, this.$store, this.postData, this.itemType);

            if (!this.saveAction.preview) {
                this.savingPost(this.saveAction.status, postData, this.saveAction.closeEditor);
            } else {
                this.$bus.$emit('rendering-popup-display', {
                    itemID: this.postID,
                    postData: postData,
                    postOnly: true,
                    itemType: this.itemType
                });
            }
        },
        updateTitle (newTitle) {
            this.postData.title = newTitle;
            this.$bus.$emit('update-post-slug', false);
        },
        loadPostData () {
            // Send request for a post to the back-end
            let requestType = 'app-post-load';
            let responseType = 'app-post-loaded';

            if (this.itemType === 'page') {
                requestType = 'app-page-load';
                responseType = 'app-page-loaded';
            }

            mainProcessAPI.send(requestType, {
                'site': this.$store.state.currentSite.config.name,
                'id': this.postID
            });

            // Load post data
            mainProcessAPI.receiveOnce(responseType, (data) => {
                if (data !== false && this.postID !== 0) {
                    let loadedPostData = ItemHelper.loadItemData(data, this.$store, this.$moment, this.itemType);
                    this.postData = Utils.deepMerge(this.postData, loadedPostData);
                    this.$bus.$emit('block-editor-set-post-text', this.postData.text);
                    this.$bus.$emit('block-editor-set-post-title', this.postData.title);
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
                    message: this.itemType === 'page' ? this.$t('editor.cantSavePageWithEmptyTitle') : this.$t('editor.cantSavePostWithEmptyTitle')
                });

                return;
            }

            this.saveAction.status = newPostStatus;
            this.saveAction.preview = preview;
            this.saveAction.closeEditor = closeEditor;
            this.$bus.$emit('block-editor-post-save');
        },
        savingPost (newStatus, postData, closeEditor = false) {
            // Send form data to the back-end
            let requestType = 'app-post-save';
            let responseType = 'app-post-saved';

            if (this.itemType === 'page') {
                requestType = 'app-page-save';
                responseType = 'app-page-saved';
            }

            mainProcessAPI.send(requestType, postData);

            // Post save
            mainProcessAPI.receiveOnce(responseType, (data) => {
                if (this.postID === 0) {
                    this.postID = data.postID;
                }

                if (data.posts || data.pages) {
                    this.savedPost(newStatus, data, closeEditor);
                } else {
                    alert(this.$t('editor.errorOccurred'));
                }
            });
        },
        savedPost (newStatus, updatedData, closeEditor = false) {
            if (this.itemType === 'post') {
                this.$store.commit('refreshAfterPostUpdate', updatedData);
            } else {
                this.postID = updatedData.pageID;
                this.$bus.$emit('page-data-updated', updatedData.pageID);
                this.$store.commit('refreshAfterPageUpdate', updatedData);
            }

            if (closeEditor) {
                this.closeEditor();
                return;
            } else {
                this.$bus.$emit('block-editor-set-post-id', this.postID);
            }

            this.$router.push('/site/' + this.$route.params.name + '/' + this.itemType + 's/editor/blockeditor/' + this.postID);
            let message = this.$t('editor.changesSaved');

            if (this.newPost) {
                this.newPost = false;

                if (newStatus === 'draft') {
                    message = this.$t('editor.newDraftCreated');
                } else {
                    if (this.itemType === 'page') {
                        message = this.$t('editor.newPageCreated');
                    } else {
                        message = this.$t('editor.newPostCreated');
                    }
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
        }
    },
    beforeDestroy () {
        if (this.unwatchDataLoss) {
            this.unwatchDataLoss();
        }

        this.$bus.$off('date-changed', this.setCreationDate);
        this.$bus.$off('post-editor-possible-data-loss', this.setPossibleDataLoss);
        this.$bus.$off('block-editor-title-updated', this.updateTitle);
        this.$bus.$off('block-editor-content-updated', this.setPossibleDataLoss);
        this.$bus.$off('block-editor-post-saved', this.editorPostSaved);
        window.onbeforeunload = null;
    }
};
</script>

<style lang="scss" scoped>
@import '../scss/variables.scss';
@import '../scss/mixins.scss';
@import '../scss/editor/post-editors-common.scss';
   
#publii-block-editor {
    font-family: -apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", Roboto, Ubuntu;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
}

#post-editor-fake-image-uploader,
#post-editor-fake-multiple-images-uploader {
    display: none;
}

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
        }
    }

    #post-editor {
        display: none;
    }
}

#post-help-button {
    align-items: center;
    bottom: .4rem;
    display: flex;
    height: 4.4rem;
    line-height: 4.3rem;
    position: absolute;
    right: 1.8rem;
    z-index: 99991;
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
