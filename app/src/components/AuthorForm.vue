<template>
    <div 
        :key="'author-view-' + authorData.id"
        :data-animate="formAnimation ? 'true' : 'false'"
        class="options-sidebar-wrapper">
        <div class="options-sidebar">
            <h2>
                <template v-if="authorData.id">Edit author</template>
                <template v-if="!authorData.id">Add new author</template>
            </h2>

           <span
                class="options-sidebar-close"
                name="sidebar-close"
                @click.prevent="close()">
                &times;
            </span>

            <div class="author-settings-wrapper">
                <div
                    :class="{ 'author-settings-header': true, 'is-open': openedItem === 'basic' }"
                    @click="openItem('basic')">
                    <icon
                        class="author-settings-icon"
                        size="s"
                        name="sidebar-status"/>

                    <span class="author-settings-label">Basic information</span>
                </div>

                <div
                    class="author-settings"
                    style="max-height: none;"
                    ref="basic-content-wrapper">
                    <div 
                        class="author-settings-content"
                        ref="basic-content">
                        <label :class="{ 'is-invalid': errors.indexOf('name') > -1 }">
                            <span>Name:</span>
                            <input
                                v-model="authorData.name"
                                @keyup="cleanError('name')"
                                :spellcheck="$store.state.currentSite.config.spellchecking"
                                type="text">
                        </label>

                        <label>
                            <span>Description:</span>
                            <text-area
                                v-model="authorData.description"
                                :rows="4"></text-area>
                        </label>

                        <label :class="{ 'is-invalid': errors.indexOf('email') > -1 }">
                            <span>E-mail:</span>
                            <input
                                v-model="authorData.email"
                                @keyup="emailChanged"
                                spellcheck="false"
                                type="text">
                        </label>

                        <label>
                            <span>Website:</span>
                            <input
                                v-model="authorData.website"
                                spellcheck="false"
                                type="text">
                        </label>
                    </div>
                </div>
            </div>

            <div class="author-settings-wrapper">
                <div
                    :class="{ 'author-settings-header': true, 'is-open': openedItem === 'image' }"
                    @click="openItem('image')">
                    <icon
                        class="author-settings-icon"
                        size="s"
                        name="sidebar-image"/>

                    <span class="author-settings-label">Avatar and Featured image</span>
                </div>

                <div
                    class="author-settings"
                    ref="image-content-wrapper">
                    <div 
                        class="author-settings-content"
                        ref="image-content">
                        <label>
                            <span>Avatar:</span>
                            <image-upload
                                slot="field"
                                type="small"
                                id="author"
                                ref="author-avatar"
                                :onRemove="avatarRemoved"
                                v-model="authorData.avatar" />
                        </label>

                        <label class="use-gravatar">
                            <switcher
                                slot="field"
                                id="use-gravatar"
                                @click.native="toggleGravatar"
                                v-model="authorData.useGravatar" />
                            <small>
                                Use <a href="https://gravatar.com/" target="_blank">Gravatar </a> to provide your author avatar
                            </small>
                        </label>

                        <div>
                            <label class="no-margin">Featured image:</label>
                            <div 
                                v-if="!currentThemeHasSupportForAuthorImages"
                                slot="note"
                                class="msg msg-small msg-icon msg-alert">
                                <icon name="warning" size="m" />       
                                <p>Your theme does not support featured images for authors.</p>
                            </div>
                            <label>
                                <image-upload
                                    slot="field"
                                    type="small"
                                    id="featured-image"
                                    :item-id="authorData.id"
                                    ref="author-featured-image"
                                    imageType="authorImages"
                                    :onRemove="() => { hasFeaturedImage = false }"
                                    :onAdd="() => { hasFeaturedImage = true } "
                                    v-model="authorData.additionalData.featuredImage" />

                                <div
                                    v-if="hasFeaturedImage"
                                    class="image-uploader-settings-form">
                                    <label>Alternative text
                                        <text-input
                                            ref="featured-image-alt"
                                            :spellcheck="$store.state.currentSite.config.spellchecking"
                                            v-model="authorData.additionalData.featuredImageAlt" />
                                    </label>

                                    <label>Caption
                                        <text-input
                                            ref="featured-image-caption"
                                            :spellcheck="$store.state.currentSite.config.spellchecking"
                                            v-model="authorData.additionalData.featuredImageCaption" />
                                    </label>

                                    <label>Credits
                                        <text-input
                                            ref="featured-image-credits"
                                            :spellcheck="$store.state.currentSite.config.spellchecking"
                                            v-model="authorData.additionalData.featuredImageCredits" />
                                    </label>
                                </div>
                            </label>
                        </div>
                    </div>
                </div>
            </div>

            <div class="author-settings-wrapper">
                <div
                    :class="{ 'author-settings-header': true, 'is-open': openedItem === 'seo' }"
                    @click="openItem('seo')">
                    <icon
                        class="author-settings-icon"
                        size="s"
                        name="sidebar-seo"/>

                    <span class="author-settings-label">SEO</span>
                </div>

                <div
                    class="author-settings"
                    ref="seo-content-wrapper">
                    <div 
                        class="author-settings-content"
                        ref="seo-content">
                        <label :class="{ 'is-invalid': errors.indexOf('slug') > -1 }">
                            <span>Slug:</span>
                            <input
                                v-model="authorData.username"
                                @keyup="cleanError('slug')"
                                spellcheck="false"
                                type="text">
                        </label>

                        <label class="with-char-counter">
                            <span>Page title:</span>
                            <text-input
                                v-model="authorData.metaTitle"
                                type="text"
                                :spellcheck="$store.state.currentSite.config.spellchecking"
                                :placeholder="metaFieldAttrs"
                                :disabled="!metaOptionsActive"
                                :readonly="!metaOptionsActive"
                                :charCounter="metaOptionsActive"
                                :preferredCount="70" />
                        </label>

                        <label class="with-char-counter">
                            <span>Meta Description:</span>
                            <text-area
                                v-model="authorData.metaDescription"
                                :placeholder="metaFieldAttrs"
                                :disabled="!metaOptionsActive"
                                :readonly="!metaOptionsActive"
                                :charCounter="metaOptionsActive"
                                :spellcheck="$store.state.currentSite.config.spellchecking"
                                :preferredCount="160"></text-area>
                        </label>
                    </div>
                </div>
            </div>

            <div class="author-settings-wrapper">
                <div
                    :class="{ 'author-settings-header': true, 'is-open': openedItem === 'other' }"
                    @click="openItem('other')">
                    <icon
                        class="author-settings-icon"
                        size="s"
                        name="sidebar-options"/>

                    <span class="author-settings-label">Other options</span>
                </div>

                <div
                    class="author-settings"
                    ref="other-content-wrapper">
                    <div 
                        class="author-settings-content"
                        ref="other-content">
                        <label>
                            <span>Custom template:</span>
                            <dropdown
                                v-if="currentThemeHasAuthorTemplates"
                                ref="template"
                                id="template"
                                v-model="authorData.template"
                                :items="authorTemplates"></dropdown>

                            <text-input
                                v-if="!currentThemeHasAuthorTemplates"
                                slot="field"
                                id="template"
                                placeholder="Not available in your theme"
                                :spellcheck="false"
                                :disabled="true"
                                :readonly="true" />
                        </label>
                    </div>
                </div>
            </div>

            <div class="options-sidebar-buttons">
                <p-button
                    type="secondary" 
                    @click.native="save(false)">
                    <template v-if="authorData.id">Save Changes</template>
                    <template v-if="!authorData.id">Add new author</template>
                </p-button>

                <p-button
                    :disabled="!authorData.id || !currentThemeHasSupportForAuthorPages"
                    type="primary" 
                    class="author-settings-preview-button"
                    @click.native="saveAndPreview">
                    Save &amp; Preview 
                    <span>
                        <icon
                            size="s"
                            name="quick-preview"/>
                    </span>
                </p-button>

                <p-button
                    @click.native="close"
                    type="outline">
                    Cancel
                </p-button>
            </div>

            <small 
                v-if="!currentThemeHasSupportForAuthorPages"
                class="note">
                The "Save &amp; Preview" option is not available due to lack of support for author pages in your theme.
            </small>
        </div>
    </div>
</template>

<script>
import { ipcRenderer, remote } from 'electron';
import Utils from './../helpers/utils';
import crypto from 'crypto';
const mainProcess = remote.require('./main.js');

export default {
    name: 'author-form-sidebar',
    props: [
        'formAnimation'
    ],
    data () {
        return {
            errors: [],
            hasFeaturedImage: false,
            openedItem: 'basic',
            authorData: {
                id: 0,
                name: '',
                username: '',
                email: '',
                avatar: '',
                useGravatar: false,
                description: '',
                metaTitle: '',
                metaDescription: '',
                template: '',
                visibleIndexingOptions: false,
                additionalData: {
                    featuredImage: '',
                    featuredImageAlt: '',
                    featuredImageCaption: '',
                    featuredImageCredits: ''
                }
            }
        };
    },
    computed: {
        currentThemeHasSupportForAuthorImages () {
            return this.$store.state.currentSite.themeSettings.supportedFeatures && this.$store.state.currentSite.themeSettings.supportedFeatures.authorImages;
        },
        currentThemeHasSupportForAuthorPages () {
            return this.$store.state.currentSite.themeSettings.renderer.createAuthorPages;
        },
        metaFieldAttrs: function() {
            let text = 'Leave it blank to use a default page title';

            if(!this.metaOptionsActive) {
                text = 'To use this option, first enable indexing of author pages in SEO settings.';
            }

            return text;
        },
        metaOptionsActive: function() {
            if(
                this.$store.state.currentSite.config.advanced &&
                this.$store.state.currentSite.config.advanced.metaRobotsAuthors.indexOf('noindex') !== -1
            ) {
                return false;
            }

            return true
        },
        authorTemplates: function() {
            return this.$store.getters.authorTemplates;
        },
        currentThemeHasAuthorTemplates: function() {
            return Object.keys(this.authorTemplates).length > 1;
        }
    },
    mounted () {
        this.$bus.$on('show-author-item-editor', params => {
            try {
                if (typeof params.additionalData === 'string' && params.additionalData) {
                    params.additionalData = JSON.parse(params.additionalData);
                } else {
                    params.additionalData = {};
                }
            } catch (e) {
                console.warn('An error occurred during parsing author data for ID: ' + params.id);
                params.additionalData = {};
            }

            this.errors = [];
            this.authorData.id = params.id || 0;
            this.authorData.name = params.name || '';
            this.authorData.username = params.username || '';
            this.authorData.email = params.email || '';
            this.authorData.website = params.website || '';
            this.authorData.avatar = params.avatar || '';
            this.authorData.useGravatar = params.useGravatar || false;
            this.authorData.description = params.description || '';
            this.authorData.metaTitle = params.metaTitle || '';
            this.authorData.metaDescription = params.metaDescription || '';
            this.authorData.template = params.template || '';
            this.authorData.visibleIndexingOptions = params.visibleIndexingOptions || false;
            this.authorData.additionalData = {};
            this.authorData.additionalData.featuredImage = params.additionalData.featuredImage || '';
            this.authorData.additionalData.featuredImageAlt = params.additionalData.featuredImageAlt || '';
            this.authorData.additionalData.featuredImageCaption = params.additionalData.featuredImageCaption || '';
            this.authorData.additionalData.featuredImageCredits = params.additionalData.featuredImageCredits || '';

            if (this.authorData.additionalData && this.authorData.additionalData.featuredImage) {
                this.hasFeaturedImage = true;
            }
        });
    },
    methods: {
        save (showPreview = false) {
            if (this.authorData.username === '') {
                this.authorData.username = mainProcess.slug(this.authorData.name);
            } else {
                this.authorData.username = mainProcess.slug(this.authorData.username);
            }

            let authorData = {
                id: this.authorData.id,
                site: this.$store.state.currentSite.config.name,
                name: this.authorData.name,
                username: this.authorData.username,
                config: JSON.stringify({
                    email: this.authorData.email,
                    website: this.authorData.website,
                    avatar: this.authorData.avatar,
                    useGravatar: this.authorData.useGravatar,
                    description: this.authorData.description,
                    metaTitle: this.authorData.metaTitle,
                    metaDescription: this.authorData.metaDescription,
                    template: this.authorData.template
                }),
                additionalData: JSON.stringify(this.authorData.additionalData)
            };

            this.saveData(authorData, showPreview);
        },
        saveAndPreview () {
            this.save(true);
        },
        saveData(authorData, showPreview = false) {
            // Send form data to the back-end
            ipcRenderer.send('app-author-save', authorData);

            ipcRenderer.once('app-author-saved', (event, data) => {
                if(data.status !== false) {
                    if(authorData.id === 0) {
                        let newlyAddedAuthor = JSON.parse(JSON.stringify(data.authors.filter(author => author.id === data.authorID)[0]));
                        this.$bus.$emit('show-author-item-editor', newlyAddedAuthor);
                        this.close();
                        this.showMessage(data.message);
                    } else {
                        if (!showPreview) {
                            this.close();
                        }

                        this.showMessage('success');

                        if (showPreview) {
                            this.$bus.$emit('rendering-popup-display', {
                                authorOnly: true,
                                itemID: this.authorData.id
                            });
                        }
                    }

                    this.$store.commit('setAuthors', data.authors);
                    this.$store.commit('setPostAuthors', data.postsAuthors);
                    this.$bus.$emit('authors-list-updated');
                    return;
                }

                this.showMessage(data.message);
            });
        },
        close() {
            this.$bus.$emit('hide-author-item-editor');
            ipcRenderer.send('app-author-cancel', {
                site: this.$store.state.currentSite.config.name,
                id: this.authorData.id,
                additionalData: {
                    featuredImage: this.authorData.additionalData.featuredImage
                }
            });
        },
        showMessage(message) {
            let msg = 'New author has been created';

            if (this.authorData.id > 0) {
                msg = 'Author has been updated';
            }

            let messageConfig = {
                message: msg,
                type: 'success',
                lifeTime: 3
            };

            if(message !== 'success' && message !== 'author-added') {
                messageConfig.type = 'warning';
            }

            if (message === 'author-duplicate-name') {
                this.displayAdvancedOptions = false;
                this.errors.push('name');
                messageConfig.message = 'Provided author name is in use. Please try other author name.';
            } else if (message === 'author-duplicate-username') {
                this.displayAdvancedOptions = true;
                this.errors.push('slug');
                messageConfig.message = 'Provided author name in a similar form (case insensitive) is in use. Please try other author name.';
            } else if (message === 'author-empty-name') {
                this.displayAdvancedOptions = false;
                this.errors.push('name');
                messageConfig.message = 'Author name cannot be empty. Please try other name.';
            } else if (message === 'author-empty-email') {
                this.displayAdvancedOptions = false;
                this.errors.push('email');
                messageConfig.message = 'In order to use Gravatar service provide the author e-mail at first.';
            } else if (message === 'author-empty-username') {
                this.displayAdvancedOptions = false;
                this.errors.push('slug');
                messageConfig.message = 'Author slug cannot be empty';
            }

            this.$bus.$emit('message-display', messageConfig);
        },
        cleanError (field) {
            let pos = this.errors.indexOf(field);

            if (pos !== -1) {
                this.errors.splice(pos, 1);
            }
        },
        toggleGravatar () {
            if (this.authorData.useGravatar === false) {
                this.authorData.avatar = '';
            } else {
                if (this.authorData.email.trim() !== '') {
                    this.getGravatar();
                } else {
                    setTimeout(() => {
                        this.errors.push('email');
                        this.authorData.useGravatar = false;
                        this.$bus.$emit('message-display', {
                            message: 'Enter the email address you used for registering your account on Gravatar.',
                            type: 'warning',
                            lifeTime: 3
                        });
                    }, 100);
                }
            }
        },
        emailChanged () {
            this.cleanError('email');

            if (!this.authorData.useGravatar) {
                return;
            }

            this.getGravatar();
        },
        getGravatar: Utils.debouncedFunction(function() {
            let avatarPath = 'https://www.gravatar.com/avatar/' + this.md5(this.authorData.email) + '?s=240';
            this.authorData.avatar = avatarPath;
        }, 1000),
        md5 (value) {
            return crypto.createHash('md5').update(value).digest("hex");
        },
        avatarRemoved () {
            this.authorData.useGravatar = false;
        },
        openItem (itemName) {
            if (this.openedItem === itemName) {
                this.closeItem();
                return;
            }

            this.closeItem();
            this.openedItem = itemName;
            let contentWrapper = this.$refs[this.openedItem + '-content-wrapper'];
            let content = this.$refs[this.openedItem + '-content'];
            contentWrapper.style.maxHeight = content.clientHeight + "px";

            setTimeout(function() {
                contentWrapper.style.maxHeight = 'none';
            }, 300);
        },
        closeItem () {
            if (this.openedItem === '') {
                return;
            }

            let contentWrapper = this.$refs[this.openedItem + '-content-wrapper'];
            let content = this.$refs[this.openedItem + '-content'];
            this.openedItem = '';

            if (content.classList.contains('post-editor-settings-content-tags')) {
                contentWrapper.style.overflow = 'hidden';
            }

            contentWrapper.style.maxHeight = content.clientHeight + "px";

            setTimeout(function () {
                contentWrapper.style.maxHeight = 0;
            }, 50);
        }
    },
    beforeDestroy () {
        this.$bus.$off('show-author-item-editor');
    }
}
</script>

<style lang="scss" scoped>
@import '../scss/variables.scss';
@import '../scss/options-sidebar.scss';
@import '../scss/notifications.scss';
    
.options-sidebar {
    .use-gravatar {
        font-size: 1.6rem;
        font-weight: 400;
        margin-bottom: 2rem;
    }
}

.author-settings {
    max-height: 0;
    overflow: hidden;
    transition: max-height .25s ease-out;

    &-content {
        padding: 0 0 3.6rem;

        .image-uploader {
            margin-top: 0;
        }

        .msg {
            margin: 0 0 2rem;
        }
    }

    &-wrapper {
        &:first-of-type {
            .author-settings-header {
                border-top: none;
            }
        }
    }

    &-header {
        align-items: center;               
        border-top: 1px solid var(--input-border-color);     
        color: var(--link-tertiary-color);
        cursor: pointer;
        display: flex;
        height: 6.4rem;
        margin-left: 0;
        margin-top: -1px;
        padding: 0;
        position: relative;
        transition: var(--transition);
        user-select: none;
        width: 100%;

        &:hover {
            color: var(--link-tertiary-hover-color);                    
        }

        &.is-open {
            .author-settings {
                &-label {
                    left: -3.6rem;
                }

                &-icon {
                    left: -1.6rem;
                    position: relative;
                    opacity: 0;
                }
            }
        }
    }

    &-label {                
        font-weight: 600;
        left: 0;
        position: relative;
        transition: left .25s ease-out, color .0s ease-out;
        width: calc(100% - 5.8rem);

        &-warning {
            color: var(--warning);
            font-size: 1.2rem;
            margin-left: 1rem;
        }
    }

    &-icon {
        fill: var(--primary-color); 
        left: 0;
        height: 2.4rem;
        margin-right: 1.6rem;
        opacity: 1;
        position: relative;
        transition: var(--transition);
        width: 2.4rem;
    }

    &-preview-button {
        display: inline-flex; 

        & > span {
            align-self: center;
            display: flex; 
            margin-left: 1rem;
        }
    }

    label {
        color: var(--label-color);
        display: block;
        font-size: 1.5rem;
        font-weight: 500;
        line-height: 2.6;
        margin: 0 0 1.2rem 0;

        input[type="text"],
        input[type="number"],
        select,
        textarea {
            background-color: var(--input-bg);
            width: 100%;
        }

        textarea {
            height: 100px;
        }

        &.with-char-counter {
            .note {
                margin-top: -3rem;
                width: 70%;
            }
        }

        &.no-margin {
            margin: 0;
        }
    }            
}

.note {
    display: block;
    font-style: italic;
    line-height: 1.4;
    margin: 2rem 0;
}
</style>
