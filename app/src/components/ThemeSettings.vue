<template>
    <section
        class="content"
        ref="content">
        <div class="theme-settings" v-if="siteHasTheme">
            <p-header title="Theme Settings">
                <p-button
                    @click.native="save"
                    slot="buttons"
                    type="secondary"
                    :disabled="buttonsLocked">
                    Save Settings
                </p-button>

                <p-button
                    @click.native="saveAndPreview"
                    slot="buttons"
                    type="primary"
                    :disabled="!siteHasTheme || buttonsLocked">
                    Save &amp; Preview
                </p-button>
            </p-header>

            <fields-group title="Basic settings">
                <field
                    id="name"
                    label="Posts per page:">
                    <text-input
                        slot="field"
                        ref="name"
                        type="number"
                        v-model="basic.postsPerPage" />
                </field>

                <field
                    id="name"
                    label="Tags posts per page:">
                    <text-input
                        slot="field"
                        ref="name"
                        type="number"
                        v-model="basic.tagsPostsPerPage" />
                </field>

                <field
                    id="name"
                    label="Authors posts per page:">
                    <text-input
                        slot="field"
                        ref="name"
                        type="number"
                        v-model="basic.authorsPostsPerPage" />
                </field>

                <field
                    id="name"
                    label="Excerpt length:">
                    <text-input
                        slot="field"
                        ref="name"
                        type="number"
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
                        <div v-if="groupName !== 'Post options'">
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
                                    slot="field"></range-slider>

                                <separator
                                    v-if="field.type === 'separator'"
                                    slot="field"
                                    :type="field.size"
                                    :label="field.label"
                                    :note="field.note"></separator>

                                <text-area
                                    v-if="field.type === 'textarea'"
                                    slot="field"
                                    :rows="field.rows"
                                    v-model="custom[field.name]"
                                    :cols="field.cols"></text-area>

                                <text-area
                                    v-if="field.type === 'wysiwyg'"
                                    slot="field"
                                    :id="'theme-settings-' + index"
                                    v-model="custom[field.name]"
                                    :wysiwyg="true"></text-area>

                                <image-upload
                                    v-if="field.type === 'upload'"
                                    v-model="custom[field.name]"
                                    slot="field"
                                    :addMediaFolderPath="true"></image-upload>

                                <small-image-upload
                                    v-if="field.type === 'smallupload'"
                                    v-model="custom[field.name]"
                                    slot="field"></small-image-upload>

                                <radio-buttons
                                    v-if="field.type === 'radio'"
                                    :items="field.options"
                                    v-model="custom[field.name]"
                                    slot="field" />

                                <dropdown
                                    v-if="field.type === 'select'"
                                    slot="field"
                                    :multiple="field.multiple"
                                    v-model="custom[field.name]"
                                    :items="getDropdownOptions(field.options)"></dropdown>

                                <switcher
                                    v-if="field.type === 'checkbox'"
                                    v-model="custom[field.name]"
                                    slot="field"></switcher>

                                <color-picker
                                    v-if="field.type === 'colorpicker'"
                                    v-model="custom[field.name]"
                                    :data-field="field.name"
                                    slot="field"></color-picker>

                                <text-input
                                    v-if="isNormalInput(field.type)"
                                    slot="field"
                                    :type="field.type"
                                    :min="field.min"
                                    :max="field.max"
                                    :size="field.size"
                                    :step="field.step"
                                    :pattern="field.pattern"
                                    v-model="custom[field.name]"
                                    :placeholder="field.placeholder"></text-input>

                                <small
                                    v-if="field.note && field.type !== 'separator'"
                                    slot="note"
                                    class="note"
                                    v-html="field.note">
                                </small>
                            </field>
                        </div>

                        <div v-if="groupName === 'Post options'">
                            <field>
                                <small
                                    slot="note"
                                    class="note">
                                    The Post options section allows you to set global options for what extra information should be included in your posts. Changes made in this section will affect all posts on your site, but you can also override the global settings on the Post Edit screen for each individual post if necessary.<br><br>
                                </small>
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
                                    placeholder="Leave it blank to use default value"
                                    v-model="postView[field.name]" />

                                <text-area
                                    v-if="field.type === 'textarea'"
                                    slot="field"
                                    placeholder="Leave it blank to use default value"
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
                    </div>
                </tabs>
            </fields-group>

            <p-footer>
                <p-button
                    @click.native="saveAndPreview"
                    slot="buttons"
                    type="primary"
                    :disabled="!siteHasTheme || buttonsLocked">
                    Save &amp; Preview
                </p-button>

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

        <empty-state
            v-if="!siteHasTheme"
            imageName="theme.svg"
            imageWidth="254"
            imageHeight="284"
            title="You haven't selected any theme"
            description="Please go to the Settings and select the theme first.">
            <p-button
                slot="button"
                :onClick="goToSettings">
                Go to settings
            </p-button>
        </empty-state>
    </section>
</template>

<script>
import fs from 'fs';
import Vue from 'vue';
import { ipcRenderer } from 'electron';
import ExternalLinks from './mixins/ExternalLinks';
import Utils from './../helpers/utils.js';

export default {
    name: 'site-settings',
    mixins: [
        ExternalLinks
    ],
    data: function() {
        return {
            buttonsLocked: false,
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

            return tabs;
        },
        postViewThemeSettings () {
            return this.$store.state.currentSite.themeSettings.postConfig;
        }
    },
    beforeMount () {

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
                'colorpicker'
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
        saveAndPreview () {
            this.$bus.$emit('theme-settings-before-save');

            setTimeout(() => {
                this.saveSettings(true);
            }, 500);
        },
        saveSettings(showPreview = false) {
            let newConfig = {
                config: Object.assign({}, this.basic),
                customConfig: Object.assign({}, this.custom),
                postConfig: Object.assign({}, this.postView)
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
                    this.savedSettings(showPreview);
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
        savedSettings(showPreview = false) {
            if (showPreview) {
                if (this.$store.state.app.config.previewLocation !== '' && !fs.existsSync(this.$store.state.app.config.previewLocation)) {
                    this.$bus.$emit('confirm-display', {
                        message: 'The preview catalog does not exist. Please go to the Application Settings and select the correct preview directory first.',
                        okLabel: 'Go to application settings',
                        okClick: () => {
                            this.$router.push(`/app-settings/`);
                        }
                    });
                    return;
                }

                this.$bus.$emit('rendering-popup-display');
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
    max-width: 960px;

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
