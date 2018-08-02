<template>
    <div class="post-editor" ref="post-editor">
        <topbar-appbar />

        <div class="post-editor-topbar">
            <h2 class="post-editor-title">
                {{ editorTitle }}
            </h2>

            <div
                v-if="!sourceCodeEditorVisible"
                class="post-editor-actions">
                <p-button
                    type="primary"
                    :disabled="postData.title === ''"
                    @click.native="publishPost">
                    <template v-if="!isEdit || isDraft">Publish post</template>
                    <template v-if="isEdit && !isDraft">Save changes</template>
                </p-button>

                <p-button
                    :disabled="postData.title === ''"
                    @click.native="draftPost">
                    <template v-if="!isEdit && !isDraft">Save as draft</template>
                    <template v-if="isEdit">Save draft</template>
                </p-button>

                <p-button
                    type="outline"
                    @click.native="cancelPost">
                    <template v-if="!possibleDataLoss">Close</template>
                    <template v-if="possibleDataLoss">Cancel</template>
                </p-button>
            </div>

            <div
                v-if="sourceCodeEditorVisible"
                class="post-editor-source-code-actions">
                <p-button
                    type="primary"
                    @click.native="sourceCodeApply">
                    Apply changes
                </p-button>

                <p-button
                    type="outline"
                    @click.native="sourceCodeCancel">
                    Cancel
                </p-button>
            </div>
        </div>

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

                    <p-button
                        type="outline"
                        :disabled="!themeConfigured"
                        :title="themeConfigured ? 'You have to configure theme for this website before generating preview of this post.' : ''"
                        @click.native="generatePostPreview">
                        Preview
                    </p-button>

                    <editor ref="tinymceEditor" />

                    <input
                        name="image"
                        id="post-editor-fake-image-uploader"
                        class="is-hidden"
                        type="file" />
                </div>
            </div>

            <writers-panel ref="writers-panel" />
            <sidebar />
            <source-code-editor ref="source-code-editor" />
            <author-popup />
            <date-popup />
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

const mainProcess = remote.require('./main.js');

export default {
    name: 'post-editor',
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
        'writers-panel': PostEditorWritersPanel
    },
    data () {
        return {
            postID: this.$route.params.post_id || 0,
            sourceCodeEditorVisible: false,
            writersPanelOpen: false,
            postSlugEdited: false,
            possibleDataLoss: false,
            unwatchDataLoss: null,
            postData: {
                title: '',
                text: '',
                slug: '',
                author: 1,
                tags: [],
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
        isDraft () {
            return this.postData.status.indexOf('draft') > -1;
        },
        editorTitle () {
            if (this.isEdit) {
                return 'Edit post';
            }

            return 'Create new post';
        },
        themeConfigured () {
            return !!this.$store.state.currentSite.config.theme;
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

        this.$bus.$on('source-code-editor-show', () => {
            this.sourceCodeEditorVisible = true;
        });

        this.$bus.$on('source-code-editor-close', () => {
            this.sourceCodeEditorVisible = false;
        });

        this.$bus.$on('post-editor-possible-data-loss', () => {
            this.possibleDataLoss = true;
        });
    },
    methods: {
        cancelPost () {
            if(!this.possibleDataLoss) {
                this.closeEditor();
                return;
            }

            this.$bus.$emit('confirm-display', {
                message: 'You will lose all unsaved changes - do you want to continue?',
                okClick: this.cleanUpPost
            });
        },
        cleanUpPost () {
            // Get the text data
            let preparedText = this.postData.text;
            // Remove directory path from images src attribute
            let mediaPath = this.getMediaPath();
            preparedText = preparedText.split(mediaPath).join('#DOMAIN_NAME#');
            // Send an event which will remove unused images from the post editor
            ipcRenderer.send('app-post-cancel', {
                'site': this.$store.state.currentSite.config.name,
                'id': this.postID,
                'text': preparedText,
                'featuredImageFilename': this.postData.featuredImage.path,
                'featuredImageData': {
                    alt: this.postData.featuredImage.alt,
                    caption: this.postData.featuredImage.caption,
                    credits: this.postData.featuredImage.credits
                },
            });

            this.closeEditor();
        },
        closeEditor () {
            let siteName = this.$route.params.name;
            this.$router.push('/site/' + siteName + '/posts/');
        },
        getMediaPath () {
            let mediaPath = this.$store.state.currentSite.siteDir;
            mediaPath = 'file://' + mediaPath.replace(/\\/g, '/');
            mediaPath += '/input/media/posts/';
            mediaPath += this.postID === 0 ? 'temp' : this.postID;
            mediaPath += '/';

            return mediaPath;
        },
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
                    // Set post elements
                    this.postData.title = data.posts[1];
                    let mediaPath = this.getMediaPath();
                    let preparedText = data.posts[4];
                    preparedText = preparedText.split('#DOMAIN_NAME#').join(mediaPath);

                    this.postData.text = preparedText;
                    $('#post-editor').val(preparedText);

                    // Set tags
                    this.postData.tags = [];

                    if (data.tags[0]) {
                        for (let i = 0; i < data.tags[0].values.length; i++) {
                            this.postData.tags.push(data.tags[0].values[i][1]);
                        }
                    }

                    // Set author
                    this.postData.author = data.author.id;

                    // Dates
                    let format = 'MMM DD, YYYY  HH:mm';

                    if(this.$store.state.app.config.timeFormat == 12) {
                        format = 'MMM DD, YYYY  hh:mm a';
                    }

                    this.postData.creationDate.text = this.$moment(data.posts[6]).format(format);
                    this.postData.modificationDate.text = this.$moment(data.posts[7]).format(format);
                    this.postData.creationDate.timestamp = data.posts[6];
                    this.postData.modificationDate.timestamp = data.posts[7];
                    this.postData.status = data.posts[8].split(',').join(', ');
                    this.postData.isHidden = data.posts[8].indexOf('hidden') > -1;
                    this.postData.isFeatured = data.posts[8].indexOf('featured') > -1;

                    // Set image
                    if (data.featuredImage[0] && data.featuredImage[0].values[0][0]) {
                        this.postData.featuredImage.path = data.featuredImage[0].values[0][0];

                        if(data.featuredImage[0].values[0][1]) {
                            try {
                                let imageData = JSON.parse(data.featuredImage[0].values[0][1]);
                                this.postData.featuredImage.alt = imageData.alt;
                                this.postData.featuredImage.caption = imageData.caption;
                                this.postData.featuredImage.credits = imageData.credits;
                            } catch(e) {
                                console.warning('Unable to load featured image data: ');
                                console.warning(data.featuredImage[0].values[0][1]);
                            }
                        }
                    }

                    // Set SEO
                    this.postData.slug = data.posts[3];
                    this.postData.metaTitle = data.additionalData.metaTitle || "";
                    this.postData.metaDescription = data.additionalData.metaDesc || "";
                    this.postData.metaRobots = data.additionalData.metaRobots || "";
                    this.postData.canonicalUrl = data.additionalData.canonicalUrl || "";

                    // Update post template
                    this.postData.template = data.posts[9];

                    // Update post view settings
                    let postViewFields = Object.keys(data.postViewSettings);

                    for(let i = 0; i < postViewFields.length; i++) {
                        let newValue = '';

                        if(data.postViewSettings[postViewFields[i]] && data.postViewSettings[postViewFields[i]].value) {
                            newValue = data.postViewSettings[postViewFields[i]].value;
                        } else {
                            newValue = data.postViewSettings[postViewFields[i]];
                        }

                        this.postData.postViewOptions[postViewFields[i]] = newValue;
                    }

                    this.$refs['tinymceEditor'].init();
                }

                // Add custom editor script
                if(
                    this.$store.state.currentSite.themeSettings &&
                    this.$store.state.currentSite.themeSettings.extensions &&
                    this.$store.state.currentSite.themeSettings.extensions.postEditorCustomScript
                ) {
                    let customEditorScriptPath = this.extensionsPath + 'tinymce.script.js';

                    $(document.body).append(
                        // It seems that Webpack goes crazy when it sees 'script' tag :)
                        $('<' + 'script' + ' id="custom-post-editor-script" src="' + customEditorScriptPath + '"></' + 'script' + '>')
                    );
                }

               this.setDataLossWatcher();
            });
        },
        setDataLossWatcher () {
            this.unwatchDataLoss = this.$watch('postData', (newValue, oldValue) => {
                this.possibleDataLoss = true;
                this.unwatchDataLoss();
            }, { deep: true });
        },
        savePost(newPostStatus, preview = false) {
            tinymce.triggerSave();
            let finalStatus = newPostStatus;
            let mediaPath = this.getMediaPath();
            let preparedText = $('#post-editor').val();
            // Remove directory path from images src attribute
            preparedText = preparedText.split(mediaPath).join('#DOMAIN_NAME#');

            if(this.postData.isHidden) {
                finalStatus += ',hidden';
            }

            if(this.postData.isFeatured) {
                finalStatus += ',featured';
            }

            let postViewSettings = {};

            this.$store.state.currentSite.themeSettings.postConfig.forEach(field => {
                let fieldType = 'select';

                if (typeof field.type !== 'undefined') {
                    fieldType = field.type;
                }

                postViewSettings[field.name] = {
                    type: fieldType,
                    value: this.postData.postViewOptions[field.name]
                };
            });

            if (this.postData.slug === '') {
                this.postData.slug = mainProcess.slug(this.postData.title);
            }

            let creationDate = this.postData.creationDate.timestamp;

            if (!this.postData.creationDate.timestamp) {
                creationDate = Date.now();
            }

            if (this.postData.status.indexOf('draft') > -1 && newPostStatus === 'published') {
                creationDate = Date.now();
            }

            let postData = {
                'site': this.$store.state.currentSite.config.name,
                'title': this.postData.title,
                'slug': this.postData.slug,
                'text': preparedText,
                'tags': this.postData.tags.join(','),
                'status': finalStatus,
                'creationDate': creationDate,
                'modificationDate': Date.now(),
                'template': this.postData.template,
                'featuredImage': this.getMediaPath() + this.postData.featuredImage.path,
                'featuredImageFilename': this.postData.featuredImage.path,
                'featuredImageData': {
                    alt: this.postData.featuredImage.alt,
                    caption: this.postData.featuredImage.caption,
                    credits: this.postData.featuredImage.credits
                },
                'additionalData': {
                    metaTitle: this.postData.metaTitle,
                    metaDesc: this.postData.metaDescription,
                    metaRobots: this.postData.metaRobots,
                    canonicalUrl: this.postData.canonicalUrl
                },
                'postViewSettings': postViewSettings,
                'id': this.postID,
                'author': parseInt(this.postData.author, 10)
            };

            if(!preview) {
                this.savingPost(newPostStatus, postData);
            } else {
                return postData;
            }
        },
        savingPost(newStatus, postData) {
            // Send form data to the back-end
            ipcRenderer.send('app-post-save', postData);

            // Post save
            ipcRenderer.once('app-post-saved', (event, data) => {
                if (data.posts) {
                    this.savedPost(newStatus, data);
                } else {
                    alert('An error occurred - please try again.');
                }
            });
        },
        savedPost(newStatus, updatedData) {
            this.$store.commit('refreshAfterPostUpdate', updatedData);
            this.closeEditor();
        },
        publishPost () {
            this.savePost('published');
        },
        draftPost () {
            this.savePost('draft');
        },
        sourceCodeApply () {
            this.$refs['source-code-editor'].applyChanges();
        },
        sourceCodeCancel () {
            this.$refs['source-code-editor'].cancelChanges();
        },
        generatePostPreview () {
            let postID = this.postID;
            let postData = this.savePost('published', true);

            this.$bus.$emit('rendering-popup-display', {
                postID,
                postData
            });
        }
    },
    beforeDestroy () {
        this.unwatchDataLoss();
        $('#custom-post-editor-script').remove();
        this.$bus.$off('date-changed');
        this.$bus.$off('source-code-editor-show');
        this.$bus.$off('source-code-editor-close');
        this.$bus.$off('post-editor-possible-data-loss');
    }
};
</script>

<style lang="scss">
@import '../scss/variables.scss';
@import '../scss/mixins.scss';

.post-editor {
    background: $color-10;

    &-wrapper {
        display: flex;
        height: 100vh;
        overflow: hidden;
        padding-top: 8.4rem;
    }

    .appbar {
        height: 2.2rem!important;
        position: absolute!important;
        width: 100%;
    }

    &-topbar {
        align-items: center;
        background: $color-10;
        box-shadow: 0 1px 2px rgba(0, 0, 0, .1);
        font-size: 2.4rem;
        display: flex;
        height: 6.2rem;
        justify-content: space-between;
        padding: 0 5rem;
        position: absolute;
        top: 2.2rem;
        width: 100%;
        z-index: 103;
    }

    &-title {
        font-size: 1.6rem;
        margin: 0;
        pointer-events: none;
        text-transform: none;
    }

    &-actions {

    }

    &-field-select-tags {
        width: 480px;
    }

    &-form {
        height: calc(100vh - 8.4rem);
        overflow: hidden;
        position: relative;
        width: calc(100vw - 50rem);

        & > div {
            padding: 4rem 4rem 3rem 4rem;
        }

        #post-title {
            border: none;
            box-shadow: none;
            font-size: 2.8rem;
            line-height: 1.2;
            margin: 0 0 3rem 0;
            padding: 0;
            width: 85%;

            & + .button {
                position: absolute;
                right: 4rem;
                top: 3.6rem;
            }

            & + .button + div {
                clear: both;
            }
        }

        &-content {
            border: 1px solid $color-7;
            clear: both;
            font-size: 1.6rem;
            height: calc( 100vh - 33rem );
            margin: 1rem 0;
            min-height: 320px;
            padding: 1rem 2rem;
            width: 100%;
        }

        #post-editor_ifr {
            height: calc( 100vh - 35rem )!important;
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
            background: $color-10;
        }
    }
}

/*
 * Windows adjustments
 */
body[data-os="win"] {
    .post-editor {
        .appbar {
            height: 3.6rem!important;
        }

        .topbar {
            height: 3.6rem;
        }

        &-topbar {
            top: 3.6rem;
        }
    }
}

/*
 * Special styles for win
 */

body[data-os="win"] {
    .post-editor-wrapper {
        height: calc(100vh - 2px);
        padding-top: 10rem;
    }

    .post-editor-form {
        height: calc(100vh - 10rem);

        &-content {
            height: calc( 100vh - 34rem );
        }

        #post-editor_ifr {
            height: calc( 100vh - 36rem )!important;
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

/*
 * Responsive improvements
 */
@media (max-height: 900px) {
    .post-editor-form {
        width: calc(100vw - 40rem);

        & > div {
            padding: 3rem 3rem 3rem 4rem;
        }

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
        width: calc(100vw - 40rem);

        & > div {
            padding: 3rem 3rem 3rem 4rem;
        }

        #post-title + a {
            top: 2.6rem;
        }
    }
}
</style>
