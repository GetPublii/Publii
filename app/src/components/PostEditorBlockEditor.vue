<template>
    <div class="post-editor" ref="post-editor">
        <topbar-appbar />
        <post-editor-top-bar />

        <div class="post-editor-wrapper">
            <div class="post-editor-form">
                <div>
                    <textarea id="post-editor"></textarea>

                    <input
                        name="image"
                        id="post-editor-fake-image-uploader"
                        class="is-hidden"
                        type="file" />
                </div>
            </div>

            <sidebar :isVisible="sidebarVisible" />
            <author-popup />
            <date-popup />
        </div>
    </div>
</template>

<script>
import Vue from 'vue';
import { ipcRenderer, remote } from 'electron';
import PostEditorSidebar from './post-editor/Sidebar';
import AuthorPopup from './post-editor/AuthorPopup';
import DatePopup from './post-editor/DatePopup';
import TopBarAppBar from './TopBarAppBar';
import PostEditorTopBar from './post-editor/TopBar';
import PostHelper from './post-editor/PostHelper';
import Utils from './../helpers/utils';

const mainProcess = remote.require('./main.js');

export default {
    name: 'post-editor-block-editor',
    components: {
        'author-popup': AuthorPopup,
        'date-popup': DatePopup,
        'sidebar': PostEditorSidebar,
        'topbar-appbar': TopBarAppBar,
        'post-editor-top-bar': PostEditorTopBar
    },
    data () {
        return {
            postID: this.$route.params.post_id || 0,
            newPost: true,
            postSlugEdited: false,
            possibleDataLoss: false,
            unwatchDataLoss: null,
            sidebarVisible: false,
            postData: {
                editor: 'blockeditor',
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
                return postData;
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
                // this.$refs['tinymceEditor'].editorInstance.updatePostID(this.postID);
            }

            this.$router.push('/site/' + this.$route.params.name + '/posts/editor/blockeditor/' + this.postID);
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
        closeEditor () {
            let siteName = this.$route.params.name;
            this.$router.push('/site/' + siteName + '/posts/');
        }
    },
    beforeDestroy () {
        if (this.unwatchDataLoss) {
            this.unwatchDataLoss();
        }

        this.$bus.$off('date-changed');
        this.$bus.$off('post-editor-possible-data-loss');
    }
};
</script>

<style lang="scss">
@import '../scss/variables.scss';
@import '../scss/mixins.scss';
@import '../scss/editor/post-editors-common.scss';
</style>
