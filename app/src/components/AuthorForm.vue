<template>
    <div class="author-form-wrapper">
        <div class="author-form">
            <h2>
                <template v-if="authorData.id">Edit author</template>
                <template v-if="!authorData.id">Add new author</template>
            </h2>

            <a
                href="#"
                class="author-form-close"
                @click.prevent="close()">
                <icon
                    size="m"
                    name="sidebar-close" />
            </a>

            <label :class="{ 'is-invalid': errors.indexOf('name') > -1 }">
                <span>Name:</span>
                <input
                    v-model="authorData.name"
                    @keyup="cleanError('name')"
                    type="text">
            </label>

            <label :class="{ 'is-invalid': errors.indexOf('slug') > -1 }">
                <span>Slug:</span>
                <input
                    v-model="authorData.username"
                    @keyup="cleanError('slug')"
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
                    type="text">
            </label>

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
                <small class="note">
                    Use <a href="https://gravatar.com/" target="_blank">Gravatar </a> to provide your author avatar
                </small>
            </label>

            <label>
                <span>Page title:</span>
                <text-input
                    v-model="authorData.metaTitle"
                    type="text"
                    :placeholder="metaFieldAttrs"
                    :disabled="!metaOptionsActive"
                    :readonly="!metaOptionsActive"
                    :charCounter="metaOptionsActive"
                    :preferredCount="70" />
            </label>

            <label>
                <span>Meta Description:</span>
                <text-area
                    v-model="authorData.metaDescription"
                    :placeholder="metaFieldAttrs"
                    :disabled="!metaOptionsActive"
                    :readonly="!metaOptionsActive"
                    :charCounter="metaOptionsActive"
                    :preferredCount="160"></text-area>
            </label>

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
                    :disabled="true"
                    :readonly="true" />
            </label>

            <div class="author-form-buttons">
                <p-button
                    type="primary"
                    @click.native="save">
                    <template v-if="authorData.id">Save changes</template>
                    <template v-if="!authorData.id">Add new author</template>
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
import Utils from './../helpers/utils';
import crypto from 'crypto';
const mainProcess = remote.require('./main.js');

export default {
    name: 'author-form',
    data () {
        return {
            errors: [],
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
                visibleIndexingOptions: false
            }
        };
    },
    computed: {
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
            this.errors = [];
            this.authorData.id = params.id || 0;
            this.authorData.name = params.name || '';
            this.authorData.username = params.username || '';
            this.authorData.email = params.email || '';
            this.authorData.avatar = params.avatar || '';
            this.authorData.useGravatar = params.useGravatar || false;
            this.authorData.description = params.description || '';
            this.authorData.metaTitle = params.metaTitle || '';
            this.authorData.metaDescription = params.metaDescription || '';
            this.authorData.template = params.template || '';
            this.authorData.visibleIndexingOptions = params.visibleIndexingOptions || false;
        });
    },
    methods: {
        save () {
            if (this.authorData.username === '') {
                this.authorData.username = mainProcess.slug(this.authorData.name);
            }

            let authorData = {
                id: this.authorData.id,
                site: this.$store.state.currentSite.config.name,
                name: this.authorData.name,
                username: this.authorData.username,
                config: JSON.stringify({
                    email: this.authorData.email,
                    avatar: this.authorData.avatar,
                    useGravatar: this.authorData.useGravatar,
                    description: this.authorData.description,
                    metaTitle: this.authorData.metaTitle,
                    metaDescription: this.authorData.metaDescription,
                    template: this.authorData.template
                }),
                additionalConfig: ''
            };

            this.saveData(authorData);
        },
        saveData(authorData) {
            // Send form data to the back-end
            ipcRenderer.send('app-author-save', authorData);

            ipcRenderer.once('app-author-saved', (event, data) => {
                if(data.status !== false) {
                    if(authorData.id === 0) {
                        this.close();
                        this.showMessage(data.message);
                    } else {
                        this.close();
                        this.showMessage('success');
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

            if(message === 'author-duplicate-name') {
                this.displayAdvancedOptions = false;
                this.errors.push('name');
                messageConfig.message = 'Provided author name is in use. Please try other author name.';
            } else if(message === 'author-duplicate-username') {
                this.displayAdvancedOptions = true;
                this.errors.push('slug');
                messageConfig.message = 'Provided author name in a similar form (case insensitive) is in use. Please try other author name.';
            } else if(message === 'author-empty-name') {
                this.displayAdvancedOptions = false;
                this.errors.push('name');
                messageConfig.message = 'Author name cannot be empty. Please try other name.';
            } else if(message === 'author-empty-email') {
                this.displayAdvancedOptions = false;
                this.errors.push('email');
                messageConfig.message = 'In order to use Gravatar service provide the author e-mail at first.';
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
        }
    },
    beforeDestroy () {
        this.$bus.$off('show-author-item-editor');
    }
}
</script>

<style lang="scss" scoped>
@import '../scss/variables.scss';

.author-form {
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

        small {
           font-size: 90%;
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

    &-buttons {
        padding: 2rem 0 0 0;
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

    .use-gravatar {
        align-items: baseline;
        display: flex;
        margin: 1rem 0 2rem 0;
    }
}
</style>
