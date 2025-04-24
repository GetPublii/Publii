<template>
    <div
        :key="'tag-view-' + tagData.id"
        :data-animate="formAnimation ? 'true' : 'false'"
        class="options-sidebar-container">
        <div class="options-sidebar">
            <h2>
                <template v-if="tagData.id">{{ $t('tag.editTag') }}</template>
                <template v-if="!tagData.id">{{ $t('tag.addNewTag') }}</template>
            </h2>

            <span
                class="options-sidebar-close"
                name="sidebar-close"
                @click.prevent="close()">
                &times;
            </span>

             <div
                v-if="!currentThemeHasSupportForTagPages"
                slot="note"
                class="msg msg-small msg-icon msg-alert">
                <icon name="warning" size="m" />
                <p>{{ $t('settings.themeDoesNotSupportTagPages') }}</p>
            </div>

            <div class="options-sidebar-item">
                <div
                    :class="{ 'options-sidebar-header': true, 'is-open': openedItem === 'basic' }"
                    @click="openItem('basic')">
                    <icon
                        class="options-sidebar-icon"
                        size="s"
                        name="sidebar-status"/>

                    <span class="options-sidebar-label">{{ $t('ui.basicInformation') }}</span>
                </div>

                <div
                    class="tag-settings"
                    style="max-height: none;"
                    ref="basic-content-wrapper">
                    <div
                        class="tag-settings-content"
                        ref="basic-content">
                        <label :class="{ 'is-invalid': errors.indexOf('name') > -1 }">
                            <span>{{ $t('ui.name') }}:</span>
                            <input
                                v-model="tagData.name"
                                :spellcheck="$store.state.currentSite.config.spellchecking"
                                @keyup="cleanError('name')"
                                type="text">
                        </label>

                        <label>
                            <span>{{ $t('ui.description') }}:</span>
                            <text-area
                                v-model="tagData.description"
                                :wysiwyg="true"
                                :miniEditorMode="true"
                                :simplifiedToolbar="true"
                                :rows="4"></text-area>
                        </label>

                        <label class="tag-settings-hidden">
                            <switcher
                                :key="'is-hidden-tag-' + tagData.id"
                                id="is-hidden"
                                v-model="tagData.additionalData.isHidden"
                                @click.native="toggleHiddenStatus" />
                            <icon
                                    :title="$t('post.hidePost')"
                                    class="switcher-item-icon-helper"
                                    name="hidden-post"
                                    size="xs"
                                    strokeColor="color-6" />
                            <span :title="$t('tag.tagWillNotAppearInGeneratedTagLists')">
                                {{ $t('tag.hideTag') }}
                            </span>
                        </label>
                    </div>
                </div>
            </div>

            <div class="options-sidebar-item">
                <div
                    :class="{ 'options-sidebar-header': true, 'is-open': openedItem === 'image' }"
                    @click="openItem('image')">
                    <icon
                        class="options-sidebar-icon"
                        size="s"
                        name="sidebar-image"/>

                    <span class="options-sidebar-label">{{ $t('ui.featuredImage') }}</span>
                </div>

                <div
                    class="tag-settings"
                    ref="image-content-wrapper">
                    <div
                        class="tag-settings-content"
                        ref="image-content">
                        <div
                            v-if="!currentThemeHasSupportForTagImages"
                            slot="note"
                            class="msg msg-small msg-icon msg-alert"><icon name="warning" size="m" />
                            <p>{{ $t('tag.noSupportFoFeaturedImagesForTags') }}</p>
                        </div>
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


                            <div
                                v-if="hasFeaturedImage"
                                class="image-uploader-settings-form">
                                <label>{{ $t('ui.alternativeText') }}
                                    <text-input
                                        ref="featured-image-alt"
                                        :spellcheck="$store.state.currentSite.config.spellchecking"
                                        v-model="tagData.additionalData.featuredImageAlt" />
                                </label>

                                <label>{{ $t('ui.caption') }}
                                    <text-input
                                        ref="featured-image-caption"
                                        :spellcheck="$store.state.currentSite.config.spellchecking"
                                        v-model="tagData.additionalData.featuredImageCaption" />
                                </label>

                                <label>{{ $t('ui.credits') }}
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

            <div class="options-sidebar-item">
                <div
                    :class="{ 'options-sidebar-header': true, 'is-open': openedItem === 'seo' }"
                    @click="openItem('seo')">
                    <icon
                        class="options-sidebar-icon"
                        size="s"
                        name="sidebar-seo"/>

                    <span class="options-sidebar-label">{{ $t('ui.seo') }}</span>
                </div>

                <div
                    class="tag-settings"
                    ref="seo-content-wrapper">
                    <div
                        class="tag-settings-content"
                        ref="seo-content">
                        <label :class="{ 'is-invalid': errors.indexOf('slug') > -1 }">
                            <span>{{ $t('ui.slug') }}:</span>
                            <div class="options-sidebar-item-slug">
                                <input
                                    v-model="tagData.slug"
                                    @keyup="cleanError('slug')"
                                    spellcheck="false"
                                    type="text">
                                <p-button 
                                    :onClick="updateSlug" 
                                    :title="$t('ui.updateSlug')"
                                    icon="refresh"
                                    type="secondary icon">
                                </p-button>
                            </div>
                        </label>

                        <label class="with-char-counter">
                            <span>{{ $t('ui.pageTitle') }}:</span>
                            <text-input
                                v-model="tagData.additionalData.metaTitle"
                                type="text"
                                :spellcheck="$store.state.currentSite.config.spellchecking"
                                :placeholder="$t('ui.leaveBlankToUseDefaultPageTitle')"
                                :charCounter="true"
                                :preferredCount="70" />
                        </label>

                        <label class="with-char-counter">
                            <span>{{ $t('ui.metaDescription') }}:</span>
                            <text-area
                                v-model="tagData.additionalData.metaDescription"
                                :placeholder="$t('ui.leaveBlankToUseDefaultPageTitle')"
                                :charCounter="true"
                                :spellcheck="$store.state.currentSite.config.spellchecking"
                                :preferredCount="160"></text-area>
                        </label>

                        <label>
                            {{ $t('ui.metaRobotsIndex') }}:
                            <dropdown
                                v-if="!tagData.additionalData.canonicalUrl"
                                id="tag-meta-robots"
                                v-model="tagData.additionalData.metaRobots"
                                :items="metaRobotsOptions">
                            </dropdown>
                            <div v-else>
                                <small>{{ $t('ui.ifCanonicalUrlIsSetMetaRobotsTagIsIgnored') }}</small>
                            </div>
                        </label>

                        <label>
                            {{ $t('ui.canonicalURL') }}:
                            <input
                                type="text"
                                v-model="tagData.additionalData.canonicalUrl"
                                spellcheck="false"
                                :placeholder="$t('tag.leaveBlankToUseDefaultTagPageURL')" />
                        </label>
                    </div>
                </div>
            </div>

            <div class="options-sidebar-item">
                <div
                    :class="{ 'options-sidebar-header': true, 'is-open': openedItem === 'other' }"
                    @click="openItem('other')">
                    <icon
                        class="options-sidebar-icon"
                        size="s"
                        name="sidebar-options"/>

                    <span class="options-sidebar-label">{{ $t('ui.otherOptions') }}</span>
                </div>

                <div
                    class="tag-settings"
                    ref="other-content-wrapper">
                    <div
                        class="tag-settings-content"
                        ref="other-content">
                        <label>
                            <span>{{ $t('ui.customTemplate') }}:</span>
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
                                :placeholder="$t('ui.notAvailableInYourTheme')"
                                :disabled="true"
                                :readonly="true" />
                        </label>

                        <template v-if="dataSet">
                            <template v-for="(field, index) of tagViewThemeSettings">
                                <separator
                                    v-if="displayField(field) && field.type === 'separator'"
                                    :label="field.label"
                                    :is-line="true"
                                    :key="'tag-view-field-' + index"
                                    :note="field.note" />

                                <label
                                    v-if="displayField(field) && field.type !== 'separator'"
                                    :key="'tag-view-field-' + index">
                                    {{ field.label }}

                                    <dropdown
                                        v-if="!field.type || field.type === 'select'"
                                        :id="field.name + '-select'"
                                        class="tag-view-settings"
                                        v-model="tagData.additionalData.viewConfig[field.name]"
                                        :items="generateItems(field.options)">
                                        <option slot="first-choice" value="">{{ $t('settings.useGlobalConfiguration') }}</option>
                                    </dropdown>

                                    <text-input
                                        v-if="field.type === 'text' || field.type === 'number'"
                                        :type="field.type"
                                        class="tag-view-settings"
                                        :spellcheck="$store.state.currentSite.config.spellchecking"
                                        :placeholder="fieldPlaceholder(field)"
                                        v-model="tagData.additionalData.viewConfig[field.name]" />

                                    <text-area
                                        v-if="field.type === 'textarea'"
                                        class="tag-view-settings"
                                        :placeholder="fieldPlaceholder(field)"
                                        :spellcheck="$store.state.currentSite.config.spellchecking"
                                        v-model="tagData.additionalData.viewConfig[field.name]" />

                                    <color-picker
                                        v-if="field.type === 'colorpicker'"
                                        class="tag-view-settings"
                                        v-model="tagData.additionalData.viewConfig[field.name]"
                                        :outputFormat="field.outputFormat ? field.outputFormat : 'RGBAorHEX'">
                                    </color-picker>

                                    <image-upload
                                        v-if="field.type === 'image'"
                                        class="tag-view-settings"
                                        v-model="tagData.additionalData.viewConfig[field.name]"
                                        :item-id="tagData.id"
                                        imageType="tagImages" />

                                    <small
                                        v-if="field.note"
                                        class="note">
                                        {{ field.note }}
                                    </small>
                                </label>
                            </template>
                        </template>
                    </div>
                </div>
            </div>

            <div class="options-sidebar-buttons">
                <p-button
                    type="secondary"
                    @click.native="save(false)">
                    <template v-if="tagData.id">{{ $t('ui.saveChanges') }}</template>
                    <template v-if="!tagData.id">{{ $t('tag.addNewTag') }}</template>
                </p-button>

                <p-button
                    :disabled="!tagData.id || currentTagIsHidden || !currentThemeHasSupportForTagPages"
                    type="primary"
                    class="options-sidebar-preview-button"
                    @click.native="saveAndPreview">
                    {{ $t('ui.saveAndPreview') }}
                    <span>
                        <icon
                            size="s"
                            name="quick-preview"/>
                    </span>
                </p-button>

                <p-button
                    @click.native="close"
                    type="outline">
                    {{ $t('ui.cancel') }}
                </p-button>
            </div>

        </div>
    </div>
</template>

<script>
import Vue from 'vue';

export default {
    name: 'tag-form-sidebar',
    props: [
        'formAnimation'
    ],
    data: function() {
        return {
            errors: [],
            hasFeaturedImage: false,
            openedItem: 'basic',
            currentTagIsHidden: false,
            dataSet: false,
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
                    isHidden: false,
                    metaTitle: '',
                    metaDescription: '',
                    metaRobots: '',
                    canonicalUrl: '',
                    template: ''
                }
            }
        };
    },
    computed: {
        currentThemeHasSupportForTagImages () {
            return this.$store.state.currentSite.themeSettings.supportedFeatures && this.$store.state.currentSite.themeSettings.supportedFeatures.tagImages;
        },
        currentThemeHasSupportForTagPages () {
            if (this.$store.state.currentSite.themeSettings.supportedFeatures && this.$store.state.currentSite.themeSettings.supportedFeatures.tagPages === false) {
                return false;
            }

            return this.$store.state.currentSite.themeSettings.renderer.createTagPages;
        },
        tagTemplates: function() {
            return this.$store.getters.tagTemplates;
        },
        currentThemeHasTagTemplates: function() {
            return Object.keys(this.tagTemplates).length > 1;
        },
        metaRobotsOptions () {
            return {
                '': this.$t('settings.useSiteGlobalSettings'),
                'index, follow': this.$t('ui.indexFollow'),
                'index, nofollow': this.$t('ui.indexNofollow'),
                'index, follow, noarchive': this.$t('ui.indexFollowNoArchive'),
                'index, nofollow, noarchive': this.$t('ui.indexNofollowNoArchive'),
                'noindex, follow': this.$t('ui.noindexFollow'),
                'noindex, nofollow': this.$t('ui.noindexNofollow')
            };
        },
        tagViewThemeSettings () {
            return this.$store.state.currentSite.themeSettings.tagConfig;
        }
    },
    mounted () {
        this.$bus.$on('show-tag-item-editor', (params, openedItem = false) => {
            try {
                if (typeof params.additionalData === 'string' && params.additionalData) {
                    params.additionalData = JSON.parse(params.additionalData);
                } else if (typeof params.additionalData !== 'object') {
                    params.additionalData = {};
                }
            } catch (e) {
                console.warn(this.$t('tag.tagDataParsingErrorMessage') + params.id);
                params.additionalData = {};
            }

            this.openedItem = 'basic';
            this.errors = [];
            this.tagData.id = params.id || 0;
            this.tagData.name = params.name || '';
            this.tagData.slug = params.slug || '';
            this.tagData.description = params.description || '';
            this.tagData.additionalData = {};

            if (typeof params.additionalData.viewConfig === 'object') {
                this.tagData.additionalData.viewConfig = params.additionalData.viewConfig;
            } else {
                this.tagData.additionalData.viewConfig = {};
            }

            this.tagData.additionalData.featuredImage = params.additionalData.featuredImage || '';
            this.tagData.additionalData.featuredImageAlt = params.additionalData.featuredImageAlt || '';
            this.tagData.additionalData.featuredImageCaption = params.additionalData.featuredImageCaption || '';
            this.tagData.additionalData.featuredImageCredits = params.additionalData.featuredImageCredits || '';
            this.tagData.additionalData.isHidden = params.additionalData.isHidden || false;
            this.tagData.additionalData.metaTitle = params.additionalData.metaTitle || '';
            this.tagData.additionalData.metaDescription = params.additionalData.metaDescription || '';
            this.tagData.additionalData.metaRobots = params.additionalData.metaRobots || '';
            this.tagData.additionalData.canonicalUrl = params.additionalData.canonicalUrl || '';
            this.tagData.additionalData.template = params.additionalData.template || '';
            this.currentTagIsHidden = !!this.tagData.additionalData.isHidden;

            if (this.tagData.additionalData && this.tagData.additionalData.featuredImage) {
                this.hasFeaturedImage = true;
            }

            Vue.nextTick(() => {
                this.dataSet = true;
            });
        });
    },
    methods: {
        async save (showPreview = false) {
            if (this.tagData.slug.trim() === '' && this.tagData.name.trim() !== '') {
                this.tagData.slug = await mainProcessAPI.invoke('app-main-process-create-slug', this.tagData.name);
            } else {
                this.tagData.slug = await mainProcessAPI.invoke('app-main-process-create-slug', this.tagData.slug);
            }

            if (!this.validate()) {
                return;
            }

            this.$bus.$emit('view-settings-before-save');

            setTimeout(() => {
                let tagData = Object.assign({}, this.tagData);
                tagData.site = this.$store.state.currentSite.config.name;
                tagData.imageConfigFields = this.tagViewThemeSettings.filter(field => field.type === 'image').map(field => field.name);
                this.saveData(tagData, showPreview);
            }, 500);
        },
        async saveAndPreview () {
            await this.save(true);
        },
        validate () {
            this.errors = [];

            if (this.tagData.name.trim() === '') {
                this.errors.push('name');
            }

            if (this.tagData.slug.trim() === '') {
                this.errors.push('slug');
            }

            if (this.errors.length) {
                this.$bus.$emit('message-display', {
                    message: this.$t('ui.pleaseFillAllRequiredFields'),
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
        saveData(tagData, showPreview = false) {
            mainProcessAPI.send('app-tag-save', tagData);

            mainProcessAPI.receiveOnce('app-tag-saved', (data) => {
                if (data.status !== false) {
                    if(this.tagData.id === 0) {
                        let newlyAddedTag = JSON.parse(JSON.stringify(data.tags.filter(tag => tag.id === data.tagID)[0]));
                        this.showMessage(data.message);

                        Vue.nextTick(() => {
                            this.$bus.$emit('show-tag-item-editor', newlyAddedTag, this.openedItem);
                        });
                    } else {
                        if (!showPreview) {
                            this.$bus.$emit('hide-tag-item-editor');
                            this.dataSet = false;
                        }

                        this.showMessage('success');

                        if (showPreview) {
                            this.$bus.$emit('rendering-popup-display', {
                                tagOnly: true,
                                itemID: this.tagData.id
                            });
                        }
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
            this.dataSet = false;
            
            mainProcessAPI.send('app-tag-cancel', {
                site: this.$store.state.currentSite.config.name,
                id: this.tagData.id,
                imageConfigFields: this.tagViewThemeSettings.filter(field => field.type === 'image').map(field => field.name)
            });
        },
        showMessage(message) {
            let messageConfig = {
                message: this.$t('tag.newTagHasBeenCreated'),
                type: 'success',
                lifeTime: 3
            };

            if (this.tagData.id > 0) {
                messageConfig.message = this.$t('tag.tagHasBeenEdited');
            }

            if(message !== 'success' && message !== 'tag-added') {
                messageConfig.type = 'warning';
            }

            if(message === 'tag-duplicate-name') {
                this.errors.push('name');
                messageConfig.message = this.$t('tag.tagNameInUseErrorMessage');
            } else if(message === 'tag-duplicate-slug') {
                this.errors.push('slug');
                messageConfig.message = this.$t('tag.tagNameSimilarInUseErrorMessage');
            } else if(message === 'tag-empty-name') {
                this.errors.push('name');
                messageConfig.message = this.$t('tag.tagNameCannotBeEmptyErrorMessage');
            } else if(message === 'tag-restricted-slug') {
                this.errors.push('slug');
                messageConfig.message = this.$t('tag.tagNameNotAllowedErrorMessage');
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
        },
        toggleHiddenStatus () {
            this.currentTagIsHidden = this.tagData.additionalData.isHidden;
        },
        displayField (field) {
            if (!this.dataSet) {
                return false;
            }

            if (!field.tagTemplates) {
                return true;
            }

            if (field.tagTemplates.indexOf('!') === 0) {
                return !(field.tagTemplates.replace('!', '').split(',').indexOf(this.tagData.additionalData.template) > -1);
            }

            return field.tagTemplates.split(',').indexOf(this.tagData.additionalData.template) > -1;
        },
        generateItems (arrayToConvert) {
            let options = {};

            for (let i = 0; i < arrayToConvert.length; i++) {
                options[arrayToConvert[i].value] = arrayToConvert[i].label;
            }

            return options;
        },
        fieldPlaceholder (field) {
            if (field.placeholder || field.placeholder === '') {
                return field.placeholder;
            }

			return this.$t('theme.leaveBlankToUseDefault');
        },
        async updateSlug () {
            if (this.tagData.name.trim() !== '') {
                this.tagData.slug = await mainProcessAPI.invoke('app-main-process-create-slug', this.tagData.name);
            }
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
@import '../scss/notifications.scss';

.tag-settings {
    max-height: 0;
    overflow: hidden;
    transition: max-height .25s ease-out;

    &-content {
        padding: 0 0 1rem;

        .image-uploader {
            margin-top: 0;
        }

        .msg {
            margin: 0 0 2rem;
        }
    }

    &-hidden {
        font-size: 1.4rem !important;
        font-weight: var(--font-weight-normal) !important;
        line-height: 1.8 !important;
        margin-top: 3rem;

        svg {
            margin: 0 .5rem 0 0;
            position: relative;
            top: .2rem;
        }
    }
}

.note {
    position: relative;
    z-index: 1;
}
</style>
