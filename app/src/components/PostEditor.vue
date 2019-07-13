<template>
    <div class="post-editor" ref="post-editor">
        <topbar-appbar />

        <div class="post-editor-topbar">
            <p-button
                v-if="!sourceCodeEditorVisible"
                id="post-preview-button"
                type="outline icon"
                icon="off-live-preview"
                :disabled="!themeConfigured"
                :title="themeConfigured ? 'You have to configure theme for this website before generating preview of this post.' : ''"
                @click.native="generatePostPreview">
                Preview
            </p-button>

            <div
                v-if="!sourceCodeEditorVisible"
                class="post-editor-actions">
                
                <btn-dropdown
                    ref="dropdown-button"
                    :items="dropdownItems"
                    :min-width="210"
                    :defaultValue="retrieveCurrentAction()" />

                <p-button
                    type="outline"
                    @click.native="cancelPost">
                    <template v-if="!possibleDataLoss">Close</template>
                    <template v-if="possibleDataLoss">Cancel</template>
                </p-button>

                <p-button 
                    icon="settings"
                    type="outline icon only-icon"
                    @click.native="toggleSidebar" />
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
                type="outline icon"
                icon="stats"
                title="Toggle post statistics panel"
                @click.native="togglePostStats">
                <template v-if="!writersPanelOpen">Show stats</template>
                <template v-else>Hide stats</template>
            </p-button>

            <sidebar :isVisible="sidebarVisible" />
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
            newPost: true,
            sourceCodeEditorVisible: false,
            writersPanelOpen: localStorage.getItem('publii-writers-panel') === 'opened',
            postSlugEdited: false,
            possibleDataLoss: false,
            unwatchDataLoss: null,
            sidebarVisible: false,
            postData: {
                editor: localStorage.getItem('publii-current-editor') || 'tinymce',
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
        dropdownItems () {
            return [
                {
                    label: 'Save and close',
                    value: 'save-and-close',
                    isVisible: () => true,
                    onClick: this.dropdownSaveAndClose
                },
                {
                    label: 'Save',
                    value: 'save',
                    isVisible: () => true,
                    onClick: this.dropdownSave
                },
                {
                    label: 'Save as draft',
                    value: 'save-as-draft',
                    isVisible: () => !this.isDraft,
                    onClick: this.dropdownSaveAsDraft
                },
                {
                    label: this.$store.state.app.config.closeEditorOnSave ? 'Publish and close' : 'Publish post',
                    value: 'publish-post',
                    isVisible: () => this.isDraft,
                    onClick: this.dropdownPublish
                }
            ]
        },
        isEdit () {
            return !!this.postID;
        },
        isDraft () {
            return this.postData.status.indexOf('draft') > -1;
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

        this.$bus.$on('source-code-editor-show', () => {
            this.sourceCodeEditorVisible = true;
        });

        this.$bus.$on('source-code-editor-close', () => {
            this.sourceCodeEditorVisible = false;
        });

        this.$bus.$on('post-editor-possible-data-loss', () => {
            this.possibleDataLoss = true;
        });

        this.$bus.$on('document-body-clicked', this.closeDropdownButton);
        this.$bus.$on('update-inline-editor', this.closeDropdownButton);
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
            let mediaPath = this.$store.state.currentSite.siteDir.replace(/&/gmi, '&amp;');
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
                    this.postData.title = data.posts[0].title;
                    let mediaPath = this.getMediaPath();
                    let preparedText = data.posts[0].text;
                    preparedText = preparedText.split('#DOMAIN_NAME#').join(mediaPath);

                    this.postData.text = preparedText;
                    $('#post-editor').val(preparedText);

                    // Set tags
                    this.postData.tags = [];

                    if (data.tags.length) {
                        for (let i = 0; i < data.tags.length; i++) {
                            this.postData.tags.push(data.tags[i].name);
                        }
                    }

                    this.postData.mainTag = data.additionalData.mainTag || '';

                    // Set author
                    this.postData.author = data.author[0].id;

                    // Dates
                    let format = 'MMM DD, YYYY  HH:mm';

                    if(this.$store.state.app.config.timeFormat == 12) {
                        format = 'MMM DD, YYYY  hh:mm a';
                    }

                    this.postData.creationDate.text = this.$moment(data.posts[0].created_at).format(format);
                    this.postData.modificationDate.text = this.$moment(data.posts[0].modified_at).format(format);
                    this.postData.creationDate.timestamp = data.posts[0].created_at;
                    this.postData.modificationDate.timestamp = data.posts[0].modified_at;
                    this.postData.status = data.posts[0].status.split(',').join(', ');
                    this.postData.isHidden = data.posts[0].status.indexOf('hidden') > -1;
                    this.postData.isFeatured = data.posts[0].status.indexOf('featured') > -1;
                    this.postData.isExcludedOnHomepage = data.posts[0].status.indexOf('excluded_homepage') > -1;

                    // Set image
                    if (data.featuredImage) {
                        this.postData.featuredImage.path = data.featuredImage.url;

                        if(data.featuredImage.additional_data) {
                            try {
                                let imageData = JSON.parse(data.featuredImage.additional_data);
                                this.postData.featuredImage.alt = imageData.alt;
                                this.postData.featuredImage.caption = imageData.caption;
                                this.postData.featuredImage.credits = imageData.credits;
                            } catch(e) {
                                console.warning('Unable to load featured image data: ');
                                console.warning(data.featuredImage.additional_data);
                            }
                        }
                    }

                    // Set SEO
                    this.postData.slug = data.posts[0].slug;
                    this.postData.metaTitle = data.additionalData.metaTitle || "";
                    this.postData.metaDescription = data.additionalData.metaDesc || "";
                    this.postData.metaRobots = data.additionalData.metaRobots || "";
                    this.postData.canonicalUrl = data.additionalData.canonicalUrl || "";

                    // Set editor
                    this.postData.editor = data.additionalData.editor || 'tinymce';

                    // Update post template
                    this.postData.template = data.posts[0].template;

                    // Update post view settings
                    let postViewFields = Object.keys(data.postViewSettings);

                    for(let i = 0; i < postViewFields.length; i++) {
                        let newValue = '';

                        if(
                            data.postViewSettings[postViewFields[i]] && data.postViewSettings[postViewFields[i]].value
                        ) {
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
                    this.postData.editor === 'tinymce' && 
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

            if(this.postData.isExcludedOnHomepage) {
                finalStatus += ',excluded_homepage';
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
                    canonicalUrl: this.postData.canonicalUrl,
                    mainTag: this.postData.mainTag,
                    editor: this.postData.editor
                },
                'postViewSettings': postViewSettings,
                'id': this.postID,
                'author': parseInt(this.postData.author, 10)
            };

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
                this.$refs['tinymceEditor'].editorInstance.updatePostID(this.postID);
            }

            this.$router.push('/site/' + this.$route.params.name + '/posts/editor/' + this.postID);
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
        sourceCodeApply () {
            this.$refs['source-code-editor'].applyChanges();
        },
        sourceCodeCancel () {
            this.$refs['source-code-editor'].cancelChanges();
        },
        generatePostPreview () {
            let postID = this.postID;
            let postData = this.savePost('published', true);

            if (postData) {
                this.$bus.$emit('rendering-popup-display', {
                    postID,
                    postData
                });
            }
        },
        dropdownSave () {
            let status = this.postData.status.indexOf('draft') > -1 ? 'draft' : 'published';
            this.savePost(status, false, false);
            localStorage.setItem('publii-post-editor-current-action', 'save');
        },
        dropdownSaveAndClose () {
            let status = this.postData.status.indexOf('draft') > -1 ? 'draft' : 'published';
            this.savePost(status, false, true);
            localStorage.setItem('publii-post-editor-current-action', 'save-and-close');
        },
        dropdownSaveAsDraft () {
            this.savePost('draft');
            this.retrieveCurrentAction();
        },
        dropdownPublish () {
            this.savePost('published', false, this.$store.state.app.config.closeEditorOnSave);
            this.retrieveCurrentAction();
        },
        retrieveCurrentAction () {
            let currentAction = localStorage.getItem('publii-post-editor-current-action');

            if (!currentAction) {
                if (this.$store.state.app.config.closeEditorOnSave) {
                    currentAction = 'save-and-close';
                } else {
                    currentAction = 'save';
                }
            }

            if (this.$refs['dropdown-button']) {
                this.$refs['dropdown-button'].setValue(currentAction);
            }

            return currentAction;
        },
        closeDropdownButton () {
            if (this.$refs['dropdown-button']) {
                this.$refs['dropdown-button'].hideDropdown();
            }
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
        }
    },
    beforeDestroy () {
        if (this.unwatchDataLoss) {
            this.unwatchDataLoss();
        }

        $('#custom-post-editor-script').remove();
        this.$bus.$off('document-body-clicked', this.closeDropdownButton);
        this.$bus.$off('update-inline-editor', this.closeDropdownButton);
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
        padding-top: 7.8rem;
    }

    .appbar {
        height: 2.2rem!important;
        position: absolute!important;
        width: 100%;
    }

    &-topbar {
        align-items: center;
        background: transparent;
        font-size: 2.4rem;
        display: flex;
        height: 5.6rem;
        justify-content: space-between;
        padding: 0 3.2rem;
        position: absolute;
        top: 4.5rem;
        width: 100%;
        z-index: 100001;
    }

    &-actions {
        display: flex;

        .button {
            text-align: center;

            &:nth-child(2) {
                margin-left: 1rem;
                width: 94px;
            }

            &:nth-child(3) {
                margin-left: 1rem;
            }
        }
    }

    &-source-code-actions {
        margin-left: auto;
        margin-top: -2.6rem;
    }

    &-field-select-tags {
        width: 480px;
    }

    &-form {
        height: calc(100vh - 7.8rem);
        overflow: hidden;
        position: relative;
        width: 100%;

        & > div {
            padding: 4rem 4rem 3rem 4rem;
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
            
            &::placeholder {
                color: rgba($color-helper-7, .5); 
            }
        }

        &-content {
            border: 1px solid $color-7;
            clear: both;
            font-size: 1.6rem;
            height: calc( 100vh - 28rem);
            margin: 1rem 0;
            min-height: 320px;
            padding: 1rem 2rem;
            width: 100%;
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
            background: $color-10;
        }
    }

    #post-stats-button {
        bottom: 3.2rem;
        left: 3.2rem;
        position: absolute;
        text-align: center;
        width: 155px;
        z-index: 101;
    }

    #post-preview-button {
        padding-left: 2.4rem;
        text-align: center;
        width: 155px;
    }
}

/*
 * Windows & linux adjustments
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

body[data-os="linux"] {
    .post-editor {
        .appbar {
            height: 0!important;
        }

        .topbar {
            height: 0;
        }

        &-topbar {
            top: 0;
        }
    }
}

/*
 * Special styles for win & linux
 */

body[data-os="win"] {
    .post-editor-wrapper {
        height: calc(100vh - 2px);
        padding-top: 9.2rem;
    }

    .post-editor-form {
        height: calc(100vh - 9.2rem);

        &-content {
            height: calc( 100vh - 29rem );
        }

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
    .post-editor-wrapper {
        height: calc(100vh - 2px);
        padding-top: 5.6rem;
    }

    .post-editor-form {
        height: calc(100vh - 5.6rem);

        &-content {
            height: calc( 100vh - 24.8rem );
        }

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
    .post-editor-topbar {
        padding: 0 3.6rem 0 4rem;
    }
    
    .post-editor-form {
        & > div {
            padding: 3rem 3rem 3rem 4rem;
        }

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
