<template>
    <div 
        class="post-editor post-editor-markdown" 
        ref="post-editor" 
        :data-post-id="postID">
        <topbar-appbar />
        <post-editor-top-bar />

        <div class="post-editor-wrapper">
            <div class="post-editor-form">
                <div>
                    <div
                        id="post-title"
                        ref="post-title"
                        class="post-editor-form-title"
                        contenteditable="true"
                        :spellcheck="$store.state.currentSite.config.spellchecking"
                        @paste.prevent="pasteTitle"
                        @keydown="detectEnterInTitle"
                        @keyup="updateTitle" />   

                    <vue-simplemde 
                        ref="markdownEditor"
                        v-model="postData.text"
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
                type="clean icon small"
                icon="help"
                title="Help"
                @click.native="toggleHelp">
                <template v-if="!helpPanelOpen">View help</template>
                <template v-else>Hide help</template>
            </p-button>

            <sidebar :isVisible="sidebarVisible" />
            <author-popup />
            <date-popup />
            <link-popup 
                ref="linkPopup"
                :markdown="true" />
            <help-panel-markdown :isOpen="helpPanelOpen" />
        </div>
    </div>
</template>

<script>
import Vue from 'vue';
import VueSimplemde from 'vue-simplemde'
import PostEditorSidebar from './post-editor/Sidebar';
import AuthorPopup from './post-editor/AuthorPopup';
import DatePopup from './post-editor/DatePopup';
import HelpPanelMarkdown from './post-editor/HelpPanelMarkdown';
import LinkPopup from './post-editor/LinkPopup';
import TopBarAppBar from './TopBarAppBar';
import PostEditorTopBar from './post-editor/TopBar';
import PostHelper from './post-editor/PostHelper';
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
        'vue-simplemde': VueSimplemde
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
                placeholder: 'Start writing...',
                spellChecker: false,
                promptURLs: true
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
                postViewOptions: {}
            }
        };
    },
    computed: {
        isEdit () {
            return !!this.postID;
        },
        simplemde () {
            return this.$refs.markdownEditor.simplemde;
        }
    },
    mounted () {
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

        this.simplemde.codemirror.on('change', this.detectDataLoss);
        window.prompt = this.linkPopupHandler;
        this.$refs.linkPopup.setSimpleMdeInstance(this.simplemde);
        inlineAttachment.editors.codemirror4.attach(this.simplemde.codemirror, {});
        this.$refs['post-title'].focus();
    },
    methods: {
        detectEnterInTitle (event) {
            if (event.code === 'Enter' && !event.isComposing) {
                event.preventDefault();
                this.simplemde.codemirror.focus();
            }
        },
        updateTitle () {
            this.postData.title = this.$refs['post-title'].innerText.replace(/\n/gmi, ' ');
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
        savePost (newPostStatus, preview = false, closeEditor = false) {
            if (this.postData.title.trim() === '') {
                this.$bus.$emit('alert-display', {
                    message: 'You cannot save a post with empty title.'
                });

                return;
            }

            let postData = PostHelper.preparePostData(newPostStatus, this.postID, this.$store, this.postData);

            if(!preview) {
                this.savingPost(newPostStatus, postData, closeEditor);
            } else {
                this.$bus.$emit('rendering-popup-display', {
                    itemID: this.postID,
                    postData: postData,
                    postOnly: true
                });
            }
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
                    alert('An error occurred - please try again.');
                }
            });
        },
        savedPost (newStatus, updatedData, closeEditor = false) {
            this.$store.commit('refreshAfterPostUpdate', updatedData);

            if (closeEditor) {
                this.closeEditor();
                return;
            } else {
                // this.$refs['tinymceEditor'].editorInstance.updatePostID(this.postID);
            }

            this.$router.push('/site/' + this.$route.params.name + '/posts/editor/markdown/' + this.postID);
            let message = 'Changes have been saved';

            if (this.newPost) {
                this.newPost = false;

                if (newStatus === 'draft') {
                    message = 'New draft has been created';
                } else {
                    message = 'New post has been created';
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
            this.simplemde.codemirror.off('change', this.detectDataLoss);
        },
        linkPopupHandler (e) {
            let selectedText = this.simplemde.codemirror.getSelections();

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
                display: block;
                font-family: -apple-system, BlinkMacSystemFont, Arial, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif;
                font-size: 3.5rem;
                font-weight: 600;
                line-height: 1.2;
                margin: 0 10% 2.6rem;
                padding: 0;
                text-align: center;
                width: 80%;

                &:empty {
                    color: var(--gray-3); 

                    &:before {
                        content: "Add post title"
                    }

                    &:focus:before {
                        content: "";
                    }
                }
            }

            .vue-simplemde {
                margin: 0 auto;
                max-width: 720px;
                position: relative;
                z-index: 1000;

                .CodeMirror {
                    border: none;
                    height: auto!important;
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
        max-width: calc(100% - 880px);
        width: 100%;
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
