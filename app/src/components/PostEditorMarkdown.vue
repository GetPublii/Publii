<template>
    <div
        class="post-editor post-editor-markdown"
        ref="post-editor"
        :data-post-id="postID">
        <topbar-appbar />
        <post-editor-top-bar
            :itemType="itemType" />

        <div class="post-editor-wrapper">
            <div :class="{
                'post-editor-form': true,
                'sidebar-open': sidebarVisible
            }">
                <div>
                    <div
                        id="post-title"
                        ref="post-title"
                        class="post-editor-form-title"
                        contenteditable="true"
                        :data-translation="itemType === 'post' ? $t('post.addPostTitle') : $t('page.addPageTitle')"
                        :spellcheck="$store.state.currentSite.config.spellchecking"
                        @paste.prevent="pasteTitle"
                        @keydown="detectEnterInTitle"
                        @input="updateTitle" />

                    <vue-easymde
                        ref="markdownEditor"
                        v-model="postData.text"
                        name="markdown-editor"
                        :configs="editorConfig" />

                    <input
                        name="image"
                        id="post-editor-fake-image-uploader"
                        class="is-hidden"
                        type="file" />
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
            <link-popup
                ref="linkPopup"
                :markdown="true" />
            <help-panel-markdown 
                :isOpen="helpPanelOpen" />
        </div>
    </div>
</template>

<script>
import Vue from 'vue';
import VueEasyMde from './post-editor/EasyMde';
import PostEditorSidebar from './post-editor/Sidebar';
import AuthorPopup from './post-editor/AuthorPopup';
import DatePopup from './post-editor/DatePopup';
import HelpPanelMarkdown from './post-editor/HelpPanelMarkdown';
import LinkPopup from './post-editor/LinkPopup';
import TopBarAppBar from './TopBarAppBar';
import PostEditorTopBar from './post-editor/TopBar';
import ItemHelper from './post-editor/ItemHelper';
import Utils from './../helpers/utils';
import InlineAttachment from './post-editor/CodeMirror/inline-attachment.js';
import InlineAttachmentC4 from './post-editor/CodeMirror/codemirror-4.inline-attachment.js';
import PostEditorsCommon from './mixins/PostEditorsCommon';

export default {
    name: 'post-editor-markdown',
    editorType: 'markdown',
    mixins: [
        PostEditorsCommon
    ],
    components: {
        'author-popup': AuthorPopup,
        'date-popup': DatePopup,
        'link-popup': LinkPopup,
        'sidebar': PostEditorSidebar,
        'topbar-appbar': TopBarAppBar,
        'post-editor-top-bar': PostEditorTopBar,
        'help-panel-markdown': HelpPanelMarkdown,
        'vue-easymde': VueEasyMde
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
            editorIsInitialized: false,
            sidebarVisible: false,
            editorConfig: {
                status: false,
                toolbar: false,
                placeholder: this.$t('editor.startWriting'),
                spellChecker: false,
                promptURLs: true,
                shortcuts: {
                    toggleHeadingSmaller: this.isMac ? null : 'Ctrl-H'
                }
            },
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
            }
        };
    },
    computed: {
        itemType () {
            return this.$route.path.indexOf('/pages/editor/markdown/') > -1 ? 'page' : 'post';
        },
        isEdit () {
            return !!this.postID;
        },
        isMac () {
            return document.body.getAttribute('data-os') === 'osx';
        },
        easymde () {
            return this.$refs.markdownEditor.easymde;
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

        if (this.isEdit) {
            this.newPost = false;
            this.loadPostData();
        } else {
            this.setDataLossWatcher();
        }

        this.$bus.$on('date-changed', (timestamp) => {
            let format = 'MMM DD, YYYY  HH:mm';

            if(this.$store.state.app.config.timeFormat == 12) {
                format = 'MMM DD, YYYY  hh:mm a';
            }

            this.postData.creationDate.timestamp = timestamp;
            this.postData.creationDate.text = this.$moment(this.postData.creationDate.timestamp).format(format);
        });

        this.$bus.$on('post-editor-possible-data-loss', () => {
            this.possibleDataLoss = true;
        });

        Vue.nextTick(() => {
            this.easymde.codemirror.on('change', this.detectDataLoss);
            window.prompt = this.linkPopupHandler;
            this.$refs.linkPopup.setEasyMdeInstance(this.easymde);
            inlineAttachment.editors.codemirror4.attach(this.easymde.codemirror, {});
            this.$refs['post-title'].focus();
        });
    },
    methods: {
        detectEnterInTitle (event) {
            if (event.code === 'Enter' && !event.isComposing) {
                event.preventDefault();
                this.easymde.codemirror.focus();
            }
        },
        updateTitle () {
            this.postData.title = this.$refs['post-title'].innerText.replace(/\n/gmi, ' ');
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
                if(data !== false && this.postID !== 0) {
                    let loadedPostData = ItemHelper.loadItemData(data, this.$store, this.$moment, this.itemType);
                    this.postData = Utils.deepMerge(this.postData, loadedPostData);
                    this.$refs['post-title'].innerText = this.postData.title;
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
        async savePost (newPostStatus, preview = false, closeEditor = false) {
            if (this.postData.title.trim() === '') {
                this.$bus.$emit('alert-display', {
                    message: this.itemType === 'page' ? this.$t('editor.cantSavePageWithEmptyTitle') : this.$t('editor.cantSavePostWithEmptyTitle')
                });

                return;
            }

            let postData = await ItemHelper.prepareItemData(newPostStatus, this.postID, this.$store, this.postData, this.itemType);

            if(!preview) {
                this.savingPost(newPostStatus, postData, closeEditor);
            } else {
                this.$bus.$emit('rendering-popup-display', {
                    itemID: this.postID,
                    postData: postData,
                    postOnly: true,
                    itemType: this.itemType
                });
            }
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
            }

            this.$router.push('/site/' + this.$route.params.name + '/' + this.itemType + 's/editor/markdown/' + this.postID);
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
        },
        detectDataLoss () {
            if (!this.editorIsInitialized) {
                this.editorIsInitialized = true;
                return;
            }

            this.$bus.$emit('post-editor-possible-data-loss');
            this.easymde.codemirror.off('change', this.detectDataLoss);
        },
        linkPopupHandler (e) {
            let selectedText = this.easymde.codemirror.getSelections();

            if (selectedText && selectedText.length) {
                selectedText = selectedText[0];
            } else {
                selectedText = '';
            }

            this.$bus.$emit('init-link-popup', {
                postID: this.postID,
                selection: selectedText
            });
        },
        pasteTitle (e) {
            let text = (e.originalEvent || e).clipboardData.getData('text/plain').replace(/\n/gmi, '');
            document.execCommand('insertText', false, text);
        }
    },
    beforeDestroy () {
        if (this.unwatchDataLoss) {
            this.unwatchDataLoss();
        }

        this.$bus.$off('date-changed');
        this.$bus.$off('post-editor-possible-data-loss');
        window.prompt = () => false;
        window.onbeforeunload = null;
    }
};
</script>

<style lang="scss">
@import '../scss/variables.scss';
@import '../scss/mixins.scss';
@import '../scss/editor/post-editors-common.scss';
@import '../scss/editor/editor-markdown.scss';


.post-editor-markdown {
    overflow-x: hidden;
    position: relative;
    width: 100%;
    z-index: 2;

   .post-editor {
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

            #post-title {
                border: none;
                box-shadow: none;
                columns: var(--headings-color);
                display: block;
                font-family: -apple-system, BlinkMacSystemFont, Arial, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif;
                font-size: 3.6rem;
                font-weight: var(--font-weight-bold);
                letter-spacing: var(--letter-spacing);
                line-height: 1.2;
                margin: 0 10% 2.6rem;
                padding: 0;
                text-align: center;
                width: 80%;

                &:empty {
                    color: var(--gray-4);

                    &:before {
                        content: attr(data-translation);
                    }

                    &:focus:before {
                        content: "";
                    }
                }
            }

            .vue-easymde {
                position: relative;
                z-index: 1000;

                .CodeMirror {
                    border: none;
                    height: auto!important;
                    margin: 0 auto;
                    max-width: var(--editor-width);
                    padding: 0;

                    .CodeMirror-selected {
                        background: var(--text-selection-color)!important;
                    }
                }

                .CodeMirror-advanced-dialog + .CodeMirror {
                    padding-bottom: 80px;
                }
            }
       }
    }
}

@media (min-width: 1800px) {
    .post-editor-markdown .post-editor-form #post-title {
        margin: 0 auto 2.6rem;
        max-width: calc(100vw - 880px);
        width: 100%;
    }
}

#post-help-button {
    align-items: center;
    bottom: .4rem;
    display: flex;
    height: 4.4;
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
