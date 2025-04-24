<template>
    <div
        :key="'author-view-' + authorData.id"
        :data-animate="formAnimation ? 'true' : 'false'"
        class="options-sidebar-container">
        <div class="options-sidebar">
            <h2>
                <template v-if="authorData.id">{{ $t('author.editAuthor') }}</template>
                <template v-if="!authorData.id">{{ $t('author.addNewAuthor') }}</template>
            </h2>

           <span
                class="options-sidebar-close"
                name="sidebar-close"
                @click.prevent="close()">
                &times;
            </span>

            <div
                v-if="!currentThemeHasSupportForAuthorPages"
                slot="note"
                class="msg msg-small msg-icon msg-alert">
                <icon name="warning" size="m" />
                <p>{{ $t('settings.themeDoesNotSupportAuthorPages') }}</p>
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
                    class="author-settings"
                    style="max-height: none;"
                    ref="basic-content-wrapper">
                    <div
                        class="author-settings-content"
                        ref="basic-content">
                        <label :class="{ 'is-invalid': errors.indexOf('name') > -1 }">
                            <span>{{ $t('ui.name') }}:</span>
                            <input
                                v-model="authorData.name"
                                @keyup="cleanError('name')"
                                :spellcheck="$store.state.currentSite.config.spellchecking"
                                type="text">
                        </label>

                        <label>
                            <span>{{ $t('ui.description') }}:</span>
                            <text-area
                                v-model="authorData.description"
                                :wysiwyg="true"
                                :miniEditorMode="true"
                                :simplifiedToolbar="true"
                                :rows="4"></text-area>
                        </label>

                        <label :class="{ 'is-invalid': errors.indexOf('email') > -1 }">
                            <span>{{ $t('author.eMail') }}:</span>
                            <input
                                v-model="authorData.email"
                                @keyup="emailChanged"
                                spellcheck="false"
                                type="text">
                        </label>

                        <label>
                            <span>{{ $t('author.website') }}:</span>
                            <input
                                v-model="authorData.website"
                                spellcheck="false"
                                type="text">
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

                    <span class="options-sidebar-label">{{ $t('author.avatarAndFeaturedImage') }}</span>
                </div>

                <div
                    class="author-settings"
                    ref="image-content-wrapper">
                    <div
                        class="author-settings-content"
                        ref="image-content">
                        <label>
                            <span>{{ $t('author.avatar') }}:</span>
                            <image-upload
                                slot="field"
                                type="small"
                                id="author"
                                ref="author-avatar"
                                :onRemove="avatarRemoved"
                                imageType="authorImages"
                                v-model="authorData.avatar" />
                        </label>
                        <div                               
                            slot="note"
                            class="msg msg-small msg-icon msg-info">
                            <icon name="info" size="m" />
                            <p>{{ $t('author.whenYouUseGravatarYourSiteVisitorsWillQueryAThirdPartyServer') }}</p>
                        </div>
                        <label class="use-gravatar">
                            <switcher
                                slot="field"
                                id="use-gravatar"
                                @click.native="toggleGravatar"
                                v-model="authorData.useGravatar" />
                            <span
                                v-pure-html="$t('author.useGravatarMessage')">
                            </span>
                        </label>
                        <div>
                            <label class="no-margin">{{ $t('ui.featuredImage') }}:</label>
                            <div
                                v-if="!currentThemeHasSupportForAuthorImages"
                                slot="note"
                                class="msg msg-small msg-icon msg-alert">
                                <icon name="warning" size="m" />
                                <p>{{ $t('author.themeDoesNotSupportFeaturedImagesForAuthors') }}</p>
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
                                    <label>{{ $t('ui.alternativeText') }}
                                        <text-input
                                            ref="featured-image-alt"
                                            :spellcheck="$store.state.currentSite.config.spellchecking"
                                            v-model="authorData.additionalData.featuredImageAlt" />
                                    </label>

                                    <label>{{ $t('ui.caption') }}
                                        <text-input
                                            ref="featured-image-caption"
                                            :spellcheck="$store.state.currentSite.config.spellchecking"
                                            v-model="authorData.additionalData.featuredImageCaption" />
                                    </label>

                                    <label>{{ $t('ui.credits') }}
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
                    class="author-settings"
                    ref="seo-content-wrapper">
                    <div
                        class="author-settings-content"
                        ref="seo-content">
                        <label :class="{ 'is-invalid': errors.indexOf('slug') > -1 }">
                            <span>{{ $t('ui.slug') }}:</span>
                            <div class="options-sidebar-item-slug">
                                <input
                                    v-model="authorData.username"
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
                                v-model="authorData.metaTitle"
                                type="text"
                                :spellcheck="$store.state.currentSite.config.spellchecking"
                                :placeholder="$t('ui.leaveBlankToUseDefaultPageTitle')"
                                :charCounter="true"
                                :preferredCount="70" />
                        </label>

                        <label class="with-char-counter">
                            <span>{{ $t('ui.metaDescription') }}:</span>
                            <text-area
                                v-model="authorData.metaDescription"
                                :placeholder="$t('ui.leaveBlankToUseDefaultPageTitle')"
                                :charCounter="true"
                                :spellcheck="$store.state.currentSite.config.spellchecking"
                                :preferredCount="160"></text-area>
                        </label>

                        <label>
                            {{ $t('ui.metaRobotsIndex') }}:
                            <dropdown
                                v-if="!authorData.additionalData.canonicalUrl"
                                id="tag-meta-robots"
                                v-model="authorData.additionalData.metaRobots"
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
                                v-model="authorData.additionalData.canonicalUrl"
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
                    class="author-settings"
                    ref="other-content-wrapper">
                    <div
                        class="author-settings-content"
                        ref="other-content">
                        <label>
                            <span>{{ $t('ui.customTemplate') }}:</span>
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
                                :placeholder="$t('ui.notAvailableInYourTheme')"
                                :spellcheck="false"
                                :disabled="true"
                                :readonly="true" />
                        </label>

                        <template v-if="dataSet">
                            <template v-for="(field, index) of authorViewThemeSettings">
                                <separator 
                                    v-if="displayField(field) && field.type === 'separator'"
                                    :label="field.label"
                                    :is-line="true"
                                    :key="'author-view-field-' + index"
                                    :note="field.note" />

                                <label
                                    v-if="displayField(field) && field.type !== 'separator'"
                                    :key="'author-view-field-' + index">
                                    {{ field.label }}

                                    <dropdown
                                        v-if="!field.type || field.type === 'select'"
                                        :id="field.name + '-select'"
                                        class="author-view-settings"
                                        v-model="authorData.additionalData.viewConfig[field.name]"
                                        :items="generateItems(field.options)">
                                        <option slot="first-choice" value="">{{ $t('settings.useGlobalConfiguration') }}</option>
                                    </dropdown>

                                    <text-input
                                        v-if="field.type === 'text' || field.type === 'number'"
                                        :type="field.type"
                                        class="author-view-settings"
                                        :spellcheck="$store.state.currentSite.config.spellchecking"
                                        :placeholder="fieldPlaceholder(field)"
                                        v-model="authorData.additionalData.viewConfig[field.name]" />

                                    <text-area
                                        v-if="field.type === 'textarea'"
                                        class="author-view-settings"
                                        :placeholder="fieldPlaceholder(field)"
                                        :spellcheck="$store.state.currentSite.config.spellchecking"
                                        v-model="authorData.additionalData.viewConfig[field.name]" />

                                    <color-picker
                                        v-if="field.type === 'colorpicker'"
                                        class="author-view-settings"
                                        v-model="authorData.additionalData.viewConfig[field.name]"
                                        :outputFormat="field.outputFormat ? field.outputFormat : 'RGBAorHEX'">
                                    </color-picker>

                                    <image-upload
                                        v-if="field.type === 'image'"
                                        class="author-view-settings"
                                        v-model="authorData.additionalData.viewConfig[field.name]"
                                        :item-id="authorData.id"
                                        imageType="authorImages" />

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
                    <template v-if="authorData.id">{{ $t('ui.saveChanges') }}</template>
                    <template v-if="!authorData.id">{{ $t('author.addNewAuthor') }}</template>
                </p-button>

                <p-button
                    :disabled="!authorData.id || !currentThemeHasSupportForAuthorPages"
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
import Utils from './../helpers/utils';
import Vue from 'vue';

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
            dataSet: false,
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
                    featuredImageCredits: '',
                    metaRobots: '',
                    canonicalUrl: ''
                }
            }
        };
    },
    computed: {
        currentThemeHasSupportForAuthorImages () {
            return this.$store.state.currentSite.themeSettings.supportedFeatures && this.$store.state.currentSite.themeSettings.supportedFeatures.authorImages;
        },
        currentThemeHasSupportForAuthorPages () {
            if (this.$store.state.currentSite.themeSettings.supportedFeatures && this.$store.state.currentSite.themeSettings.supportedFeatures.authorPages === false) {
                return false;
            }

            return this.$store.state.currentSite.themeSettings.renderer.createAuthorPages;
        },
        authorTemplates: function() {
            return this.$store.getters.authorTemplates;
        },
        currentThemeHasAuthorTemplates: function() {
            return Object.keys(this.authorTemplates).length > 1;
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
        authorViewThemeSettings () {
            return this.$store.state.currentSite.themeSettings.authorConfig;
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
                console.warn(this.$t('author.authorDataParsingErrorMessage') + params.id);
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

            if (typeof params.additionalData.viewConfig === 'object') {
                this.authorData.additionalData.viewConfig = params.additionalData.viewConfig;
            } else {
                this.authorData.additionalData.viewConfig = {};
            }

            this.authorData.additionalData.featuredImage = params.additionalData.featuredImage || '';
            this.authorData.additionalData.featuredImageAlt = params.additionalData.featuredImageAlt || '';
            this.authorData.additionalData.featuredImageCaption = params.additionalData.featuredImageCaption || '';
            this.authorData.additionalData.featuredImageCredits = params.additionalData.featuredImageCredits || '';
            this.authorData.additionalData.metaRobots = params.additionalData.metaRobots || '';
            this.authorData.additionalData.canonicalUrl = params.additionalData.canonicalUrl || '';

            if (this.authorData.additionalData && this.authorData.additionalData.featuredImage) {
                this.hasFeaturedImage = true;
            }

            Vue.nextTick(() => {
                this.dataSet = true;
            });
        });
    },
    methods: {
        async save (showPreview = false) {
            if (this.authorData.username === '') {
                this.authorData.username = await mainProcessAPI.invoke('app-main-process-create-slug', this.authorData.name);
            } else {
                this.authorData.username = await mainProcessAPI.invoke('app-main-process-create-slug', this.authorData.username);
            }

            this.$bus.$emit('view-settings-before-save');

            setTimeout(() => {
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
                    additionalData: JSON.stringify(this.authorData.additionalData),
                    imageConfigFields: this.authorViewThemeSettings.filter(field => field.type === 'image').map(field => field.name)
                };

                this.saveData(authorData, showPreview);
            }, 500);
        },
        async saveAndPreview () {
            await this.save(true);
        },
        saveData(authorData, showPreview = false) {
            // Send form data to the back-end
            mainProcessAPI.send('app-author-save', authorData);

            mainProcessAPI.receiveOnce('app-author-saved', (data) => {
                if(data.status !== false) {
                    if(authorData.id === 0) {
                        let newlyAddedAuthor = JSON.parse(JSON.stringify(data.authors.filter(author => author.id === data.authorID)[0]));
                        this.$bus.$emit('show-author-item-editor', newlyAddedAuthor);
                        this.$bus.$emit('hide-author-item-editor');
                        this.dataSet = false;
                        this.showMessage(data.message);
                    } else {
                        if (!showPreview) {
                            this.$bus.$emit('hide-author-item-editor');
                            this.dataSet = false;
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
                    this.$store.commit('setPageAuthors', data.pagesAuthors);
                    this.$bus.$emit('authors-list-updated');
                    return;
                }

                this.showMessage(data.message);
            });
        },
        close() {
            this.$bus.$emit('hide-author-item-editor');
            this.dataSet = false;

            mainProcessAPI.send('app-author-cancel', {
                site: this.$store.state.currentSite.config.name,
                id: this.authorData.id,
                imageConfigFields: this.authorViewThemeSettings.filter(field => field.type === 'image').map(field => field.name)
            });
        },
        showMessage(message) {
            let msg = this.$t('author.newAuthorHasBeenCreated');

            if (this.authorData.id > 0) {
                msg = this.$t('author.authorHasBeenUpdated');
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
                messageConfig.message = this.$t('author.authorNameInUseErrorMessage');
            } else if (message === 'author-duplicate-username') {
                this.displayAdvancedOptions = true;
                this.errors.push('slug');
                messageConfig.message = this.$t('author.authorNameSimilarInUseErrorMessage');
            } else if (message === 'author-empty-name') {
                this.displayAdvancedOptions = false;
                this.errors.push('name');
                messageConfig.message = this.$t('author.authorNameCannotBeEmptyErrorMessage');
            } else if (message === 'author-empty-email') {
                this.displayAdvancedOptions = false;
                this.errors.push('email');
                messageConfig.message = this.$t('author.useGravatarServiceMessage');
            } else if (message === 'author-empty-username') {
                this.displayAdvancedOptions = false;
                this.errors.push('slug');
                messageConfig.message = this.$t('author.authorSlugCannotBeEmpty');
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
                            message: this.$t('author.gravatarEmailWarningMessage'),
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
        getGravatar: Utils.debouncedFunction(async function() {
            let avatarPath = 'https://www.gravatar.com/avatar/' + await this.md5(this.authorData.email) + '?s=240';
            this.authorData.avatar = avatarPath;
        }, 1000),
        async md5 (value) {
            return await mainProcessAPI.createMD5(value);
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
        },
        displayField (field) {
            if (!this.dataSet) {
                return false;
            }

            if (!field.authorTemplates) {
                return true;
            }

            if (field.authorTemplates.indexOf('!') === 0) {
                return !(field.authorTemplates.replace('!', '').split(',').indexOf(this.authorData.template) > -1);
            }

            return field.authorTemplates.split(',').indexOf(this.authorData.template) > -1;
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
            if (this.authorData.name.trim() !== '') {
                this.authorData.username = await mainProcessAPI.invoke('app-main-process-create-slug', this.authorData.name);
            }
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
        font-weight: 400;
        margin-bottom: 2rem;
    }
}

.author-settings {
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

}

.note {
    position: relative;
    z-index: 1;
}
</style>
