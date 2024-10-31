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
                        v-for="(groupName, index) of customSettingsTabsNames"
                        :slot="'tab-' + index"
                        :key="'tab-' + index">
                        <div v-if="groupName !== $t('theme.postOptions') && groupName !== $t('theme.translations')">
                            <field
                                v-for="(field, subindex) of getFieldsByGroupName(groupName)"
                                v-if="checkDependencies(field.dependencies)"
                                :label="getFieldLabel(field)"
                                :key="'tab-' + index + '-field-' + subindex"
                                :noLabelSpace="field.type === 'separator'"
                                :labelFullWidth="field.type === 'wysiwyg' || field.type === 'repeater'">
                                <range-slider
                                    v-if="field.type === 'range'"
                                    :min="field.min"
                                    :max="field.max"
                                    :step="field.step"
                                    v-model="custom[field.name]"
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
                                    v-model="custom[field.name]"
                                    :anchor="field.anchor"
                                    :spellcheck="$store.state.currentSite.config.spellchecking && field.spellcheck"
                                    :cols="field.cols"
                                    :disabled="field.disabled"
                                    :customCssClasses="field.customCssClasses"></text-area>

                                <text-area
                                    v-if="field.type === 'wysiwyg'"
                                    slot="field"
                                    :id="'theme-settings-' + index"
                                    v-model="custom[field.name]"
                                    :anchor="field.anchor"
                                    :wysiwyg="true"
                                    :miniEditorMode="true"
                                    :customCssClasses="field.customCssClasses"></text-area>

                                <image-upload
                                    v-if="field.type === 'upload'"
                                    v-model="custom[field.name]"
                                    slot="field"
                                    :anchor="field.anchor"
                                    :addMediaFolderPath="true"
                                    imageType="optionImages"
                                    :customCssClasses="field.customCssClasses"></image-upload>

                                <small-image-upload
                                    v-if="field.type === 'smallupload'"
                                    v-model="custom[field.name]"
                                    :anchor="field.anchor"
                                    imageType="optionImages"
                                    slot="field"
                                    :customCssClasses="field.customCssClasses"></small-image-upload>

                                <radio-buttons
                                    v-if="field.type === 'radio'"
                                    :items="field.options"
                                    :name="field.name"
                                    v-model="custom[field.name]"
                                    :anchor="field.anchor"
                                    slot="field"
                                    :customCssClasses="field.customCssClasses" />

                                <dropdown
                                    v-if="field.type === 'select'"
                                    slot="field"
                                    :multiple="field.multiple"
                                    v-model="custom[field.name]"
                                    :id="field.anchor"
                                    :items="getDropdownOptions(field.options)"
                                    :customCssClasses="field.customCssClasses"></dropdown>

                                <switcher
                                    v-if="field.type === 'checkbox'"
                                    v-model="custom[field.name]"
                                    :lower-zindex="true"
                                    :anchor="field.anchor"
                                    slot="field"
                                    :customCssClasses="field.customCssClasses"></switcher>

                                <color-picker
                                    v-if="field.type === 'colorpicker'"
                                    v-model="custom[field.name]"
                                    :data-field="field.name"
                                    :anchor="field.anchor"
                                    :outputFormat="field.outputFormat ? field.outputFormat : 'RGBAorHEX'"
                                    slot="field"
                                    :customCssClasses="field.customCssClasses"></color-picker>

                                <posts-dropdown
                                    v-if="field.type === 'posts-dropdown'"
                                    v-model="custom[field.name]"
                                    :allowed-post-status="field.allowedPostStatus || ['any']"
                                    :multiple="field.multiple"
                                    :anchor="field.anchor"
                                    slot="field"
                                    :customCssClasses="field.customCssClasses"></posts-dropdown>

                                <pages-dropdown
                                    v-if="field.type === 'pages-dropdown'"
                                    v-model="custom[field.name]"
                                    :multiple="field.multiple"
                                    :anchor="field.anchor"
                                    slot="field"
                                    :customCssClasses="field.customCssClasses"></pages-dropdown>

                                <tags-dropdown
                                    v-if="field.type === 'tags-dropdown'"
                                    v-model="custom[field.name]"
                                    :multiple="field.multiple"
                                    :anchor="field.anchor"
                                    slot="field"
                                    :customCssClasses="field.customCssClasses"></tags-dropdown>

                                <authors-dropdown
                                    v-if="field.type === 'authors-dropdown'"
                                    v-model="custom[field.name]"
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
                                    v-model="custom[field.name]"
                                    :anchor="field.anchor"
                                    :disabled="field.disabled"
                                    :placeholder="field.placeholder"
                                    :customCssClasses="field.customCssClasses"></text-input>

                                <repeater
                                    v-if="field.type === 'repeater'" 
                                    slot="field"
                                    :structure="field.structure"
                                    v-model="custom[field.name]"
                                    :translations="field.translations"
                                    :maxCount="field.maxCount"
                                    :hasEmptyState="field.hasEmptyState"
                                    :hideLabels="field.hideLabels"
                                    :anchor="field.anchor"
                                    :settings="custom"
                                    imageType="optionImages"
                                    :customCssClasses="field.customCssClasses" />

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
                                    :items="getDropdownViewOptions(field.options)"
                                    slot="field"
                                    :customCssClasses="field.customCssClasses"
                                    v-model="postView[field.name]">
                                </dropdown>

                                <text-input
                                    v-if="field.type === 'text' || field.type === 'number'"
                                    :type="field.type"
                                    slot="field"
                                    :spellcheck="$store.state.currentSite.config.spellchecking && field.spellcheck"
                                    :placeholder="field.placeholder ? field.placeholder : $t('theme.leaveBlankToUseDefault')"
                                    v-model="postView[field.name]"
                                    :customCssClasses="field.customCssClasses" />

                                <text-area
                                    v-if="field.type === 'textarea'"
                                    slot="field"
                                    :placeholder="field.placeholder ? field.placeholder : $t('theme.leaveBlankToUseDefault')"
                                    :spellcheck="$store.state.currentSite.config.spellchecking && field.spellcheck"
                                    v-model="postView[field.name]"
                                    :customCssClasses="field.customCssClasses" />

                                <color-picker
                                    v-if="field.type === 'colorpicker'"
                                    slot="field"
                                    v-model="postView[field.name]"
                                    :outputFormat="field.outputFormat ? field.outputFormat : 'RGBAorHEX'"
                                    :customCssClasses="field.customCssClasses">
                                </color-picker>

                                <image-upload
                                    v-if="field.type === 'image'"
                                    slot="field"
                                    v-model="postView[field.name]"
                                    item-id="defaults"
                                    imageType="contentImages" />

                                <small
                                    v-if="field.note"
                                    slot="note"
                                    class="note">
                                    {{ field.note }}
                                </small>
                            </field>
                        </div>

                        <div v-if="groupName === $t('theme.pageOptions')">
                            <field>
                                <small
                                    slot="note"
                                    class="note">
                                    {{ $t('theme.pageOptionsInfo') }}<br><br>
                                </small>
                            </field>

                            <field
                                v-if="hasPageTemplates"
                                :label="$t('theme.defaultPageTemplate')"
                                key="tab-last-field-0">
                                <dropdown
                                    :items="pageTemplates"
                                    v-model="defaultTemplates.page"
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
                                v-for="(field, subindex) of pageViewThemeSettings"
                                :label="field.label"
                                :key="'tab-' + index + '-field-' + subindex">
                                <dropdown
                                    v-if="!field.type || field.type === 'select'"
                                    :id="field.name + '-select'"
                                    :items="getDropdownViewOptions(field.options)"
                                    slot="field"
                                    :customCssClasses="field.customCssClasses"
                                    v-model="pageView[field.name]">
                                </dropdown>

                                <text-input
                                    v-if="field.type === 'text' || field.type === 'number'"
                                    :type="field.type"
                                    slot="field"
                                    :spellcheck="$store.state.currentSite.config.spellchecking && field.spellcheck"
                                    :placeholder="field.placeholder ? field.placeholder : $t('theme.leaveBlankToUseDefault')"
                                    v-model="pageView[field.name]"
                                    :customCssClasses="field.customCssClasses" />

                                <text-area
                                    v-if="field.type === 'textarea'"
                                    slot="field"
                                    :placeholder="field.placeholder ? field.placeholder : $t('theme.leaveBlankToUseDefault')"
                                    :spellcheck="$store.state.currentSite.config.spellchecking && field.spellcheck"
                                    v-model="pageView[field.name]"
                                    :customCssClasses="field.customCssClasses" />

                                <color-picker
                                    v-if="field.type === 'colorpicker'"
                                    slot="field"
                                    v-model="pageView[field.name]"
                                    :outputFormat="field.outputFormat ? field.outputFormat : 'RGBAorHEX'"
                                    :customCssClasses="field.customCssClasses">
                                </color-picker>

                                <image-upload
                                    v-if="field.type === 'image'"
                                    slot="field"
                                    v-model="pageView[field.name]"
                                    item-id="defaults"
                                    imageType="contentImages" />

                                <small
                                    v-if="field.note"
                                    slot="note"
                                    class="note">
                                    {{ field.note }}
                                </small>
                            </field>
                        </div>

                        <div v-if="groupName === $t('theme.tagOptions')">
                            <field>
                                <small
                                    slot="note"
                                    class="note">
                                    {{ $t('theme.tagOptionsInfo') }}<br><br>
                                </small>
                            </field>

                            <field
                                v-for="(field, subindex) of tagViewThemeSettings"
                                :label="field.label"
                                :key="'tab-' + index + '-field-' + subindex">
                                <dropdown
                                    v-if="!field.type || field.type === 'select'"
                                    :id="field.name + '-select'"
                                    :items="getDropdownViewOptions(field.options)"
                                    slot="field"
                                    v-model="tagView[field.name]"
                                    :customCssClasses="field.customCssClasses">
                                </dropdown>

                                <text-input
                                    v-if="field.type === 'text' || field.type === 'number'"
                                    :type="field.type"
                                    slot="field"
                                    :spellcheck="$store.state.currentSite.config.spellchecking && field.spellcheck"
                                    :placeholder="field.placeholder ? field.placeholder : $t('theme.leaveBlankToUseDefault')"
                                    v-model="tagView[field.name]"
                                    :customCssClasses="field.customCssClasses" />

                                <text-area
                                    v-if="field.type === 'textarea'"
                                    slot="field"
                                    :placeholder="field.placeholder ? field.placeholder : $t('theme.leaveBlankToUseDefault')"
                                    :spellcheck="$store.state.currentSite.config.spellchecking && field.spellcheck"
                                    v-model="tagView[field.name]"
                                    :customCssClasses="field.customCssClasses" />

                                <color-picker
                                    v-if="field.type === 'colorpicker'"
                                    slot="field"
                                    v-model="tagView[field.name]"
                                    :outputFormat="field.outputFormat ? field.outputFormat : 'RGBAorHEX'"
                                    :customCssClasses="field.customCssClasses">
                                </color-picker>

                                <image-upload
                                    v-if="field.type === 'image'"
                                    slot="field"
                                    v-model="tagView[field.name]"
                                    item-id="defaults"
                                    imageType="tagImages" />

                                <small
                                    v-if="field.note"
                                    slot="note"
                                    class="note">
                                    {{ field.note }}
                                </small>
                            </field>
                        </div>

                        <div v-if="groupName === $t('theme.authorOptions')">
                            <field>
                                <small
                                    slot="note"
                                    class="note">
                                    {{ $t('theme.authorOptionsInfo') }}<br><br>
                                </small>
                            </field>

                            <field
                                v-for="(field, subindex) of authorViewThemeSettings"
                                :label="field.label"
                                :key="'tab-' + index + '-field-' + subindex">
                                <dropdown
                                    v-if="!field.type || field.type === 'select'"
                                    :id="field.name + '-select'"
                                    :items="getDropdownViewOptions(field.options)"
                                    slot="field"
                                    v-model="authorView[field.name]"
                                    :customCssClasses="field.customCssClasses">
                                </dropdown>

                                <text-input
                                    v-if="field.type === 'text' || field.type === 'number'"
                                    :type="field.type"
                                    slot="field"
                                    :spellcheck="$store.state.currentSite.config.spellchecking && field.spellcheck"
                                    :placeholder="field.placeholder ? field.placeholder : $t('theme.leaveBlankToUseDefault')"
                                    v-model="authorView[field.name]"
                                    :customCssClasses="field.customCssClasses" />

                                <text-area
                                    v-if="field.type === 'textarea'"
                                    slot="field"
                                    :placeholder="field.placeholder ? field.placeholder : $t('theme.leaveBlankToUseDefault')"
                                    :spellcheck="$store.state.currentSite.config.spellchecking && field.spellcheck"
                                    v-model="authorView[field.name]"
                                    :customCssClasses="field.customCssClasses" />

                                <color-picker
                                    v-if="field.type === 'colorpicker'"
                                    slot="field"
                                    v-model="authorView[field.name]"
                                    :outputFormat="field.outputFormat ? field.outputFormat : 'RGBAorHEX'"
                                    :customCssClasses="field.customCssClasses">
                                </color-picker>

                                <image-upload
                                    v-if="field.type === 'image'"
                                    slot="field"
                                    v-model="authorView[field.name]"
                                    item-id="defaults"
                                    imageType="authorImages" />

                                <small
                                    v-if="field.note"
                                    slot="note"
                                    class="note"
                                    :customCssClasses="field.customCssClasses">
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

export default {
    name: 'site-settings',
    data: function() {
        return {
            buttonsLocked: false,
            defaultTemplates: {
                post: '',
                page: ''
            },
            basic: {
                postsPerPage: 4,
                tagsPostsPerPage: 4,
                authorsPostsPerPage: 4,
                excerptLength: 45,
                logo: ''
            },
            custom: {},
            pageView: {},
            postView: {},
            tagView: {},
            authorView: {}
        };
    },
    computed: {
        siteHasTheme () {
            return !!this.$store.state.currentSite.config.theme;
        },
        customSettingsTabs () {
            let tabs = [];

            this.$store.state.currentSite.themeSettings.customConfig.forEach(item => {
                if (tabs.indexOf(item.group) === -1 && !item.parentgroup) {
                    tabs.push(item.group);
                }
            });

            this.$store.state.currentSite.themeSettings.customConfig.forEach(item => {
                if (
                    item.parentgroup && 
                    !tabs.some((el) => Array.isArray(el) && el.length === 2 && el[0] === item.group && el[1] === item.parentgroup)
                ) {
                    let parentGroupIndex = tabs.indexOf(item.parentgroup);
                    tabs.splice(parentGroupIndex + 1, 0, [item.group, item.parentgroup]);
                }
            });

            tabs.push(this.$t('theme.authorOptions'));
            tabs.push(this.$t('theme.postOptions'));
            tabs.push(this.$t('theme.pageOptions'));
            tabs.push(this.$t('theme.tagOptions'));
            tabs.push(this.$t('theme.translations'));

            // We need to reverse subgroups order
            let finalTabsList = [];
            let group = [];

            tabs.forEach(item => {
                if (Array.isArray(item)) {
                    group.push(item);
                } else {
                    if (group.length > 0) {
                        finalTabsList.push(...group.reverse());
                        group = [];
                    }

                    finalTabsList.push(item);
                }
            });

            if (group.length > 0) {
                finalTabsList.push(...group.reverse());
            }

            return finalTabsList;
        },
        customSettingsTabsNames () {
            return this.customSettingsTabs.map(tab => {
                return Array.isArray(tab) ? tab[0] : tab;
            });
        },
        postViewThemeSettings () {
            return this.$store.state.currentSite.themeSettings.postConfig.filter(field => field.type !== 'separator');
        },
        pageViewThemeSettings () {
            console.log(this.$store.state.currentSite.themeSettings);
            return this.$store.state.currentSite.themeSettings.pageConfig.filter(field => field.type !== 'separator');
        },
        postTemplates () {
            return this.$store.state.currentSite.themeSettings.postTemplates;
        },
        pageTemplates () {
            return this.$store.state.currentSite.themeSettings.pageTemplates;
        },
        hasPostTemplates () {
            return !!Object.keys(this.postTemplates).length;
        },
        hasPageTemplates () {
            return !!Object.keys(this.pageTemplates).length;
        },
        tagViewThemeSettings () {
            return this.$store.state.currentSite.themeSettings.tagConfig.filter(field => field.type !== 'separator');
        },
        authorViewThemeSettings () {
            return this.$store.state.currentSite.themeSettings.authorConfig.filter(field => field.type !== 'separator');
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
        extensionsPath () {
            return [
                'file:///',
                this.$store.state.currentSite.siteDir,
                '/input/themes/',
                this.$store.state.currentSite.config.theme,
                '/'
            ].join('');
        }
    },
    mounted () {
        setTimeout (() => {
            this.loadAdditionalCss();
            this.loadSettings();
        }, 0);
    },
    methods: {
        loadAdditionalCss () {
            if (
                this.$store.state.currentSite.themeSettings &&
                this.$store.state.currentSite.themeSettings.supportedFeatures &&
                this.$store.state.currentSite.themeSettings.supportedFeatures.customThemeOptionsCss
            ) {
                let customCssPath = this.extensionsPath + 'theme-options.css?v=' + (+new Date());

                if (!document.querySelector('#custom-theme-options-css')) {
                    $(document.body).append($('<link rel="stylesheet" id="custom-theme-options-css" href="' + customCssPath + '" />'));
                }
            }
        },
        loadSettings () {
            this.loadBasicSettings();
            this.loadCustomSettings();
            this.loadPageViewSettings();
            this.loadPostViewSettings();
            this.loadTagViewSettings();
            this.loadAuthorViewSettings();
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
        loadPageViewSettings () {
            let settings = this.$store.state.currentSite.themeSettings.pageConfig.map(field => {
                if (field.type !== 'separator') {
                    return [field.name, field.value]
                }

                return false;
            });

            for (let setting of settings) {
                if (setting) {
                    Vue.set(this.pageView, setting[0], setting[1]);
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
        loadTagViewSettings () {
            let settings = this.$store.state.currentSite.themeSettings.tagConfig.map(field => {
                if (field.type !== 'separator') {
                    return [field.name, field.value]
                }

                return false;
            });

            for (let setting of settings) {
                if (setting) {
                    Vue.set(this.tagView, setting[0], setting[1]);
                }
            }
        },
        loadAuthorViewSettings () {
            let settings = this.$store.state.currentSite.themeSettings.authorConfig.map(field => {
                if (field.type !== 'separator') {
                    return [field.name, field.value]
                }

                return false;
            });

            for (let setting of settings) {
                if (setting) {
                    Vue.set(this.authorView, setting[0], setting[1]);
                }
            }
        },
        loadDefaultTemplates () {
            this.defaultTemplates = {
                post: this.$store.state.currentSite.themeSettings.defaultTemplates.post,
                page: this.$store.state.currentSite.themeSettings.defaultTemplates.page
            };
        },
        checkDependencies (dependencies) {
            if (!dependencies || !dependencies.length) {
                return true;
            }

            for (let i = 0; i < dependencies.length; i++) {
                let dependencyName = dependencies[i].field;
                let dependencyValue = dependencies[i].value;

                if (
                    Array.isArray(this.custom[dependencyName]) && 
                    dependencyValue.indexOf('=') > -1
                ) {
                    let dependencyData = this.custom[dependencyName];
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
                    let isValidDependency = false;

                    for (let i = 0; i < values.length; i++) {
                        if (this.custom[dependencyName] === values[i]) {
                            isValidDependency = true;
                        }
                    }
                    
                    return isValidDependency;
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
                'pages-dropdown',
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
        getDropdownViewOptions (arrayToConvert) {
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
                pageConfig: Object.assign({}, this.pageView),
                tagConfig: Object.assign({}, this.tagView),
                authorConfig: Object.assign({}, this.authorView),
                defaultTemplates: Object.assign({}, this.defaultTemplates)
            };

            // Send request to the back-end
            mainProcessAPI.send('app-site-theme-config-save', {
                "site": this.$store.state.currentSite.config.name,
                "theme": this.$store.state.currentSite.config.theme,
                "config": newConfig
            });

            // Settings saved
            mainProcessAPI.receiveOnce('app-site-theme-config-saved', async (data) => {
                if (data.status === true) {
                    await this.savedSettings(showPreview, renderingType, renderFiles);
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
        async savedSettings(showPreview = false, renderingType = false, renderFiles = false) {
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
            mainProcessAPI.receiveOnce('app-site-theme-config-saved', async (data) => {
                if (data.status === true) {
                    await this.savedSettings(false);
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
    },
    beforeDestroy () {
        if (document.querySelector('#custom-theme-options-css')) {
            $('#custom-theme-options-css').remove();
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
