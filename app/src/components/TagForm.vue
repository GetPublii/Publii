<template>
    <div 
        :key="'tag-view-' + tagData.id"
        class="options-sidebar-wrapper">
        <div class="options-sidebar">
            <h2>
                <template v-if="tagData.id">Edit tag</template>
                <template v-if="!tagData.id">Add new tag</template>
            </h2>
            
            <span
                class="options-sidebar-close"
                name="sidebar-close"
                @click.prevent="close()">
                &times;
            </span>

            <div class="tag-settings-wrapper">
                <div
                    :class="{ 'tag-settings-header': true, 'is-open': openedItem === 'basic' }"
                    @click="openItem('basic')">
                    <icon
                        class="tag-settings-icon"
                        size="s"
                        name="sidebar-status"/>

                    <span class="tag-settings-label">Basic information</span>
                </div>

                <div
                    class="tag-settings"
                    style="max-height: none;"
                    ref="basic-content-wrapper">
                    <div 
                        class="tag-settings-content"
                        ref="basic-content">
                        <label :class="{ 'is-invalid': errors.indexOf('name') > -1 }">
                            <span>Name:</span>
                            <input
                                v-model="tagData.name"
                                :spellcheck="$store.state.currentSite.config.spellchecking"
                                @keyup="cleanError('name')"
                                type="text">
                        </label>

                        <label>
                            <span>Description:</span>
                            <text-area
                                v-model="tagData.description"
                                :spellcheck="$store.state.currentSite.config.spellchecking"
                                :rows="4"></text-area>
                        </label>
                    </div>
                </div>
            </div>

            <div class="tag-settings-wrapper">
                <div
                    :class="{ 'tag-settings-header': true, 'is-open': openedItem === 'image' }"
                    @click="openItem('image')">
                    <icon
                        class="tag-settings-icon"
                        size="s"
                        name="sidebar-image"/>

                    <span class="tag-settings-label">Featured image</span>
                </div>

                <div
                    class="tag-settings"
                    ref="image-content-wrapper">
                    <div 
                        class="tag-settings-content"
                        ref="image-content">
                        <label>
                            <image-upload
                                slot="field"
                                type="small"
                                id="featured-image"
                                :item-id="tagData.id"
                                ref="tag-featured-image"
                                imageType="tagImages"
                                :onRemove="() => { hasFeaturedImage = false }"
                                :onAdd="() => { hasFeaturedImage = true } "
                                v-model="tagData.additionalData.featuredImage" />

                            <small 
                                v-if="!currentThemeHasSupportForTagImages"
                                slot="note"
                                class="note not-supported">
                                Your theme does not support featured images for tags.
                            </small>

                            <div
                                v-if="hasFeaturedImage"
                                class="image-uploader-settings-form">
                                <label>Alternative text
                                    <text-input
                                        ref="featured-image-alt"
                                        :spellcheck="$store.state.currentSite.config.spellchecking"
                                        v-model="tagData.additionalData.featuredImageAlt" />
                                </label>

                                <label>Caption
                                    <text-input
                                        ref="featured-image-caption"
                                        :spellcheck="$store.state.currentSite.config.spellchecking"
                                        v-model="tagData.additionalData.featuredImageCaption" />
                                </label>

                                <label>Credits
                                    <text-input
                                        ref="featured-image-credits"
                                        :spellcheck="$store.state.currentSite.config.spellchecking"
                                        v-model="tagData.additionalData.featuredImageCredits" />
                                </label>
                            </div>
                        </label>
                    </div>
                </div>
            </div>

            <div class="tag-settings-wrapper">
                <div
                    :class="{ 'tag-settings-header': true, 'is-open': openedItem === 'seo' }"
                    @click="openItem('seo')">
                    <icon
                        class="tag-settings-icon"
                        size="s"
                        name="sidebar-seo"/>

                    <span class="tag-settings-label">SEO</span>
                </div>

                <div
                    class="tag-settings"
                    ref="seo-content-wrapper">
                    <div 
                        class="tag-settings-content"
                        ref="seo-content">
                        <label :class="{ 'is-invalid': errors.indexOf('slug') > -1 }">
                            <span>Slug:</span>
                            <input
                                v-model="tagData.slug"
                                @keyup="cleanError('slug')"
                                spellcheck="false"
                                type="text">
                        </label>

                        <label class="with-char-counter">
                            <span>Page Title:</span>
                            <text-input
                                v-model="tagData.additionalData.metaTitle"
                                type="text"
                                :spellcheck="$store.state.currentSite.config.spellchecking"
                                :placeholder="metaFieldAttrs"
                                :disabled="!metaOptionsActive"
                                :readonly="!metaOptionsActive"
                                :charCounter="metaOptionsActive"
                                :preferredCount="70" />
                        </label>

                        <label class="with-char-counter">
                            <span>Meta Description</span>
                            <text-area
                                v-model="tagData.additionalData.metaDescription"
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

            <div class="tag-settings-wrapper">
                <div
                    :class="{ 'tag-settings-header': true, 'is-open': openedItem === 'other' }"
                    @click="openItem('other')">
                    <icon
                        class="tag-settings-icon"
                        size="s"
                        name="sidebar-options"/>

                    <span class="tag-settings-label">Other options</span>
                </div>

                <div
                    class="tag-settings"
                    ref="other-content-wrapper">
                    <div 
                        class="tag-settings-content"
                        ref="other-content">
                        <label>
                            <span>Custom template:</span>
                            <dropdown
                                v-if="currentThemeHasTagTemplates"
                                ref="template"
                                id="template"
                                v-model="tagData.additionalData.template"
                                :items="tagTemplates"></dropdown>

                            <text-input
                                v-if="!currentThemeHasTagTemplates"
                                slot="field"
                                id="template"
                                :spellcheck="false"
                                placeholder="Not available in your theme"
                                :disabled="true"
                                :readonly="true" />
                        </label>
                    </div>
                </div>
            </div>

            <div class="options-sidebar-buttons">
                <p-button
                    type="primary"
                    @click.native="save">
                    <template v-if="tagData.id">Save changes</template>
                    <template v-if="!tagData.id">Add new tag</template>
                </p-button>

                <p-button
                    @click.native="close"
                    type="outline">
                    Cancel
                </p-button>
            </div>
        </div>
    </div>
</template>

<script>
import { ipcRenderer, remote } from 'electron';
const mainProcess = remote.require('./main.js');

export default {
    name: 'options-sidebar',
    data: function() {
        return {
            errors: [],
            hasFeaturedImage: false,
            openedItem: 'basic',
            tagData: {
                id: 0,
                name: '',
                slug: '',
                description: '',
                additionalData: {
                    featuredImage: '',
                    featuredImageAlt: '',
                    featuredImageCaption: '',
                    featuredImageCredits: '',
                    metaTitle: '',
                    metaDescription: '',
                    template: ''
                }
            }
        };
    },
    computed: {
        currentThemeHasSupportForTagImages () {
            return this.$store.state.currentSite.themeSettings.supportedFeatures && this.$store.state.currentSite.themeSettings.supportedFeatures.tagImages;
        },
        metaFieldAttrs: function() {
            let text = 'Leave it blank to use a default page title';

            if(!this.metaOptionsActive) {
                text = 'To use this option, first enable indexing of tag pages in SEO settings.';
            }

            return text;
        },
        metaOptionsActive: function() {
            if(
                this.$store.state.currentSite.config.advanced &&
                this.$store.state.currentSite.config.advanced.metaRobotsTags.indexOf('noindex') !== -1
            ) {
                return false;
            }

            return true
        },
        tagTemplates: function() {
            return this.$store.getters.tagTemplates;
        },
        currentThemeHasTagTemplates: function() {
            return Object.keys(this.tagTemplates).length > 1;
        }
    },
    mounted () {
        this.$bus.$on('show-tag-item-editor', params => {
            try {
                if (typeof params.additionalData === 'string') {
                    params.additionalData = JSON.parse(params.additionalData);
                }
            } catch (e) {
                console.warn('An error occurred during parsing tag data for ID: ' + params.id);
            }

            this.errors = [];
            this.tagData.id = params.id || 0;
            this.tagData.name = params.name || '';
            this.tagData.slug = params.slug || '';
            this.tagData.description = params.description || '';
            this.tagData.additionalData = {};
            this.tagData.additionalData.featuredImage = params.additionalData.featuredImage || '';
            this.tagData.additionalData.featuredImageAlt = params.additionalData.featuredImageAlt || '';
            this.tagData.additionalData.featuredImageCaption = params.additionalData.featuredImageCaption || '';
            this.tagData.additionalData.featuredImageCredits = params.additionalData.featuredImageCredits || '';
            this.tagData.additionalData.metaTitle = params.additionalData.metaTitle || '';
            this.tagData.additionalData.metaDescription = params.additionalData.metaDescription || '';
            this.tagData.additionalData.template = params.additionalData.template || '';

            if (this.tagData.additionalData.featuredImage) {
                this.hasFeaturedImage = true;
            }
        });
    },
    methods: {
        save() {
            if (this.tagData.slug.trim() === '' && this.tagData.name.trim() !== '') {
                this.tagData.slug = mainProcess.slug(this.tagData.name);
            } else {
                this.tagData.slug = mainProcess.slug(this.tagData.slug);
            }

            if (!this.validate()) {
                return;
            }

            let tagData = Object.assign({}, this.tagData);
            tagData.site = this.$store.state.currentSite.config.name;

            this.saveData(tagData);
        },
        validate () {
            if (this.tagData.name.trim() === '') {
                this.errors.push('name');
            }

            if (this.tagData.slug.trim() === '') {
                this.errors.push('slug');
            }

            if (this.errors.length) {
                this.$bus.$emit('message-display', {
                    message: 'Please fill all required fields',
                    type: 'warning',
                    lifeTime: 3
                });
            }

            return this.errors.length === 0;
        },
        cleanError (field) {
            let pos = this.errors.indexOf(field);

            if (pos !== -1) {
                this.errors.splice(pos, 1);
            }
        },
        saveData(tagData) {
            ipcRenderer.send('app-tag-save', tagData);

            ipcRenderer.once('app-tag-saved', (event, data) => {
                if(data.status !== false) {
                    if(this.tagData.id === 0) {
                        this.close();
                        this.showMessage(data.message);
                    } else {
                        this.close();
                        this.showMessage('success');
                    }

                    this.$store.commit('setTags', data.tags);
                    this.$bus.$emit('tags-list-updated');
                    return;
                }

                this.showMessage(data.message);
            });
        },
        close() {
            this.$bus.$emit('hide-tag-item-editor');
        },
        showMessage(message) {
            let messageConfig = {
                message: 'New tag has been created',
                type: 'success',
                lifeTime: 3
            };

            if (this.tagData.id > 0) {
                messageConfig.message = 'Tag has been edited';
            }

            if(message !== 'success' && message !== 'tag-added') {
                messageConfig.type = 'warning';
            }

            if(message === 'tag-duplicate-name') {
                this.errors.push('name');
                messageConfig.message = 'Provided tag name is in use. Please try other tag name.';
            } else if(message === 'tag-duplicate-slug') {
                this.errors.push('slug');
                messageConfig.message = 'Provided tag name in a similar form (case insensitive) is in use. Please try other tag name.';
            } else if(message === 'tag-empty-name') {
                this.errors.push('name');
                messageConfig.message = 'Tag name cannot be empty. Please try other name.';
            } else if(message === 'tag-restricted-slug') {
                this.errors.push('slug');
                messageConfig.message = 'Selected tag name/slug is not allowed.';
            }

            this.$bus.$emit('message-display', messageConfig);
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
        this.$bus.$off('show-tag-item-editor');
    }
}
</script>

<style lang="scss" scoped>
@import '../scss/variables.scss';
@import '../scss/options-sidebar.scss';

.note.not-supported {
    color: var(--warning);
    font-style: italic;
}

.tag-settings {
    max-height: 0;
    overflow: hidden;
    transition: max-height .25s ease-out;

    &-content {
        padding: 0 0 3.6rem;

        .image-uploader {
            margin-top: 0;
        }
    }

    &-wrapper {
        &:first-of-type {
            .tag-settings-header {
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
            .post-editor-settings {
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
    }            
}
</style>
