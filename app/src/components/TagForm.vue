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

            <label :class="{ 'is-invalid': errors.indexOf('name') > -1 }">
                <span>Name:</span>
                <input
                    v-model="tagData.name"
                    :spellcheck="$store.state.currentSite.config.spellchecking"
                    @keyup="cleanError('name')"
                    type="text">
            </label>

            <label :class="{ 'is-invalid': errors.indexOf('slug') > -1 }">
                <span>Slug:</span>
                <input
                    v-model="tagData.slug"
                    @keyup="cleanError('slug')"
                    spellcheck="false"
                    type="text">
            </label>

            <label>
                <span>Description:</span>
                <text-area
                    v-model="tagData.description"
                    :spellcheck="$store.state.currentSite.config.spellchecking"
                    :rows="4"></text-area>
            </label>

            <label>
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

            <label>
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
            tagData: {
                id: 0,
                name: '',
                slug: '',
                description: '',
                additionalData: {
                    metaTitle: '',
                    metaDescription: '',
                    template: ''
                }
            }
        };
    },
    computed: {
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
            this.tagData.additionalData.metaTitle = params.additionalData.metaTitle || '';
            this.tagData.additionalData.metaDescription = params.additionalData.metaDescription || '';
            this.tagData.additionalData.template = params.additionalData.template || '';
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
            console.log(JSON.stringify(this.tagData));

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
</style>
