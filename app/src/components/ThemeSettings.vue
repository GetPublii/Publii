<template>
    <section
        class="content"
        ref="content">
        <div
            class="theme-settings"
            v-if="siteHasTheme">
            <p-header :title="$t('theme.themeSettings')">
                <p-button
                    @click.native="save"
                    slot="buttons"
                    type="secondary"
                    :disabled="buttonsLocked">
                    {{ $t('settings.saveSettings') }}
                </p-button>

                <btn-dropdown
                    slot="buttons"
                    buttonColor="green"
                    :items="dropdownItems"
                    :disabled="!siteHasTheme || buttonsLocked"
                    localStorageKey="publii-preview-mode"
                    :previewIcon="true"
                    defaultValue="full-site-preview" />
            </p-header>

            <fields-group :title="$t('settings.basicSettings')">
                <field
                    id="name"
                    :label="$t('theme.postsPerPage')">
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
                        {{ $t('theme.postsPerPageInfo') }}
                    </small>
                </field>

                <field
                    id="name"
                    :label="$t('theme.tagsPostsPerPage')">
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
                        {{ $t('theme.tagsPostsPerPageInfo') }}
                    </small>
                </field>

                <field
                    id="name"
                    :label="$t('theme.authorsPostsPerPage')">
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
                        {{ $t('theme.authorsPostsPerPageInfo') }}
                    </small>
                </field>

                <field
                    id="name"
                    :label="$t('theme.excerptLength')">
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
                    :label="$t('theme.websiteLogo')">
                    <image-upload
                        slot="field"
                        v-model="basic.logo"
                        :addMediaFolderPath="true"
                        imageType="optionImages" />
                </field>
            </fields-group>

            <fields-group :title="$t('theme.customSettings')">
                <tabs
                    ref="custom-settings-tabs"
                    id="custom-settings-tabs"
                    :items="customSettingsTabs">
                    <div
                        v-for="(groupName, index) of customSettingsTabs"
                        :slot="'tab-' + index"
                        :key="'tab-' + index">
                        <div v-if="groupName !== $t('theme.postOptions') && groupName !== $t('theme.translations')">
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
                                    :cols="field.cols"
                                    :disabled="field.disabled"></text-area>

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
                                    :addMediaFolderPath="true"
                                    imageType="optionImages"></image-upload>

                                <small-image-upload
                                    v-if="field.type === 'smallupload'"
                                    v-model="custom[field.name]"
                                    :anchor="field.anchor"
                                    imageType="optionImages"
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
                                    :disabled="field.disabled"
                                    :placeholder="field.placeholder"></text-input>

                                <small
                                    v-if="field.note && field.type !== 'separator'"
                                    slot="note"
                                    class="note"
                                    v-pure-html="field.note">
                                </small>
                            </field>
                        </div>

                        <div v-if="groupName === $t('theme.postOptions')">
                            <field>
                                <small
                                    slot="note"
                                    class="note">
                                    {{ $t('theme.postOptionsInfo') }}<br><br>
                                </small>
                            </field>

                            <field
                                v-if="hasPostTemplates"
                                :label="$t('theme.defaultPostTemplate')"
                                key="tab-last-field-0">
                                <dropdown
                                    :items="postTemplates"
                                    v-model="defaultTemplates.post"
                                    id="post-template"
                                    slot="field">
                                    <option
                                        value=""
                                        slot="first-choice">
                                        {{ $t('theme.defaultTemplate') }}
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
                                    :placeholder="field.placeholder ? field.placeholder : $t('theme.leaveBlankToUseDefault')"
                                    v-model="postView[field.name]" />

                                <text-area
                                    v-if="field.type === 'textarea'"
                                    slot="field"
                                    :placeholder="field.placeholder ? field.placeholder : $t('theme.leaveBlankToUseDefault')"
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

                        <div v-if="groupName === $t('theme.translations')">
                            <field>
                                <small
                                    slot="note"
                                    class="note"
                                    v-pure-html="$t('theme.translationsInfo')">
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
                    defaultValue="full-site-preview" />

                <p-button
                    @click.native="save"
                    slot="buttons"
                    type="secondary"
                    :disabled="buttonsLocked">
                    {{ $t('settings.saveSettings') }}
                </p-button>

                <p-button
                    @click.native="reset"
                    slot="buttons"
                    type="outline"
                    :disabled="buttonsLocked">
                    {{ $t('theme.resetThemeSettings') }}
                </p-button>
            </p-footer>
        </div>
    </section>
</template>

<script>
import Vue from 'vue';
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

            tabs.push(this.$t('theme.postOptions'));
            tabs.push(this.$t('theme.translations'));

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
                    label: this.$t('ui.previewFullWebsite'),
                    activeLabel: this.$t('ui.saveAndPreview'),
                    value: 'full-site-preview',
                    isVisible: () => true,
                    icon: 'full-preview-monitor',
                    onClick: this.saveAndPreview.bind(this, 'full-site')
                },
                {
                    label: this.$t('ui.renderFullWebsite'),
                    activeLabel: this.$t('ui.saveAndRender'),
                    value: 'full-site-render',
                    isVisible: () => !!this.$store.state.app.config.enableAdvancedPreview,
                    icon: 'full-render-monitor',
                    onClick: this.saveAndRender.bind(this, 'full-site')
                },
                {
                    label: this.$t('ui.previewFrontPageOnly'),
                    activeLabel: this.$t('ui.saveAndPreview'),
                    value: 'homepage-preview',
                    icon: 'quick-preview',
                    isVisible: () => true,
                    onClick: this.saveAndPreview.bind(this, 'homepage')
                },
                {
                    label: this.$t('ui.renderFrontPageOnly'),
                    activeLabel: this.$t('ui.saveAndRender'),
                    value: 'homepage-render',
                    icon: 'quick-render',
                    isVisible: () => !!this.$store.state.app.config.enableAdvancedPreview,
                    onClick: this.saveAndRender.bind(this, 'homepage')
                }
            ];
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
            let hasGroups = !!inputOptions.filter(option => typeof option.group !== 'undefined').length;

            if (hasGroups) {
                options.hasGroups = true;
                let groups = {
                    ungrouped: {}
                };

                for (let i = 0; i < inputOptions.length; i++) {
                    let groupName = inputOptions[i].group;

                    if (groupName && !groups[groupName]) {
                        groups[groupName] = {};
                    }
                }

                for (let i = 0; i < inputOptions.length; i++) {
                    let inputGroupName = inputOptions[i].group;

                    if (inputGroupName) {
                        groups[inputGroupName][inputOptions[i].value] = {
                            label: inputOptions[i].label,
                            disabled: inputOptions[i].disabled
                        };
                    } else {
                        groups['ungrouped'][inputOptions[i].value] = {
                            label: inputOptions[i].label,
                            disabled: inputOptions[i].disabled
                        };
                    }
                }

                options.groups = groups;
            } else {
                for (let i = 0; i < inputOptions.length; i++) {
                    options[inputOptions[i].value] = {
                        label: inputOptions[i].label,
                        disabled: inputOptions[i].disabled
                    };
                }
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
                this.saveSettings(true, renderingType, false);
            }, 500);
        },
        saveAndRender (renderingType = false) {
            this.$bus.$emit('theme-settings-before-save');

            setTimeout(() => {
                this.saveSettings(true, renderingType, true);
            }, 500);
        },
        saveSettings(showPreview = false, renderingType = false, renderFiles) {
            let newConfig = {
                config: Object.assign({}, this.basic),
                customConfig: Object.assign({}, this.custom),
                postConfig: Object.assign({}, this.postView),
                defaultTemplates: Object.assign({}, this.defaultTemplates)
            };

            // Send request to the back-end
            mainProcessAPI.send('app-site-theme-config-save', {
                "site": this.$store.state.currentSite.config.name,
                "theme": this.$store.state.currentSite.config.theme,
                "config": newConfig
            });

            // Settings saved
            mainProcessAPI.receiveOnce('app-site-theme-config-saved', (data) => {
                if (data.status === true) {
                    this.savedSettings(showPreview, renderingType, renderFiles);
                    this.$store.commit('setThemeConfig', data);
                    this.$bus.$emit('message-display', {
                        message: this.$t('theme.saveSettingsSuccessMessage'),
                        type: 'success',
                        lifeTime: 3
                    });
                }

                this.loadSettings();
            });
        },
        savedSettings(showPreview = false, renderingType = false, renderFiles = false) {
            if (showPreview) {
                if (this.$store.state.app.config.previewLocation !== '' && !mainProcessAPI.existsSync(this.$store.state.app.config.previewLocation)) {
                    this.$bus.$emit('confirm-display', {
                        message: this.$t('sync.previewCatalogDoesNotExistInfo'),
                        okLabel: this.$t('sync.goToAppSettings'),
                        okClick: () => {
                            this.$router.push(`/app-settings/`);
                        }
                    });
                    return;
                }

                if (renderingType === 'homepage') {
                    this.$bus.$emit('rendering-popup-display', {
                        homepageOnly: true,
                        showPreview: !renderFiles,
                    });
                } else {
                    this.$bus.$emit('rendering-popup-display', {
                        showPreview: !renderFiles
                    });
                }
            }
        },
        reset () {
            this.$bus.$emit('confirm-display', {
                message: this.$t('theme.settingsResetMessage'),
                okClick: this.resetSettings
            });
        },
        resetSettings () {
            // Send request to the back-end
            mainProcessAPI.send('app-site-theme-config-save', {
                "site": this.$store.state.currentSite.config.name,
                "theme": this.$store.state.currentSite.config.theme,
                "config": {}
            });

            // Settings saved
            mainProcessAPI.receiveOnce('app-site-theme-config-saved', (data) => {
                if (data.status === true) {
                    this.savedSettings(false);
                    this.$store.commit('setThemeConfig', data);
                }

                this.loadSettings();

                this.$bus.$emit('message-display', {
                    message: this.$t('theme.settingsResetSuccessMessage'),
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
            margin-bottom: 1rem;
        }
    }

    textarea {
        height: 200px;
    }
}
</style>
