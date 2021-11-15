<template>
    <section class="content wp-import">
        <p-header :title="pluginName">
            <p-button
                :onClick="goBack"
                slot="buttons"
                type="outline">
                {{ $t('ui.backToTools') }}
            </p-button>

            <p-button
                v-if="hasPluginCustomOptions && pluginStandardOptionsVisible"
                :onClick="showPluginCustomOptions"
                slot="buttons"
                type="primary">
                {{ $t('ui.goToPluginCustomOptions') }}
            </p-button>

            <p-button
                v-if="hasPluginCustomOptions && !pluginStandardOptionsVisible"
                :onClick="showPluginStandardOptions"
                slot="buttons"
                type="primary">
                {{ $t('ui.goToPluginStandardOptions') }}
            </p-button>
        </p-header>

        <template v-if="pluginStandardOptionsVisible">
            <fields-group
                v-for="(groupName, index) of settingsGroups"
                :key="'settings-group-' + index"
                :title="groupName">
                <template v-for="(field, subindex) of getFieldsByGroupName(groupName)">
                    <field
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
                            v-model="settingsValues[field.name]"
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
                            v-model="settingsValues[field.name]"
                            :anchor="field.anchor"
                            :spellcheck="$store.state.currentSite.config.spellchecking && field.spellcheck"
                            :cols="field.cols"></text-area>

                        <text-area
                            v-if="field.type === 'wysiwyg'"
                            slot="field"
                            :id="'theme-settings-' + index"
                            v-model="settingsValues[field.name]"
                            :anchor="field.anchor"
                            :wysiwyg="true"></text-area>

                        <image-upload
                            v-if="field.type === 'upload'"
                            v-model="settingsValues[field.name]"
                            slot="field"
                            :anchor="field.anchor"
                            :addMediaFolderPath="true"></image-upload>

                        <small-image-upload
                            v-if="field.type === 'smallupload'"
                            v-model="settingsValues[field.name]"
                            :anchor="field.anchor"
                            slot="field"></small-image-upload>

                        <radio-buttons
                            v-if="field.type === 'radio'"
                            :items="field.options"
                            :name="field.name"
                            v-model="settingsValues[field.name]"
                            :anchor="field.anchor"
                            slot="field" />

                        <dropdown
                            v-if="field.type === 'select'"
                            slot="field"
                            :multiple="field.multiple"
                            v-model="settingsValues[field.name]"
                            :id="field.anchor"
                            :items="getDropdownOptions(field.options)"></dropdown>

                        <switcher
                            v-if="field.type === 'checkbox'"
                            v-model="settingsValues[field.name]"
                            :lower-zindex="true"
                            :anchor="field.anchor"
                            slot="field"></switcher>

                        <color-picker
                            v-if="field.type === 'colorpicker'"
                            v-model="settingsValues[field.name]"
                            :data-field="field.name"
                            :anchor="field.anchor"
                            slot="field"></color-picker>

                        <posts-dropdown
                            v-if="field.type === 'posts-dropdown'"
                            v-model="settingsValues[field.name]"
                            :allowed-post-status="field.allowedPostStatus || ['any']"
                            :multiple="field.multiple"
                            :anchor="field.anchor"
                            slot="field"></posts-dropdown>

                        <tags-dropdown
                            v-if="field.type === 'tags-dropdown'"
                            v-model="settingsValues[field.name]"
                            :multiple="field.multiple"
                            :anchor="field.anchor"
                            slot="field"></tags-dropdown>

                        <authors-dropdown
                            v-if="field.type === 'authors-dropdown'"
                            v-model="settingsValues[field.name]"
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
                            v-model="settingsValues[field.name]"
                            :anchor="field.anchor"
                            :placeholder="field.placeholder"></text-input>

                        <small
                            v-if="field.note && field.type !== 'separator'"
                            slot="note"
                            class="note"
                            v-pure-html="field.note">
                        </small>
                    </field>
                </template>
            </fields-group>

            <p-footer>
                <p-button
                    @click.native="saveSettings"
                    slot="buttons"
                    type="secondary"
                    :disabled="buttonsLocked">
                    {{ $t('settings.saveSettings') }}
                </p-button>
            </p-footer>
        </template>
        <template v-else>
            CUSTOM OPTIONS
        </template>
    </section>
</template>

<script>
import BackToTools from './mixins/BackToTools.js';
import Vue from 'vue';
// import { compileToFunctions } from 'vue-template-compiler';

export default {
    name: 'tools-plugin',
    mixins: [
        BackToTools
    ],
    computed: {
        settingsGroups () {
            let groups = [];

            this.settings.forEach(item => {
                if (groups.indexOf(item.group) === -1) {
                    groups.push(item.group);
                }
            });

            return groups;
        }
    },
    data () {
        return {
            pluginName: '',
            settings: [],
            settingsValues: {},
            buttonsLocked: false,
            hasPluginCustomOptions: false,
            pluginStandardOptionsVisible: true
        };
    },
    mounted () {
        this.loadPluginConfig(this.$route.params.pluginname, this.$route.params.name);
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

                if (this.hasPluginCustomOptions) {
                    this.pluginStandardOptionsVisible = false;
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

                if (dependencyValue === "true" && this.settings[dependencyName] !== true) {
                    return false;
                } else if (dependencyValue === "true") {
                    continue;
                }

                if (dependencyValue === "false" && this.settings[dependencyName] !== false) {
                    return false;
                } else if (dependencyValue === "false") {
                    continue;
                }

                if (typeof dependencyValue === 'string' && dependencyValue.indexOf(',') > -1) {
                    let values = dependencyValue.split(',');

                    for (let i = 0; i < values.length; i++) {
                        if (this.settings[dependencyName] === values[i]) {
                            continue;
                        }
                    }

                    return false;
                }

                if (dependencyValue !== this.settings[dependencyName]) {
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
        getFieldsByGroupName (groupName) {
            return this.settings.filter(field => field.group === groupName);
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
                    if (typeof savedConfig[field.name] !== 'undefined') {
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
        saveSettings () {
            mainProcessAPI.send('app-site-save-plugin-config', {
                siteName: this.$route.params.name,
                pluginName: this.$route.params.pluginname,
                newConfig: this.settingsValues
            });

            mainProcessAPI.receiveOnce('app-site-plugin-config-saved', (result) => {
                if (result === true) {
                    this.$bus.$emit('message-display', {
                        message: this.$t('toolsPlugin.pluginSettingsSaveSuccess'),
                        type: 'success',
                        lifeTime: 3
                    });
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
        }
    }
}
</script>

<style lang="scss" scoped>
@import '../scss/variables.scss';
</style>
