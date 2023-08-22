<template>
    <div :id="anchor">
        <draggable
            tag="div"
            group="publii-repeater"
            chosenClass="is-chosen"
            ghostClass="is-ghost"
            handle=".move"
            class="publii-repeater"
            v-model="content">
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

                <div 
                    v-for="(field, subindex) of itemConfig"
                    :key="'publii-repeater-row-' + index + '-' + subindex"
                    class="publii-repeater-item-field"
                    :style="'width: ' + itemConfig[subindex].width + '%;'">
                    <label>
                        <span v-if="!hideLabels || (hideLabels && index === 0)">
                            {{ itemConfig[subindex].label }}:
                        </span>

                        <dropdown
                            v-if="itemConfig[subindex].type === 'dropdown'"
                            :items="itemConfig[subindex].options"
                            v-model="content[index][itemConfig[subindex].name]">
                        </dropdown>

                        <text-input
                            v-if="itemConfig[subindex].type === 'text' || itemConfig[subindex].type === 'number'"
                            :type="itemConfig[subindex].type"
                            :spellcheck="itemConfig[subindex].spellcheck"
                            :placeholder="itemConfig[subindex].placeholder"
                            v-model="content[index][itemConfig[subindex].name]" />

                        <text-area
                            v-if="itemConfig[subindex].type === 'textarea'"
                            :spellcheck="itemConfig[subindex].spellcheck"
                            :placeholder="itemConfig[subindex].placeholder"
                            v-model="content[index][itemConfig[subindex].name]" />

                        <color-picker
                            v-if="itemConfig[subindex].type === 'colorpicker'"
                            v-model="content[index][itemConfig[subindex].name]"
                            :outputFormat="itemConfig[subindex].outputFormat ? itemConfig[subindex].outputFormat : 'RGBAorHEX'">
                        </color-picker>
                    </label>
                </div>

                <div class="publii-repeater-item-ui">
                    <a
                        href="#"
                        class="duplicate"
                        :title="translation('duplicate')"
                        tabindex="-1"
                        @click.stop.prevent="duplicateItem(index)">
                        <icon
                            name="duplicate"
                            size="xs" />
                    </a>

                    <a
                        href="#"
                        class="delete"
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
            v-if="maxCount === -1 || maxCount < content.length"
            :onClick="addItem">
            {{ translation('add') }}
        </p-button>
    </div>
</template>

<script>
import Draggable from 'vuedraggable'

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
        }
    },
    components: {
        'draggable': Draggable
    },
    computed: {
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
        }
    },
    data () {
        return {
            content: this.value
        };
    },
    mounted () {
        this.content = this.value;
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
        },
        duplicateItem (index) {
            let itemCopy = JSON.parse(JSON.stringify(this.content[index]));
            this.content.splice(index + 1, 0, itemCopy);
        },
        removeItem (index) {
            this.content.splice(index, 1);
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

        &-ui {
            position: absolute;
            right: -30px;
            width: 30px;
        }

        &-field {
            label {
                padding-right: 10px;

                & > span {
                    display: block;
                }

                & > * {
                    width: calc(100% - 10px)!important;
                }
            }
        }

        &-ui {
            .delete,
            .duplicate {

            }
        }

        .move {
            position: absolute;
            left: -20px;
            width: 20px;
        }
    }
}
</style>
