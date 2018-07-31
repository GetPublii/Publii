<template>
    <div class="tag-form-wrapper">
        <div class="tag-form">
            <h2>
                <template v-if="tagData.id">Edit tag</template>
                <template v-if="!tagData.id">Add new tag</template>
            </h2>

            <a
                href="#"
                class="tag-form-close"
                @click.prevent="close()">
                <icon
                    size="m"
                    name="sidebar-close" />
            </a>

            <label :class="{ 'is-invalid': errors.indexOf('name') > -1 }">
                <span>Name:</span>
                <input
                    v-model="tagData.name"
                    @keyup="cleanError('name')"
                    type="text">
            </label>

            <label :class="{ 'is-invalid': errors.indexOf('slug') > -1 }">
                <span>Slug:</span>
                <input
                    v-model="tagData.slug"
                    @keyup="cleanError('slug')"
                    type="text">
            </label>

            <label>
                <span>Description:</span>
                <text-area
                    v-model="tagData.description"
                    :rows="4"></text-area>
            </label>

            <label>
                <span>Page Title:</span>
                <text-input
                    v-model="tagData.additionalData.metaTitle"
                    type="text"
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
                    placeholder="Not available in your theme"
                    :disabled="true"
                    :readonly="true" />
            </label>

            <div class="tag-form-buttons">
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
    name: 'tag-form',
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

            if(this.errors.length) {
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

.tag-form {
    padding: 3.6rem;

    &-wrapper {
        background: $post-editor-sidebar-color;
        box-shadow: -4px 0px 6px rgba(0, 0, 0, 0.075);
        height: 100%;
        overflow: auto;
        position: absolute;
        top: 0;
        width: 50rem;
        z-index: 10;
    }

    h2 {
        background: $color-10;
        border-bottom: 1px solid rgba($color-8, .25);
        font-size: 1.8rem;
        font-weight: 400;
        margin: -3.6rem -3.6rem 2rem -3.6rem;
        padding: calc(1rem + 0.6vw) 3.6rem;
        text-transform: none;
    }

    label {
        display: block;
        line-height: 2;
        margin-bottom: 1.5rem;

        span {
            display: block;
            font-weight: 400;
        }

        input {
            width: 100%;
        }

        &.is-invalid {
            input {
                box-shadow: inset 0 0 0 1px $color-3;
            }
        }
    }

    &-close {
        position: absolute;
        right: 3.6rem;
        top: 2rem;

        .icon {
            fill: $color-3;
        }

        &:hover {
            .icon {
                fill: $color-5;
            }
        }
    }

    &-buttons {
        padding: 2rem 0 0 0;
    }
}
</style>
