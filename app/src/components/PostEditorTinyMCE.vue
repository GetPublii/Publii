<template>
    <div class="post-editor" ref="post-editor">
        <topbar-appbar />
        <post-editor-top-bar />

        <div class="post-editor-wrapper">
            <div class="post-editor-form">
                <div>
                    <input
                        id="post-title"
                        ref="post-title"
                        class="post-editor-form-title"
                        placeholder="Add post title"
                        v-model="postData.title"
                        @keyup="updateSlug" />                    

                    <editor ref="tinymceEditor" />

                    <input
                        name="image"
                        id="post-editor-fake-image-uploader"
                        class="is-hidden"
                        type="file" />
                </div>
            </div>

            <writers-panel :isVisible="writersPanelOpen" />

            <p-button
                id="post-stats-button"
                type="clean icon small"
                icon="stats"
                title="Toggle post statistics panel"
                @click.native="togglePostStats">
                <template v-if="!writersPanelOpen">View Stats</template>
                <template v-else>Hide Stats</template>
            </p-button>

            <sidebar :isVisible="sidebarVisible" />
            <author-popup />
            <date-popup />
            <source-code-editor ref="source-code-editor" />
            <link-popup />
            <link-toolbar />
            <gallery-popup />
            <inline-editor ref="inline-editor" />
        </div>
    </div>
</template>

<script>
import Vue from 'vue';
import { ipcRenderer, remote } from 'electron';
import PostEditorSidebar from './post-editor/Sidebar';
import InlineEditor from './post-editor/InlineEditor';
import PostEditorSourceCode from './post-editor/SourceCodeEditor';
import PostEditorWritersPanel from './post-editor/WritersPanel';
import AuthorPopup from './post-editor/AuthorPopup';
import DatePopup from './post-editor/DatePopup';
import LinkPopup from './post-editor/LinkPopup';
import LinkToolbar from './post-editor/LinkToolbar';
import GalleryPopup from './post-editor/GalleryPopup';
import Editor from './post-editor/Editor';
import TopBarAppBar from './TopBarAppBar';
import PostEditorTopBar from './post-editor/TopBar';
import PostHelper from './post-editor/PostHelper';
import Utils from './../helpers/utils';

const mainProcess = remote.require('./main.js');

export default {
    name: 'post-editor-tinymce',
    components: {
        'author-popup': AuthorPopup,
        'date-popup': DatePopup,
        'link-popup': LinkPopup,
        'gallery-popup': GalleryPopup,
        'link-toolbar': LinkToolbar,
        'editor': Editor,
        'inline-editor': InlineEditor,
        'sidebar': PostEditorSidebar,
        'source-code-editor': PostEditorSourceCode,
        'topbar-appbar': TopBarAppBar,
        'writers-panel': PostEditorWritersPanel,
        'post-editor-top-bar': PostEditorTopBar
    },
    data () {
        return {
            postID: this.$route.params.post_id || 0,
            newPost: true,
            writersPanelOpen: localStorage.getItem('publii-writers-panel') === 'opened',
            postSlugEdited: false,
            possibleDataLoss: false,
            unwatchDataLoss: null,
            sidebarVisible: false,
            postData: {
                editor: 'tinymce',
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
        extensionsPath () {
            return [
                'file:///',
                this.$store.state.currentSite.siteDir,
                '/input/themes/',
                this.$store.state.currentSite.config.theme,
                '/'
            ].join('');
        }
    },
    mounted () {
        if (this.isEdit) {
            this.newPost = false;
            this.loadPostData();
        } else {
            this.$refs['post-title'].focus();
            this.$refs['tinymceEditor'].init();
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
    },
    methods: {
        slugUpdated () {
            this.postSlugEdited = true;
        },
        updateSlug () {
            if(this.isEdit || this.postSlugEdited) {
                return;
            }

            let slugValue = mainProcess.slug(this.postData.title);
            this.postData.slug = slugValue;
        },
        loadPostData () {
            // Send request for a post to the back-end
            ipcRenderer.send('app-post-load', {
                'site': this.$store.state.currentSite.config.name,
                'id': this.postID
            });

            // Load post data
            ipcRenderer.once('app-post-loaded', (event, data) => {
                if(data !== false && this.postID !== 0) {
                    let loadedPostData = PostHelper.loadPostData(data, this.$store, this.$moment);
                    this.postData = Utils.deepMerge(this.postData, loadedPostData);
                    $('#post-editor').val(this.postData.text);
                    this.$refs['tinymceEditor'].init();
                }

                // Add custom editor script
                if(
                    this.$store.state.currentSite.themeSettings &&
                    this.$store.state.currentSite.themeSettings.extensions &&
                    this.$store.state.currentSite.themeSettings.extensions.postEditorCustomScript
                ) {
                    let customEditorScriptPath = this.extensionsPath + 'tinymce.script.js';

                    if (!document.querySelector('custom-post-editor-script')) {
                        $(document.body).append(
                            // It seems that Webpack goes crazy when it sees 'script' tag :)
                            $('<' + 'script' + ' id="custom-post-editor-script" src="' + customEditorScriptPath + '"></' + 'script' + '>')
                        );
                    }
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

            tinymce.triggerSave();
            let postData = PostHelper.preparePostData(newPostStatus, this.postID, this.$store, this.postData);

            if(!preview) {
                this.savingPost(newPostStatus, postData, closeEditor);
            } else {
                this.$bus.$emit('rendering-popup-display', {
                    postID: this.postID,
                    postData: postData
                });
            }
        },
        savingPost (newStatus, postData, closeEditor = false) {
            // Send form data to the back-end
            ipcRenderer.send('app-post-save', postData);

            // Post save
            ipcRenderer.once('app-post-saved', (event, data) => {
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
                this.$refs['tinymceEditor'].editorInstance.updatePostID(this.postID);
            }

            this.$router.push('/site/' + this.$route.params.name + '/posts/editor/tinymce/' + this.postID);
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
        toggleSidebar () {
            this.sidebarVisible = !this.sidebarVisible;
        },
        togglePostStats () {
            if (this.writersPanelOpen) {
                this.writersPanelOpen = false;
                localStorage.setItem('publii-writers-panel', 'closed');
            } else {
                this.writersPanelOpen = true;
                localStorage.setItem('publii-writers-panel', 'opened');
            }
        },
        closeEditor () {
            let siteName = this.$route.params.name;
            this.$router.push('/site/' + siteName + '/posts/');
        }
    },
    beforeDestroy () {
        if (this.unwatchDataLoss) {
            this.unwatchDataLoss();
        }

        $('#custom-post-editor-script').remove();
        this.$bus.$off('date-changed');
        this.$bus.$off('post-editor-possible-data-loss');
    }
};
</script>

<style lang="scss">
@import '../scss/variables.scss';
@import '../scss/mixins.scss';
@import '../scss/editor/post-editors-common.scss';

.post-editor {
    overflow-x: hidden;
    position: relative;
    width: 100%;

    &-form {
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
            
            &::placeholder {
                color: rgba($color-helper-7, .5); 
            }
        }

        #post-editor_ifr {
            height: calc( 100vh - 30rem )!important;
        }

        .mce-tinymce {
            opacity: 0;
            transition: opacity .25s ease-out;
            transition-delay: .5s;

            &.is-loaded {
                opacity: 1;
            }
        }

        .mce-container,
        .mce-container-body {
           background: var(--bg-primary);
        }
    }
}

/*
 * Special styles for win & linux
 */

body[data-os="win"] {
    .post-editor-form {
        #post-editor_ifr {
            height: calc( 100vh - 31rem )!important;
        }
    }

    .post-editor {
        #inline-toolbar {
            padding-top: 0;
            padding-bottom: 0;

            select {
                padding-top: 0;
                padding-bottom: 0;
                top: 0;
            }
        }

        #link-toolbar {
            padding-top: .75rem;
        }
    }
}

body[data-os="linux"] {
    .post-editor-form {
        #post-editor_ifr {
            height: calc( 100vh - 26.8rem )!important;
        }
    }
}

/*
 * Responsive improvements
 */
@media (max-height: 900px) {
    .post-editor-form {
        #post-title + a {
            top: 3.6rem;
        }
    }

    .mce-window {
        max-height: 590px!important;
        padding: 2rem !important;

        .mce-foot {
            margin: 2.4rem -2rem 0 -2rem !important;
        }

        .mce-window-body {
            max-height: 500px;

            & > .mce-form.mce-abs-layout-item {
                max-height: 500px;

                & > .mce-container-body.mce-abs-layout {
                    max-height: 500px;
                }
            }
        }

        .mce-reset .mce-window-head {
            margin: 0 0 2rem 0!important;
        }
    }
}

@media (max-width: 1400px) {    
    .post-editor-form {
        #post-title {            
            font-size: 2.8rem;
            margin: 0 0 2.6rem;
        
            & + a {
                top: 2.6rem;
            }
        }
    }
}
    
@media (max-width: 1600px) {    
    .post-editor-form {
        #post-title {            
            font-size: 2.8rem;
            margin: 0 0 2.6rem;
            width: 100%;
        
            & + a {
                top: 2.6rem;
            }
        }
    }
}
</style>
