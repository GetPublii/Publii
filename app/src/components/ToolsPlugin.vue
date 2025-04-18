<template>
    <section class="content">
        <div class="plugin-content">
            <p-header :title="pluginName">
                <p-button
                    :onClick="goBack"
                    slot="buttons"
                    type="clean back">
                    {{ $t('ui.backToTools') }}
                </p-button>

                <p-button
                    v-if="pluginHasConfig && hasPluginCustomOptions && pluginStandardOptionsVisible"
                    :onClick="showPluginCustomOptions"
                    slot="buttons"
                    type="clean back icon" 
                    icon="settings">
                    {{ $t('ui.goToPluginCustomOptions') }}
                </p-button>

                <p-button
                    v-if="pluginHasConfig && hasPluginCustomOptions && !pluginStandardOptionsVisible"
                    :onClick="showPluginStandardOptions"
                    slot="buttons"
                    type="clean back icon" 
                    icon="settings">
                    {{ $t('ui.goToPluginStandardOptions') }}
                </p-button>

                <p-button
                    v-if="pluginStandardOptionsVisible"
                    @click.native="save(false, false, false)"
                    slot="buttons"
                    type="secondary"
                    :disabled="buttonsLocked">
                    {{ $t('settings.saveSettings') }}
                </p-button>

                <btn-dropdown
                    v-if="!previewNotRequired"
                    slot="buttons"
                    buttonColor="green"
                    :items="dropdownItems"
                    :disabled="!siteHasTheme || buttonsLocked"
                    localStorageKey="publii-preview-mode"
                    :previewIcon="true"
                    defaultValue="full-site-preview" />
            </p-header>

            <supported-features-check
                v-if="requiredFeatures"
                :featuresToCheck="requiredFeatures" />

            <div
                v-if="hasMessage"
                :class="'msg msg-icon msg-' + messageInOptions.type">
                <icon
                    :name="messageInOptions.type"
                    customWidth="28"
                    customHeight="28" />
                <div>
                    {{ messageInOptions.text }}
                </div>
            </div>

            <template v-if="!pluginHasConfig && !hasPluginCustomOptions">
                <p>{{ $t('toolsPlugin.thisPluginHasNoOptions') }}</p>
            </template>

            <template v-if="pluginHasConfig && pluginStandardOptionsVisible">
                <fields-group
                    v-if="pluginSettingsDisplay === 'tabs'"
                    :title="pluginSettingsTabsLabel">
                    <tabs
                        ref="custom-settings-tabs"
                        id="custom-settings-tabs"
                        :items="settingsGroups">
                        <div
                            v-for="(groupName, index) of settingsGroups"
                            :slot="'tab-' + index"
                            :key="'tab-' + index">
                            <div>
                                <template v-for="(field, subindex) of getFieldsByGroupName(groupName)">
                                    <field
                                        v-if="checkDependencies(field.dependencies)"
                                        :label="getFieldLabel(field)"
                                        :labelHidden="getFieldLabel(field) === ' '"
                                        :key="'tab-' + index + '-field-' + subindex"
                                        :noLabelSpace="field.type === 'separator'"
                                        :labelFullWidth="field.type === 'wysiwyg'">
                                        <range-slider
                                            v-if="field.type === 'range'"
                                            :min="field.min"
                                            :max="field.max"
                                            :step="field.step"
                                            v-model="settingsValues[field.name]"
                                            :anchor="field.anchor"
                                            slot="field"
                                            :customCssClasses="field.customCssClasses"></range-slider>

                                        <separator
                                            v-if="field.type === 'separator'"
                                            slot="field"
                                            :type="field.size"
                                            :label="field.label"
                                            :anchor="field.anchor"
                                            :note="field.note"
                                            :customCssClasses="field.customCssClasses"></separator>

                                        <text-area
                                            v-if="field.type === 'textarea'"
                                            slot="field"
                                            :rows="field.rows"
                                            v-model="settingsValues[field.name]"
                                            :anchor="field.anchor"
                                            :spellcheck="$store.state.currentSite.config.spellchecking && field.spellcheck"
                                            :cols="field.cols"
                                            :customCssClasses="field.customCssClasses"
                                            :disabled="field.disabled"></text-area>

                                        <text-area
                                            v-if="field.type === 'wysiwyg'"
                                            slot="field"
                                            :id="'theme-settings-' + index"
                                            v-model="settingsValues[field.name]"
                                            :anchor="field.anchor"
                                            :wysiwyg="true"
                                            :miniEditorMode="true"
                                            :customCssClasses="field.customCssClasses"></text-area>

                                        <image-upload
                                            v-if="field.type === 'upload'"
                                            v-model="settingsValues[field.name]"
                                            slot="field"
                                            :anchor="field.anchor"
                                            imageType="pluginImages"
                                            :pluginDir="$route.params.pluginname"
                                            :addMediaFolderPath="false"
                                            :onBeforeRemove="removePluginImage"
                                            :customCssClasses="field.customCssClasses"></image-upload>

                                        <small-image-upload
                                            v-if="field.type === 'smallupload'"
                                            v-model="settingsValues[field.name]"
                                            :anchor="field.anchor"
                                            imageType="pluginImages"
                                            :pluginDir="$route.params.pluginname"
                                            slot="field"
                                            :onBeforeRemove="removePluginImage"
                                            :customCssClasses="field.customCssClasses"></small-image-upload>

                                        <radio-buttons
                                            v-if="field.type === 'radio'"
                                            :items="field.options"
                                            :name="field.name"
                                            v-model="settingsValues[field.name]"
                                            :anchor="field.anchor"
                                            slot="field"
                                            :customCssClasses="field.customCssClasses" />

                                        <dropdown
                                            v-if="field.type === 'select'"
                                            slot="field"
                                            :multiple="field.multiple"
                                            v-model="settingsValues[field.name]"
                                            :id="field.anchor"
                                            :items="getDropdownOptions(field.options)"
                                            :customCssClasses="field.customCssClasses"></dropdown>

                                        <switcher
                                            v-if="field.type === 'checkbox'"
                                            v-model="settingsValues[field.name]"
                                            :lower-zindex="true"
                                            :anchor="field.anchor"
                                            slot="field"
                                            :customCssClasses="field.customCssClasses"></switcher>

                                        <color-picker
                                            v-if="field.type === 'colorpicker'"
                                            v-model="settingsValues[field.name]"
                                            :data-field="field.name"
                                            :anchor="field.anchor"
                                            :outputFormat="field.outputFormat ? field.outputFormat : 'RGBAorHEX'"
                                            slot="field"
                                            :customCssClasses="field.customCssClasses"></color-picker>

                                        <posts-dropdown
                                            v-if="field.type === 'posts-dropdown'"
                                            v-model="settingsValues[field.name]"
                                            :allowed-post-status="field.allowedPostStatus || ['any']"
                                            :multiple="field.multiple"
                                            :anchor="field.anchor"
                                            slot="field"
                                            :customCssClasses="field.customCssClasses"></posts-dropdown>
                                        
                                        <pages-dropdown
                                            v-if="field.type === 'pages-dropdown'"
                                            v-model="settingsValues[field.name]"
                                            :multiple="field.multiple"
                                            :anchor="field.anchor"
                                            slot="field"
                                            :customCssClasses="field.customCssClasses"></pages-dropdown>

                                        <tags-dropdown
                                            v-if="field.type === 'tags-dropdown'"
                                            v-model="settingsValues[field.name]"
                                            :multiple="field.multiple"
                                            :anchor="field.anchor"
                                            slot="field"
                                            :customCssClasses="field.customCssClasses"></tags-dropdown>

                                        <authors-dropdown
                                            v-if="field.type === 'authors-dropdown'"
                                            v-model="settingsValues[field.name]"
                                            :multiple="field.multiple"
                                            :anchor="field.anchor"
                                            slot="field"
                                            :customCssClasses="field.customCssClasses"></authors-dropdown>

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
                                            v-model="settingsValues[field.name]"
                                            :anchor="field.anchor"
                                            :disabled="field.disabled"
                                            :placeholder="field.placeholder"
                                            :customCssClasses="field.customCssClasses"></text-input>

                                        <repeater
                                            v-if="field.type === 'repeater'" 
                                            slot="field"
                                            :structure="field.structure"
                                            v-model="settingsValues[field.name]"
                                            :translations="field.translations"
                                            :maxCount="field.maxCount"
                                            :hasEmptyState="field.hasEmptyState"
                                            :hideLabels="field.hideLabels"
                                            :anchor="field.anchor"
                                            :settings="settingsValues"
                                            :customCssClasses="field.customCssClasses"
                                            imageType="pluginImages"
                                            :pluginDir="$route.params.pluginname" />

                                        <small
                                            v-if="field.note && field.type !== 'separator'"
                                            slot="note"
                                            class="note"
                                            v-pure-html="field.note">
                                        </small>
                                    </field>
                                </template>
                            </div>
                        </div>
                    </tabs>
                </fields-group>
                
                <template v-if="pluginSettingsDisplay === 'fieldsets'">
                    <fields-group
                        v-for="(groupName, index) of settingsGroups"
                        :key="'settings-group-' + index"
                        :title="groupName">
                        <template v-for="(field, subindex) of getFieldsByGroupName(groupName)">
                            <field
                                v-if="checkDependencies(field.dependencies)"
                                :label="getFieldLabel(field)"
                                :labelHidden="getFieldLabel(field) === ' '"
                                :key="'tab-' + index + '-field-' + subindex"
                                :noLabelSpace="field.type === 'separator'"
                                :labelFullWidth="field.type === 'wysiwyg'">
                                <range-slider
                                    v-if="field.type === 'range'"
                                    :min="field.min"
                                    :max="field.max"
                                    :step="field.step"
                                    v-model="settingsValues[field.name]"
                                    :anchor="field.anchor"
                                    slot="field"
                                    :customCssClasses="field.customCssClasses"></range-slider>

                                <separator
                                    v-if="field.type === 'separator'"
                                    slot="field"
                                    :type="field.size"
                                    :label="field.label"
                                    :anchor="field.anchor"
                                    :note="field.note"
                                    :customCssClasses="field.customCssClasses"></separator>

                                <text-area
                                    v-if="field.type === 'textarea'"
                                    slot="field"
                                    :rows="field.rows"
                                    v-model="settingsValues[field.name]"
                                    :anchor="field.anchor"
                                    :spellcheck="$store.state.currentSite.config.spellchecking && field.spellcheck"
                                    :disabled="field.disabled"
                                    :cols="field.cols"
                                    :customCssClasses="field.customCssClasses"></text-area>

                                <text-area
                                    v-if="field.type === 'wysiwyg'"
                                    slot="field"
                                    :id="'theme-settings-' + index"
                                    v-model="settingsValues[field.name]"
                                    :anchor="field.anchor"
                                    :wysiwyg="true"
                                    :miniEditorMode="true"
                                    :customCssClasses="field.customCssClasses"></text-area>

                                <image-upload
                                    v-if="field.type === 'upload'"
                                    v-model="settingsValues[field.name]"
                                    slot="field"
                                    :anchor="field.anchor"
                                    imageType="pluginImages"
                                    :pluginDir="$route.params.pluginname"
                                    :addMediaFolderPath="false"
                                    :onBeforeRemove="removePluginImage"
                                    :customCssClasses="field.customCssClasses"></image-upload>

                                <small-image-upload
                                    v-if="field.type === 'smallupload'"
                                    v-model="settingsValues[field.name]"
                                    :anchor="field.anchor"
                                    imageType="pluginImages"
                                    :pluginDir="$route.params.pluginname"
                                    slot="field"
                                    :onBeforeRemove="removePluginImage"
                                    :customCssClasses="field.customCssClasses"></small-image-upload>

                                <radio-buttons
                                    v-if="field.type === 'radio'"
                                    :items="field.options"
                                    :name="field.name"
                                    v-model="settingsValues[field.name]"
                                    :anchor="field.anchor"
                                    slot="field"
                                    :customCssClasses="field.customCssClasses" />

                                <dropdown
                                    v-if="field.type === 'select'"
                                    slot="field"
                                    :multiple="field.multiple"
                                    v-model="settingsValues[field.name]"
                                    :id="field.anchor"
                                    :items="getDropdownOptions(field.options)"
                                    :customCssClasses="field.customCssClasses"></dropdown>

                                <switcher
                                    v-if="field.type === 'checkbox'"
                                    v-model="settingsValues[field.name]"
                                    :lower-zindex="true"
                                    :anchor="field.anchor"
                                    slot="field"
                                    :customCssClasses="field.customCssClasses"></switcher>

                                <color-picker
                                    v-if="field.type === 'colorpicker'"
                                    v-model="settingsValues[field.name]"
                                    :data-field="field.name"
                                    :anchor="field.anchor"
                                    :outputFormat="field.outputFormat ? field.outputFormat : 'RGBAorHEX'"
                                    slot="field"
                                    :customCssClasses="field.customCssClasses"></color-picker>

                                <posts-dropdown
                                    v-if="field.type === 'posts-dropdown'"
                                    v-model="settingsValues[field.name]"
                                    :allowed-post-status="field.allowedPostStatus || ['any']"
                                    :multiple="field.multiple"
                                    :anchor="field.anchor"
                                    slot="field"
                                    :customCssClasses="field.customCssClasses"></posts-dropdown>

                                <pages-dropdown
                                    v-if="field.type === 'pages-dropdown'"
                                    v-model="settingsValues[field.name]"
                                    :multiple="field.multiple"
                                    :anchor="field.anchor"
                                    slot="field"
                                    :customCssClasses="field.customCssClasses"></pages-dropdown>

                                <tags-dropdown
                                    v-if="field.type === 'tags-dropdown'"
                                    v-model="settingsValues[field.name]"
                                    :multiple="field.multiple"
                                    :anchor="field.anchor"
                                    slot="field"
                                    :customCssClasses="field.customCssClasses"></tags-dropdown>

                                <authors-dropdown
                                    v-if="field.type === 'authors-dropdown'"
                                    v-model="settingsValues[field.name]"
                                    :multiple="field.multiple"
                                    :anchor="field.anchor"
                                    slot="field"
                                    :customCssClasses="field.customCssClasses"></authors-dropdown>

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
                                    v-model="settingsValues[field.name]"
                                    :anchor="field.anchor"
                                    :disabled="field.disabled"
                                    :placeholder="field.placeholder"
                                    :customCssClasses="field.customCssClasses"></text-input>

                                <repeater
                                    v-if="field.type === 'repeater'" 
                                    slot="field"
                                    :structure="field.structure"
                                    v-model="settingsValues[field.name]"
                                    :translations="field.translations"
                                    :maxCount="field.maxCount"
                                    :hasEmptyState="field.hasEmptyState"
                                    :hideLabels="field.hideLabels"
                                    :anchor="field.anchor"
                                    :settings="settingsValues"
                                    :customCssClasses="field.customCssClasses"
                                    imageType="pluginImages"
                                    :pluginDir="$route.params.pluginname" />

                                <small
                                    v-if="field.note && field.type !== 'separator'"
                                    slot="note"
                                    class="note"
                                    v-pure-html="field.note">
                                </small>
                            </field>
                        </template>
                    </fields-group>
                </template>

                <p-footer>
                    <btn-dropdown
                        v-if="!previewNotRequired"
                        slot="buttons"
                        buttonColor="green"
                        type="is-reversed"
                        :items="dropdownItems"
                        :disabled="!siteHasTheme || buttonsLocked"
                        localStorageKey="publii-preview-mode"
                        :previewIcon="true"
                        :isReversed="true"
                        defaultValue="full-site-preview" />

                    <p-button
                        v-if="pluginStandardOptionsVisible"
                        @click.native="save(false, false, false)"
                        slot="buttons"
                        type="secondary"
                        :disabled="buttonsLocked">
                        {{ $t('settings.saveSettings') }}
                    </p-button>
                </p-footer>
            </template>
            <template v-else>
                <iframe 
                    id="plugin-settings-root"
                    :src="this.pluginPath + '/options/index.html'"></iframe>
            </template>
        </div>
    </section>
</template>

<script>
import BackToTools from './mixins/BackToTools.js';
import SupportedFeaturesCheck from './basic-elements/SupportedFeaturesCheck.vue';
import Repeater from './basic-elements/Repeater';
import Vue from 'vue';

export default {
    name: 'tools-plugin',
    mixins: [
        BackToTools
    ],
    components: {
        'supported-features-check': SupportedFeaturesCheck,
        'repeater': Repeater
    },
    computed: {
        settingsGroups () {
            let groups = [];

            this.settings.forEach(item => {
                if (groups.indexOf(item.group) === -1) {
                    groups.push(item.group);
                }
            });

            return groups;
        },
        pluginHasConfig () {
            return !!this.settings.length;
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
        },
        siteHasTheme () {
            return !!this.$store.state.currentSite.config.theme;
        }
    },
    data () {
        return {
            pluginName: '',
            pluginPath: '',
            settings: [],
            settingsValues: {},
            buttonsLocked: false,
            hasMessage: false,
            hasPluginCustomOptions: false,
            messageInOptions: null,
            requiredFeatures: null,
            pluginStandardOptionsVisible: true,
            pluginSettingsDisplay: 'fieldsets',
            pluginSettingsTabsLabel: '',
            previewNotRequired: false
        };
    },
    async mounted () {
        this.loadPluginConfig(this.$route.params.pluginname, this.$route.params.name);
        document.getElementById('plugin-settings-root').addEventListener('load', async function () {
            this.contentWindow.window.document.querySelector('html').setAttribute('data-theme', await window.app.getCurrentAppTheme());
        }, false);
    },
    methods: {
        loadPluginConfig (pluginName, siteName) {
            mainProcessAPI.send('app-site-get-plugin-config', {
                siteName,
                pluginName
            });

            mainProcessAPI.receiveOnce('app-site-get-plugin-config-retrieved', result => {
                if (!result) {
                    this.$bus.$emit('alert-display', {
                        message: this.$t('tools.pluginLoadError'),
                        buttonStyle: 'danger'
                    });
                    return;
                }

                this.pluginName = result.pluginData.name;
                this.hasPluginCustomOptions = !!result.pluginData.usePluginSettingsView;
                this.hasMessage = !!result.pluginData.messageInOptions;
                this.messageInOptions = result.pluginData.messageInOptions;
                this.requiredFeatures = result.pluginData.requiredFeatures || [];
                this.pluginSettingsDisplay = result.pluginData.settingsDisplay || 'fieldsets';
                this.pluginSettingsTabsLabel = result.pluginData.tabsTitle || this.$t('toolsPlugin.tabsLabel');
                this.previewNotRequired = result.pluginData.previewNotRequired || false;

                if (this.hasPluginCustomOptions) {
                    this.pluginStandardOptionsVisible = false;
                    this.pluginPath = result.pluginData.path;
                }

                if (result.pluginData.useCustomCssForOptions) {
                    this.pluginPath = result.pluginData.path;
                    this.loadAdditionalCss();
                }

                this.loadSettings(result.pluginData.config, result.pluginConfig);
            });
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
        checkDependencies (dependencies) {
            if (!dependencies || !dependencies.length) {
                return true;
            }

            for (let i = 0; i < dependencies.length; i++) {
                let dependencyName = dependencies[i].field;
                let dependencyValue = dependencies[i].value;

                if (
                    Array.isArray(this.settingsValues[dependencyName]) && 
                    dependencyValue.indexOf('=') > -1
                ) {
                    let dependencyData = this.settingsValues[dependencyName];
                    let fieldName = dependencyValue.split('=')[0];
                    let acceptedValues = [];
                    let isValidDependency = false;

                    if (dependencyValue.split('=')[1]) {
                        acceptedValues = dependencyValue.split('=')[1].split(',');
                    }

                    for (let i = 0; i < dependencyData.length; i++) {
                        let dataRow = dependencyData[i];
                        let valueToCompare = dataRow[fieldName];

                        if (valueToCompare === true) {
                            valueToCompare = 'true';
                        } else if (valueToCompare === false) {
                            valueToCompare = 'false';
                        }

                        if (acceptedValues.indexOf(valueToCompare) > -1) {
                            isValidDependency = true;
                        }
                    }

                    if (!isValidDependency) {
                        return false;
                    }

                    continue;
                }

                if (dependencyValue === "true" && this.settingsValues[dependencyName] !== true) {
                    return false;
                } else if (dependencyValue === "true") {
                    continue;
                }

                if (dependencyValue === "false" && this.settingsValues[dependencyName] !== false) {
                    return false;
                } else if (dependencyValue === "false") {
                    continue;
                }

                if (typeof dependencyValue === 'string' && dependencyValue.indexOf(',') > -1) {
                    let values = dependencyValue.split(',');
                    let isValidDependency = false;

                    for (let i = 0; i < values.length; i++) {
                        if (this.settingsValues[dependencyName] === values[i]) {
                            isValidDependency = true;
                        }
                    }

                    return isValidDependency;
                }

                if (dependencyValue !== this.settingsValues[dependencyName]) {
                    return false;
                }
            }

            return true;
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
                'tags-dropdown',
                'repeater'
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
        getFieldsByGroupName (groupName) {
            return this.settings.filter(field => field.group === groupName);
        },
        loadAdditionalCss () {
            let customCssPath = this.pluginPath + '/plugin-options.css?v=' + (+new Date());

            if (!document.querySelector('#custom-plugin-options-css')) {
                $(document.body).append($('<link rel="stylesheet" id="custom-plugin-options-css" href="' + customCssPath + '" />'));
            }
        },
        loadSettings (config, savedConfig) {
            try {
                this.settings = JSON.parse(JSON.stringify(config));
                savedConfig = JSON.parse(savedConfig);
            } catch (e) {
                this.$bus.$emit('message-display', {
                    message: this.$t('toolsPlugin.pluginSettingsLoadError'),
                    type: 'warning',
                    lifeTime: 3
                });
                return;
            }

            let settings = config.map(field => {
                if (field.type !== 'separator') {
                    if (savedConfig && typeof savedConfig[field.name] !== 'undefined') {
                        return [field.name, savedConfig[field.name]];
                    }

                    return [field.name, field.value];
                }

                return false;
            });

            for (let setting of settings) {
                if (setting) {
                    Vue.set(this.settingsValues, setting[0], setting[1]);
                }
            }
        },
        saveAndPreview (renderingType = false) {
            this.save(true, renderingType, false);
        },
        saveAndRender (renderingType = false) {
            this.save(true, renderingType, true);
        },
        save (showPreview = false, renderingType = false, renderFiles = false) {
            this.$bus.$emit('plugin-settings-before-save');

            setTimeout(async () => {
                await this.saveSettings(showPreview, renderingType, renderFiles);
            }, 500);
        },
        async saveSettings (showPreview = false, renderingType = false, renderFiles = false) {
            mainProcessAPI.send('app-site-save-plugin-config', {
                siteName: this.$route.params.name,
                pluginName: this.$route.params.pluginname,
                newConfig: this.settingsValues
            });

            mainProcessAPI.receiveOnce('app-site-plugin-config-saved', async (result) => {
                if (result === true) {
                    this.$bus.$emit('message-display', {
                        message: this.$t('toolsPlugin.pluginSettingsSaveSuccess'),
                        type: 'success',
                        lifeTime: 3
                    });

                    if (showPreview) {
                        let previewLocationExists = await mainProcessAPI.existsSync(this.$store.state.app.config.previewLocation);

                        if (this.$store.state.app.config.previewLocation !== '' && !previewLocationExists) {
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
                } else {
                    this.$bus.$emit('message-display', {
                        message: this.$t('toolsPlugin.pluginSettingsSaveError'),
                        type: 'warning',
                        lifeTime: 3
                    });
                }
            });
        },
        showPluginCustomOptions () {
            this.pluginStandardOptionsVisible = false;
        },
        showPluginStandardOptions () {
            this.pluginStandardOptionsVisible = true;
        },
        removePluginImage (filePath) {
            if (filePath) {
                mainProcessAPI.send('app-image-upload-remove', filePath, this.$route.params.name);
            }
        }
    },
    beforeDestroy () {
        if (document.querySelector('#custom-plugin-options-css')) {
            $('#custom-plugin-options-css').remove();
        }
    }
}
</script>

<style lang="scss" scoped>
@import '../scss/variables.scss';
@import '../scss/notifications.scss';

#plugin-settings-root {
    border: none;
    height: calc(100vh - 200px);
    width: 100%;
}

.plugin-content {
    margin: 0 auto;
    max-width: $wrapper; 
    user-select: none;
}

.msg {
    background: var(--bg-secondary);
    margin-bottom: 3rem;

    & + .msg {
        margin-top: -2rem;
    }
}
</style>
