<template>
    <div 
        :id="anchor"
        :class="cssClasses">
        <div 
            v-if="!content.length && hasEmptyState"
            class="publii-repeater-empty-state">
            <template v-if="translations.emptyState">
                {{ translation('empty') }}
            </template>
            <template v-else>
                {{ $t('repeater.emptyState') }}
            </template>
        </div>

        <draggable
            tag="div"
            group="publii-repeater"
            chosenClass="is-chosen"
            ghostClass="is-ghost"
            handle=".move"
            class="publii-repeater"
            @change="listUpdated"
            v-model="content">
            <div 
                v-for="(row, index) of content"
                :key="'publii-repeater-row-' + index"
                class="publii-repeater-item">
                <span 
                    v-if="content.length > 1"
                    class="move">
                    <icon
                        name="more"
                        size="xs" />
                </span>

                <template v-for="(field, subindex) of itemConfig">
                    <div 
                        v-if="isVisible(itemConfig[subindex], index)"
                        :key="'publii-repeater-row-' + index + '-' + subindex"
                        class="publii-repeater-item-field"
                        :style="'width: ' + itemConfig[subindex].width + '%;'">
                        <label>
                            <span v-if="itemConfig[subindex].type !== 'checkbox' && (!hideLabels || (hideLabels && index === 0))">
                                {{ itemConfig[subindex].label }}:
                            </span>

                            <dropdown
                                v-if="itemConfig[subindex].type === 'dropdown'"
                                :items="itemConfig[subindex].options"
                                v-model="content[index][itemConfig[subindex].name]"
                                :customCssClasses="itemConfig[subindex].customCssClasses">
                            </dropdown>

                            <text-input
                                v-if="itemConfig[subindex].type === 'text' || itemConfig[subindex].type === 'number' || itemConfig[subindex].type === 'url' || itemConfig[subindex].type === 'email'"
                                :type="itemConfig[subindex].type"
                                :spellcheck="itemConfig[subindex].spellcheck"
                                :placeholder="itemConfig[subindex].placeholder"
                                v-model="content[index][itemConfig[subindex].name]"
                                :min="itemConfig[subindex].min"
                                :max="itemConfig[subindex].max"
                                :step="itemConfig[subindex].step"
                                :customCssClasses="itemConfig[subindex].customCssClasses" />

                            <range-slider
                                v-if="itemConfig[subindex].type === 'range'"
                                :min="itemConfig[subindex].min"
                                :max="itemConfig[subindex].max"
                                :step="itemConfig[subindex].step"
                                v-model="content[index][itemConfig[subindex].name]"
                                :customCssClasses="itemConfig[subindex].customCssClasses"></range-slider>

                            <text-area
                                v-if="itemConfig[subindex].type === 'textarea'"
                                :spellcheck="itemConfig[subindex].spellcheck"
                                :placeholder="itemConfig[subindex].placeholder"
                                :rows="itemConfig[subindex].rows"
                                v-model="content[index][itemConfig[subindex].name]"
                                :customCssClasses="itemConfig[subindex].customCssClasses" />

                            <text-area
                                v-if="itemConfig[subindex].type === 'wysiwyg'"
                                v-model="content[index][itemConfig[subindex].name]"
                                :key="'wysiwyg-' + index + '-' + subindex"
                                :ref="'wysiwyg-' + index + '-' + subindex"
                                :wysiwyg="true"
                                :miniEditorMode="true"
                                :customCssClasses="itemConfig[subindex].customCssClasses"></text-area>

                            <color-picker
                                v-if="itemConfig[subindex].type === 'colorpicker'"
                                v-model="content[index][itemConfig[subindex].name]"
                                :outputFormat="itemConfig[subindex].outputFormat ? itemConfig[subindex].outputFormat : 'RGBAorHEX'"
                                :customCssClasses="itemConfig[subindex].customCssClasses">
                            </color-picker>

                            <switcher
                                v-if="itemConfig[subindex].type === 'checkbox'"
                                v-model="content[index][itemConfig[subindex].name]"
                                :lower-zindex="true"
                                :label="itemConfig[subindex].label"
                                :customCssClasses="itemConfig[subindex].customCssClasses"></switcher>

                            <radio-buttons
                                v-if="itemConfig[subindex].type === 'radio'"
                                :items="itemConfig[subindex].options"
                                :name="itemConfig[subindex].name + '-' + index + '-' + subindex"
                                v-model="content[index][itemConfig[subindex].name]"
                                :customCssClasses="itemConfig[subindex].customCssClasses" />

                            <posts-dropdown
                                v-if="itemConfig[subindex].type === 'posts-dropdown'"
                                v-model="content[index][itemConfig[subindex].name]"
                                :allowed-post-status="itemConfig[subindex].allowedPostStatus || ['any']"
                                :multiple="itemConfig[subindex].multiple"
                                :customCssClasses="itemConfig[subindex].customCssClasses"></posts-dropdown>

                            <pages-dropdown
                                v-if="itemConfig[subindex].type === 'pages-dropdown'"
                                v-model="content[index][itemConfig[subindex].name]"
                                :multiple="itemConfig[subindex].multiple"
                                :customCssClasses="itemConfig[subindex].customCssClasses"></pages-dropdown>

                            <tags-dropdown
                                v-if="itemConfig[subindex].type === 'tags-dropdown'"
                                v-model="content[index][itemConfig[subindex].name]"
                                :multiple="itemConfig[subindex].multiple"
                                :customCssClasses="itemConfig[subindex].customCssClasses"></tags-dropdown>

                            <authors-dropdown
                                v-if="itemConfig[subindex].type === 'authors-dropdown'"
                                v-model="content[index][itemConfig[subindex].name]"
                                :multiple="itemConfig[subindex].multiple"
                                :customCssClasses="itemConfig[subindex].customCssClasses"></authors-dropdown>

                            <template v-if="pluginDir">
                                <image-upload
                                    v-if="itemConfig[subindex].type === 'upload'"
                                    slot="field"
                                    v-model="content[index][itemConfig[subindex].name]"
                                    :imageType="imageType"
                                    :pluginDir="pluginDir"
                                    :addMediaFolderPath="false" />

                                <small-image-upload
                                    v-if="itemConfig[subindex].type === 'smallupload'"
                                    v-model="content[index][itemConfig[subindex].name]"
                                    :anchor="itemConfig[subindex].anchor"
                                    :imageType="imageType"
                                    :pluginDir="$route.params.pluginname"
                                    slot="field"
                                    :customCssClasses="itemConfig[subindex].customCssClasses"></small-image-upload>
                            </template>
                            <template v-else>
                                <image-upload
                                    v-if="itemConfig[subindex].type === 'upload'"
                                    slot="field"
                                    v-model="content[index][itemConfig[subindex].name]"
                                    :imageType="imageType"
                                    :addMediaFolderPath="true" />   

                                <small-image-upload
                                    v-if="itemConfig[subindex].type === 'smallupload'"
                                    v-model="content[index][itemConfig[subindex].name]"
                                    :anchor="itemConfig[subindex].anchor"
                                    :imageType="imageType"
                                    slot="field"
                                    :customCssClasses="itemConfig[subindex].customCssClasses"></small-image-upload>
                            </template>

                            <vue-select
                                v-if="itemConfig[subindex].type === 'file-dropdown'"
                                slot="field"
                                :ref="'file-dropdown-' + index"
                                :options="filesList"
                                v-model="content[index][itemConfig[subindex].name]"
                                :close-on-select="true"
                                :show-labels="false"
                                :placeholder="$t('file.selectFileFromFileManager')"
                                @select="closeFileDropdown('file-dropdown-' + index)"></vue-select>
                            
                            <small
                                v-if="itemConfig[subindex].note && (!hideLabels || (hideLabels && index === 0))"
                                slot="note"
                                class="note">
                                {{ itemConfig[subindex].note }}
                            </small>
                        </label>
                    </div>
                </template>

                <div class="publii-repeater-item-ui">
                    <a
                        href="#"
                        :class="{ 
                            'publii-repeater-item-ui-btn': true,
                            'duplicate': true,
                            'is-disabled': maxCount !== -1 && content.length >= maxCount
                        }"
                        :title="translation('duplicate')"
                        tabindex="-1"
                        @click.stop.prevent="duplicateItem(index)">
                        <icon
                            name="duplicate"
                            size="xs" />
                    </a>

                    <a
                        href="#"
                        class="publii-repeater-item-ui-btn delete"
                        :title="translation('remove')"
                        tabindex="-1"
                        @click.stop.prevent="removeItem(index)">
                        <icon
                            name="trash"
                            size="xs" />
                    </a>
                </div>
            </div>
        </draggable>

        <p-button
            v-if="maxCount === -1 || content.length < maxCount"
            :onClick="addItem"
            type="secondary icon"
            icon="add-site-mono">
            {{ translation('add') }}
        </p-button>
    </div>
</template>

<script>
import Draggable from 'vuedraggable';
import vSelect from 'vue-multiselect/dist/vue-multiselect.min.js';

export default {
    name: 'repeater',
    props: {
        structure: {
            default: () => ([]),
            type: Array
        },
        maxCount: {
            default: -1,
            type: Number
        },
        translations: {
            default: false,
            type: [Boolean, Object]
        },
        hasEmptyState: {
            default: true,
            type: Boolean
        },
        hideLabels: {
            default: true,
            type: Boolean
        },
        value: {
            default: () => ([]),
            type: Array
        },
        anchor: {
            default: '',
            type: String
        },
        settings: {
            default: () => ({}),
            type: Object
        },
        customCssClasses: {
            default: '',
            type: String
        },
        imageType: {
            default: 'optionImages',
            type: String
        },
        pluginDir: {
            default: '',
            type: String
        }
    },
    components: {
        'draggable': Draggable,
        'vue-select': vSelect
    },
    computed: {
        cssClasses () {
            let cssClasses = {};

            if (this.customCssClasses && this.customCssClasses.trim() !== '') {
                this.customCssClasses.split(' ').forEach(item => {
                    item = item.replace(/[^a-z0-9\-\_\s]/gmi, '');
                    cssClasses[item] = true;
                });
            }

            return cssClasses;
        },
        itemStructure () {
            let output = {};
            let keys = this.structure.map(item => item.name);
            let values = this.structure.map(item => item.value);

            for (let i = 0; i < keys.length; i++) {
                output[keys[i]] = values[i];
            }

            return output;
        },
        itemConfig () {
            return this.structure;
        },
        hasFileManagerField () {
            return this.itemConfig.filter(item => item.type === 'file-dropdown').length > 0;
        }
    },
    data () {
        return {
            content: this.value,
            filesList: ['']
        };
    },
    mounted () {
        this.content = this.value;

        if (this.hasFileManagerField) {
            mainProcessAPI.send('app-file-manager-list', {
                siteName: this.$store.state.currentSite.config.name,
                dirPath: 'root-files'
            });

            mainProcessAPI.receiveOnce('app-file-manager-listed', (data) => {
                this.filesList = data.map(file => file.name);

                mainProcessAPI.send('app-file-manager-list', {
                    siteName: this.$store.state.currentSite.config.name,
                    dirPath: 'media/files'
                }); 

                mainProcessAPI.receiveOnce('app-file-manager-listed', (data) => {
                    this.filesList = this.filesList.concat(data.map(file => 'media/files/' + file.name));
                });
            });
        }
    },
    watch: {
        value (newValue, oldValue) {
            this.content = newValue;
        },
        content: {
            handler () {
                this.$emit('input', this.content);
            },
            deep: true
        }
    },
    methods: {
        addItem () {
            let structureCopy = JSON.parse(JSON.stringify(this.itemStructure));
            this.content.push(structureCopy);
            this.refreshWysiwygs();
        },
        duplicateItem (index) {
            let itemCopy = JSON.parse(JSON.stringify(this.content[index]));
            this.content.splice(index + 1, 0, itemCopy);
            this.refreshWysiwygs();
        },
        removeItem (index) {
            this.content.splice(index, 1);
            this.refreshWysiwygs();
        },
        translation (key) {
            if (key === 'add') {
                if (this.translations && this.translations.addItem) {
                    return this.translations.addItem;
                }

                return this.$t('repeater.addItem');
            } else if (key === 'duplicate') {
                if (this.translations && this.translations.duplicateItem) {
                    return this.translations.duplicateItem;
                }

                return this.$t('repeater.duplicateItem');
            } else if (key === 'empty') {
                if (this.translations && this.translations.emptyState) {
                    return this.translations.emptyState;
                }

                return this.$t('repeater.emptyState');
            } else if (key === 'remove') {
                if (this.translations && this.translations.removeItem) {
                    return this.translations.removeItem;
                }

                return this.$t('repeater.removeItem');
            }
        },
        isVisible (itemConfig, index) {
            if (!itemConfig.dependencies || !itemConfig.dependencies.length) {
                return true;
            }

            for (let i = 0; i < itemConfig.dependencies.length; i++) {
                let dependencyName = itemConfig.dependencies[i].field;
                let dependencyType = itemConfig.dependencies[i].type;
                let dependencyValue = itemConfig.dependencies[i].value;
                let valueToCompare;

                if (dependencyType === 'externalOption') {
                    valueToCompare = this.settings[dependencyName];
                } else {
                    valueToCompare = this.content[index][dependencyName];
                }

                if (dependencyValue === "true" && valueToCompare !== true) {
                    return false;
                } else if (dependencyValue === "true") {
                    continue;
                }

                if (dependencyValue === "false" && valueToCompare !== false) {
                    return false;
                } else if (dependencyValue === "false") {
                    continue;
                }

                if (typeof dependencyValue === 'string' && dependencyValue.indexOf(',') > -1) {
                    let values = dependencyValue.split(',');

                    for (let i = 0; i < values.length; i++) {
                        if (valueToCompare === values[i]) {
                            return true;
                        }
                    }
                    
                    return false;
                }

                if (dependencyValue !== valueToCompare) {
                    return false;
                }
            }

            return true;
        },
        closeFileDropdown (refID) {
            if (this.$refs[refID] && this.$refs[refID][0]) {
                this.$refs[refID][0].isOpen = false;
            }
        },
        listUpdated () {
            this.refreshWysiwygs();
        },
        refreshWysiwygs() {
            if (this.$refs) {
                return Object.keys(this.$refs)
                    .filter(refName => refName.startsWith('wysiwyg-'))
                    .forEach(refName => {
                        let index = refName.split('-')[1];
                        let subindex = refName.split('-')[2];
                        let newContent = this.content[index][this.itemConfig[subindex].name];
                        this.$refs[refName][0].removeEditor();
                        this.$refs[refName][0].$forceUpdate();
                        this.$refs[refName][0].setContent(newContent);
                        this.$refs[refName][0].initWysiwyg();
                    });
            }
        }
    }
}
</script>

<style lang="scss">
@import '../../scss/variables.scss';
@import '../../scss/mixins.scss';
@import '../../scss/editor/post-editors-common.scss';
@import '../../scss/editor/editor-overrides.scss';

.publii-repeater {
    &-item {
        display: flex;
        flex-wrap: wrap;
        position: relative;
        width: calc(100% - 68px);

        &-ui {
            display: flex;
            position: absolute;
            right: -68px;
            width: 68px;

            &-btn {
                align-items: center;
                background: var(--gray-1);
                position: relative;
                border-radius: 50%;
                display: flex;
                height: 30px;
                justify-content: center;
                margin: 0 2px;
                position: relative;
                text-align: center;
                width: 30px;

                &:active,
                &:focus,
                &:hover {
                    color: var(--headings-color);
                }

                &:hover {

                    & > svg {
                       fill: var(--icon-tertiary-color);
                       transform: scale(1);
                    }
                }

                svg {
                    fill: var(--icon-secondary-color);
                    height: 1.6rem;
                    pointer-events: none;
                    transform: scale(.9);
                    transition: var(--transition);
                    width: 1.6rem;
                }

                &.delete {

                    &:hover {

                        & > svg {
                           fill: var(--warning);
                        }
                    }
                }

                &.is-disabled {
                    opacity: 0.25;
                    pointer-events: none;
                }
            } 
        }

        &-field {
            label {
                padding-right: 10px;

                & > span {
                    display: block;
                    font-size: 1.4rem;
                    font-weight: bold;
                    margin: 0 0 1rem 0;
                }

                & > * {
                    width: calc(100% - 10px)!important;
                }
            }

            .note {
                clear: both;
                color: var(--text-light-color);
                display: block;
                font-size: 1.35rem;
                font-style: italic;
                line-height: 1.4;        
                padding: .5rem 0 1rem 0;
                user-select: text;

                svg {
                    display: inline-block;
                    height: 1.4rem;
                    margin-right: .5rem;
                    width: 1.4rem;
                }
                
                a {
                    color: var(--link-primary-color);
                    
                    &:active,
                    &:focus,
                    &:hover {
                        color: var(--link-primary-color-hover);
                    }
                }
            }

            label + .note {
                padding-top: 1.5rem;
            }

            .checkbox ~ .note {
                margin-bottom: 1.5rem;
            }

            .range-wrapper {
                position: relative;
                z-index: 1;

                & + .note {
                    padding-top: 1.5rem;
                }
            }
        }

        .move {
            cursor: move;
            left: -20px;
            position: absolute;
            width: 20px;

            &:hover {

                & > svg {
                      fill: var(--icon-tertiary-color);
                    }
                }

            svg {
                fill: var(--icon-secondary-color);
                height: 1.6rem;
                pointer-events: none;
                vertical-align: middle;
                width: 1.6rem;
            }
        }

        &.is-ghost {
            &::before { 
                background-color: var(--collection-bg-hover);                
                border: 1px dashed var(--input-border-focus);
                border-radius: var(--border-radius);
                content: "";
                display: block;   
                position: absolute;
                left: -1.5rem;
                right: -7rem;
                bottom: .75rem;
                top: -1.5rem;
            }
            .publii-repeater-item-field, 
            .publii-repeater-item-ui,
            .move {
                opacity: 0;
            }
        }

        &:first-child {
            .move {
                top: 3.24rem
            }
            .publii-repeater-item-ui {
                top: 3.24rem
            }
        }
    }

    &-empty-state {
        margin-bottom: 1.2rem;
    }
}
</style>
