<template>
    <section
        class="content"
        ref="content">
        <div 
            class="theme-settings"
            v-if="siteHasTheme">
            <p-header title="Theme Settings">
                <p-button
                    @click.native="save"
                    slot="buttons"
                    type="secondary"
                    :disabled="buttonsLocked">
                    Save Settings
                </p-button>

                <btn-dropdown
                    slot="buttons"
                    buttonColor="green"
                    :items="dropdownItems"
                    :disabled="!siteHasTheme || buttonsLocked"
                    localStorageKey="publii-preview-mode"
                    :previewIcon="true"
                    defaultValue="full-site" />
            </p-header>

            <fields-group title="Basic settings">
                <field
                    id="name"
                    label="Posts per page:">
                    <text-input
                        slot="field"
                        ref="name"
                        type="number"
                        min="-1"
                        step="1"
                        v-model="basic.postsPerPage" />
                    <small 
                        slot="note"
                        class="note">
                        Use -1 as value if you need to display all posts on page.
                    </small>
                </field>

                <field
                    id="name"
                    label="Tags posts per page:">
                    <text-input
                        slot="field"
                        ref="name"
                        type="number"
                        min="-1"
                        step="1"
                        v-model="basic.tagsPostsPerPage" />
                    <small 
                        slot="note"
                        class="note">
                        Use -1 as value if you need to display all tag posts on page.
                    </small>
                </field>

                <field
                    id="name"
                    label="Authors posts per page:">
                    <text-input
                        slot="field"
                        ref="name"
                        type="number"
                        min="-1"
                        step="1"
                        v-model="basic.authorsPostsPerPage" />
                    <small 
                        slot="note"
                        class="note">
                        Use -1 as value if you need to display all authors posts on page.
                    </small>
                </field>

                <field
                    id="name"
                    label="Excerpt length:">
                    <text-input
                        slot="field"
                        ref="name"
                        type="number"
                        min="0"
                        step="1"
                        v-model="basic.excerptLength" />
                </field>

                <field
                    id="name"
                    label="Website logo:">
                    <image-upload
                        slot="field"
                        v-model="basic.logo"
                        :addMediaFolderPath="true" />
                </field>
            </fields-group>

            <fields-group title="Custom settings">
                <tabs
                    ref="custom-settings-tabs"
                    id="custom-settings-tabs"
                    :items="customSettingsTabs">
                    <div
                        v-for="(groupName, index) of customSettingsTabs"
                        :slot="'tab-' + index"
                        :key="'tab-' + index">
                        <div v-if="groupName !== 'Post options' && groupName !== 'Translations'">
                            <field
                                v-for="(field, subindex) of getFieldsByGroupName(groupName)"
                                v-if="checkDependencies(field.dependencies)"
                                :label="getFieldLabel(field)"
                                :key="'tab-' + index + '-field-' + subindex"
                                :noLabelSpace="field.type === 'separator'"
                                :labelFullWidth="field.type === 'wysiwyg'">
                                <range-slider
                                    v-if="field.type === 'range'"
                                    :min="field.min"
                                    :max="field.max"
                                    :step="field.step"
                                    v-model="custom[field.name]"
                                    :anchor="field.anchor"
                                    slot="field"></range-slider>

                                <separator
                                    v-if="field.type === 'separator'"
                                    slot="field"
                                    :type="field.size"
                                    :label="field.label"
                                    :anchor="field.anchor"
                                    :note="field.note"></separator>

                                <text-area
                                    v-if="field.type === 'textarea'"
                                    slot="field"
                                    :rows="field.rows"
                                    v-model="custom[field.name]"
                                    :anchor="field.anchor"
                                    :spellcheck="$store.state.currentSite.config.spellchecking && field.spellcheck"
                                    :cols="field.cols"></text-area>

                                <text-area
                                    v-if="field.type === 'wysiwyg'"
                                    slot="field"
                                    :id="'theme-settings-' + index"
                                    v-model="custom[field.name]"
                                    :anchor="field.anchor"
                                    :wysiwyg="true"></text-area>

                                <image-upload
                                    v-if="field.type === 'upload'"
                                    v-model="custom[field.name]"
                                    slot="field"
                                    :anchor="field.anchor"
                                    :addMediaFolderPath="true"></image-upload>

                                <small-image-upload
                                    v-if="field.type === 'smallupload'"
                                    v-model="custom[field.name]"
                                    :anchor="field.anchor"
                                    slot="field"></small-image-upload>

                                <radio-buttons
                                    v-if="field.type === 'radio'"
                                    :items="field.options"
                                    :name="field.name"
                                    v-model="custom[field.name]"
                                    :anchor="field.anchor"
                                    slot="field" />

                                <dropdown
                                    v-if="field.type === 'select'"
                                    slot="field"
                                    :multiple="field.multiple"
                                    v-model="custom[field.name]"
                                    :id="field.anchor"
                                    :items="getDropdownOptions(field.options)"></dropdown>

                                <switcher
                                    v-if="field.type === 'checkbox'"
                                    v-model="custom[field.name]"
                                    :lower-zindex="true"
                                    :anchor="field.anchor"
                                    slot="field"></switcher>

                                <color-picker
                                    v-if="field.type === 'colorpicker'"
                                    v-model="custom[field.name]"
                                    :data-field="field.name"
                                    :anchor="field.anchor"
                                    slot="field"></color-picker>

                                <posts-dropdown
                                    v-if="field.type === 'posts-dropdown'"
                                    v-model="custom[field.name]"
                                    :allowed-post-status="field.allowedPostStatus || ['any']"
                                    :multiple="field.multiple"
                                    :anchor="field.anchor"
                                    slot="field"></posts-dropdown>

                                <tags-dropdown
                                    v-if="field.type === 'tags-dropdown'"
                                    v-model="custom[field.name]"
                                    :multiple="field.multiple"
                                    :anchor="field.anchor"
                                    slot="field"></tags-dropdown>

                                <authors-dropdown
                                    v-if="field.type === 'authors-dropdown'"
                                    v-model="custom[field.name]"
                                    :multiple="field.multiple"
                                    :anchor="field.anchor"
                                    slot="field"></authors-dropdown>

                                <text-input
                                    v-if="isNormalInput(field.type)"
                                    slot="field"
                                    :type="field.type"
                                    :min="field.min"
                                    :max="field.max"
                                    :size="field.size"
                                    :step="field.step"
                                    :pattern="field.pattern"
                                    :spellcheck="$store.state.currentSite.config.spellchecking && field.spellcheck"
                                    v-model="custom[field.name]"
                                    :anchor="field.anchor"
                                    :placeholder="field.placeholder"></text-input>

                                <small
                                    v-if="field.note && field.type !== 'separator'"
                                    slot="note"
                                    class="note"
                                    v-pure-html="field.note">
                                </small>
                            </field>
                        </div>

                        <div v-if="groupName === 'Post options'">
                            <field>
                                <small
                                    slot="note"
                                    class="note">
                                    The Post options section allows you to set global options for what extra information should be included in your posts. Changes made in this section will affect all posts on your site, but you can also override the App Settings on the Post Edit screen for each individual post if necessary.<br><br>
                                </small>
                            </field>

                            <field 
                                v-if="hasPostTemplates"
                                label="Default post template"
                                key="tab-last-field-0">
                                <dropdown
                                    :items="postTemplates"
                                    v-model="defaultTemplates.post"
                                    id="post-template"
                                    slot="field">
                                    <option
                                        value=""
                                        slot="first-choice">
                                        Default template
                                    </option>
                                </dropdown>
                            </field>

                            <field
                                v-for="(field, subindex) of postViewThemeSettings"
                                :label="field.label"
                                :key="'tab-' + index + '-field-' + subindex">
                                <dropdown
                                    v-if="!field.type || field.type === 'select'"
                                    :id="field.name + '-select'"
                                    :items="getDropdownPostViewOptions(field.options)"
                                    slot="field"
                                    v-model="postView[field.name]">
                                </dropdown>

                                <text-input
                                    v-if="field.type === 'text' || field.type === 'number'"
                                    :type="field.type"
                                    slot="field"
                                    :spellcheck="$store.state.currentSite.config.spellchecking && field.spellcheck"
                                    :placeholder="field.placeholder ? field.placeholder : 'Leave it blank to use default value'"
                                    v-model="postView[field.name]" />

                                <text-area
                                    v-if="field.type === 'textarea'"
                                    slot="field"
                                    :placeholder="field.placeholder ? field.placeholder : 'Leave it blank to use default value'"
                                    :spellcheck="$store.state.currentSite.config.spellchecking && field.spellcheck"
                                    v-model="postView[field.name]" />

                                <color-picker
                                    v-if="field.type === 'colorpicker'"
                                    slot="field"
                                    v-model="postView[field.name]">
                                </color-picker>

                                <small
                                    v-if="field.note"
                                    slot="note"
                                    class="note">
                                    {{ field.note }}
                                </small>
                            </field>
                        </div>

                        <div v-if="groupName === 'Translations'">
                            <field>
                                <small
                                    slot="note"
                                    class="note">
                                    If you need to translate theme phrases to languages other than english - please check our documentation regarding <a href="https://getpublii.com/dev/translations-api/" target="_blank" rel="noopener noreferrer">Translations API</a><br><br>
                                </small>
                            </field>
                        </div>
                    </div>
                </tabs>
            </fields-group>

            <p-footer>
                <btn-dropdown
                    slot="buttons"
                    buttonColor="green"
                    :items="dropdownItems"
                    :disabled="!siteHasTheme || buttonsLocked"
                    localStorageKey="publii-preview-mode"
                    :previewIcon="true"
                    :isReversed="true"
                    defaultValue="full-site" />

                <p-button
                    @click.native="save"
                    slot="buttons"
                    type="secondary"
                    :disabled="buttonsLocked">
                    Save Settings
                </p-button>

                <p-button
                    @click.native="reset"
                    slot="buttons"
                    type="outline"
                    :disabled="buttonsLocked">
                    Reset theme settings
                </p-button>
            </p-footer>
        </div>
    </section>
</template>

<script>
import fs from 'fs';
import Vue from 'vue';
import { ipcRenderer } from 'electron';
import PostsDropDown from './basic-elements/PostsDropDown';
import TagsDropDown from './basic-elements/TagsDropDown';
import AuthorsDropDown from './basic-elements/AuthorsDropDown';
import Utils from './../helpers/utils.js';

export default {
    name: 'site-settings',
    components: { 
        'authors-dropdown': AuthorsDropDown,
        'posts-dropdown': PostsDropDown,
        'tags-dropdown': TagsDropDown
    },
    data: function() {
        return {
            buttonsLocked: false,
            defaultTemplates: {
                post: ''
            },
            basic: {
                postsPerPage: 4,
                tagsPostsPerPage: 4,
                authorsPostsPerPage: 4,
                excerptLength: 45,
                logo: ''
            },
            custom: {},
            postView: {}
        };
    },
    computed: {
        siteHasTheme () {
            return !!this.$store.state.currentSite.config.theme;
        },
        customSettingsTabs () {
            let tabs = [];

            this.$store.state.currentSite.themeSettings.customConfig.forEach(item => {
                if (tabs.indexOf(item.group) === -1) {
                    tabs.push(item.group);
                }
            });

            tabs.push('Post options');
            tabs.push('Translations');

            return tabs;
        },
        postViewThemeSettings () {
            return this.$store.state.currentSite.themeSettings.postConfig.filter(field => field.type !== 'separator');
        },
        postTemplates () {
            return this.$store.state.currentSite.themeSettings.postTemplates;
        },
        hasPostTemplates () {
            return !!Object.keys(this.postTemplates).length;
        },
        dropdownItems () {
            return [
                {
                    label: 'Render full website',
                    activeLabel: 'Save & Preview',
                    value: 'full-site',
                    isVisible: () => true,
                    icon: 'full-preview-monitor',
                    onClick: this.saveAndPreview.bind(this, 'full-site')
                },
                {
                    label: 'Render front page only',
                    activeLabel: 'Save & Preview',
                    value: 'homepage',
                    icon: 'quick-preview',
                    isVisible: () => true,
                    onClick: this.saveAndPreview.bind(this, 'homepage')
                }
            ]
        }
    },
    mounted () {
        setTimeout (() => {
            this.loadSettings();
        }, 0);
    },
    methods: {
        loadSettings () {
            this.loadBasicSettings();
            this.loadCustomSettings();
            this.loadPostViewSettings();
            this.loadDefaultTemplates();
        },
        loadBasicSettings () {
            this.basic.postsPerPage = this.$store.state.currentSite.themeSettings.config.filter(field => field.name === 'postsPerPage')[0].value;
            this.basic.tagsPostsPerPage = this.$store.state.currentSite.themeSettings.config.filter(field => field.name === 'tagsPostsPerPage')[0].value;
            this.basic.authorsPostsPerPage = this.$store.state.currentSite.themeSettings.config.filter(field => field.name === 'authorsPostsPerPage')[0].value;
            this.basic.excerptLength = this.$store.state.currentSite.themeSettings.config.filter(field => field.name === 'excerptLength')[0].value;
            this.basic.logo = this.$store.state.currentSite.themeSettings.config.filter(field => field.name === 'logo')[0].value;
        },
        loadCustomSettings () {
            let settings = this.$store.state.currentSite.themeSettings.customConfig.map(field => {
                if (field.type !== 'separator') {
                    return [field.name, field.value]
                }

                return false;
            });

            for (let setting of settings) {
                if (setting) {
                    Vue.set(this.custom, setting[0], setting[1]);
                }
            }
        },
        loadPostViewSettings () {
            let settings = this.$store.state.currentSite.themeSettings.postConfig.map(field => {
                if (field.type !== 'separator') {
                    return [field.name, field.value]
                }

                return false;
            });

            for (let setting of settings) {
                if (setting) {
                    Vue.set(this.postView, setting[0], setting[1]);
                }
            }
        },
        loadDefaultTemplates () {
            this.defaultTemplates = {
                post: this.$store.state.currentSite.themeSettings.defaultTemplates.post
            };
        },
        checkDependencies (dependencies) {
            if (!dependencies || !dependencies.length) {
                return true;
            }

            for (let i = 0; i < dependencies.length; i++) {
                let dependencyName = dependencies[i].field;
                let dependencyValue = dependencies[i].value;

                if (dependencyValue === "true" && this.custom[dependencyName] !== true) {
                    return false;
                } else if (dependencyValue === "true") {
                    continue;
                }

                if (dependencyValue === "false" && this.custom[dependencyName] !== false) {
                    return false;
                } else if (dependencyValue === "false") {
                    continue;
                }

                if (typeof dependencyValue === 'string' && dependencyValue.indexOf(',') > -1) {
                    let values = dependencyValue.split(',');

                    for (let i = 0; i < values.length; i++) {
                        if (this.custom[dependencyName] === values[i]) {
                            continue;
                        }
                    }

                    return false;
                }

                if (dependencyValue !== this.custom[dependencyName]) {
                    return false;
                }
            }

            return true;
        },
        clearErrors (errorName) {
            let pos = this.errors.indexOf(errorName);
            this.errors.splice(pos, 1);
        },
        getFieldLabel (field) {
            if (field.type === 'separator') {
                return '';
            }

            if (field.label === '' || typeof field.label === 'undefined') {
                return ' ';
            }

            return field.label;
        },
        getFieldsByGroupName (groupName) {
            return this.$store.state.currentSite.themeSettings.customConfig.filter(field => field.group === groupName);
        },
        isNormalInput (type) {
            return [
                'separator',
                'textarea',
                'wysiwyg',
                'radio',
                'select',
                'range',
                'upload',
                'smallupload',
                'checkbox',
                'colorpicker',
                'posts-dropdown',
                'authors-dropdown',
                'tags-dropdown'
            ].indexOf(type) === -1;
        },
        getDropdownOptions (inputOptions) {
            let options = {};

            for (let i = 0; i < inputOptions.length; i++) {
                options[inputOptions[i].value] = inputOptions[i].label;
            }

            return options;
        },
        getDropdownPostViewOptions (arrayToConvert) {
            let options = {};

            for (let i = 0; i < arrayToConvert.length; i++) {
                options[arrayToConvert[i].value] = arrayToConvert[i].label;
            }

            return options;
        },
        goToSettings () {
            let siteName = this.$route.params.name;
            this.$router.push('/site/' + siteName + '/settings/');
        },
        save () {
            this.$bus.$emit('theme-settings-before-save');

            setTimeout(() => {
                this.saveSettings(false);
            }, 500);
        },
        saveAndPreview (renderingType = false) {
            this.$bus.$emit('theme-settings-before-save');

            setTimeout(() => {
                this.saveSettings(true, renderingType);
            }, 500);
        },
        saveSettings(showPreview = false, renderingType = false) {
            let newConfig = {
                config: Object.assign({}, this.basic),
                customConfig: Object.assign({}, this.custom),
                postConfig: Object.assign({}, this.postView),
                defaultTemplates: Object.assign({}, this.defaultTemplates)
            };

            // Send request to the back-end
            ipcRenderer.send('app-site-theme-config-save', {
                "site": this.$store.state.currentSite.config.name,
                "theme": this.$store.state.currentSite.config.theme,
                "config": newConfig
            });

            // Settings saved
            ipcRenderer.once('app-site-theme-config-saved', (event, data) => {
                if (data.status === true) {
                    this.savedSettings(showPreview, renderingType);
                    this.$store.commit('setThemeConfig', data);
                    this.$bus.$emit('message-display', {
                        message: 'Theme settings has been successfully saved.',
                        type: 'success',
                        lifeTime: 3
                    });
                }

                this.loadSettings();
            });
        },
        savedSettings(showPreview = false, renderingType = false) {
            if (showPreview) {
                if (this.$store.state.app.config.previewLocation !== '' && !fs.existsSync(this.$store.state.app.config.previewLocation)) {
                    this.$bus.$emit('confirm-display', {
                        message: 'The preview catalog does not exist. Please go to the App Settings and select the correct preview directory first.',
                        okLabel: 'Go to app settings',
                        okClick: () => {
                            this.$router.push(`/app-settings/`);
                        }
                    });
                    return;
                }

                if (renderingType === 'homepage') {
                    this.$bus.$emit('rendering-popup-display', {
                        homepageOnly: true
                    });
                } else {
                    this.$bus.$emit('rendering-popup-display');
                }
            }
        },
        reset () {
            this.$bus.$emit('confirm-display', {
                message: 'Do you really want to reset the theme settings?',
                okClick: this.resetSettings
            });
        },
        resetSettings () {
            // Send request to the back-end
            ipcRenderer.send('app-site-theme-config-save', {
                "site": this.$store.state.currentSite.config.name,
                "theme": this.$store.state.currentSite.config.theme,
                "config": {}
            });

            // Settings saved
            ipcRenderer.once('app-site-theme-config-saved', (event, data) => {
                if (data.status === true) {
                    this.savedSettings(false);
                    this.$store.commit('setThemeConfig', data);
                }

                this.loadSettings();

                this.$bus.$emit('message-display', {
                    message: 'Theme settings has been reset.',
                    type: 'success',
                    lifeTime: 3
                });
            });
        }
    }
}
</script>

<style lang="scss" scoped>
@import '../scss/variables.scss';

.theme-settings {
    margin: 0 auto;
    max-width: $wrapper;
    user-select: none;

    .multiple-checkboxes {
        label {
            display: block;
        }
    }

    textarea {
        height: 200px;
    }
}
</style>
