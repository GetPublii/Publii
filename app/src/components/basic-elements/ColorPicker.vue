<template>
    <div 
        :id="anchor"
        :class="cssClasses">
        <div
            class="color-picker-preview"
            @click="togglePicker"
            :style="'background-color: ' + content"></div>
        <input
            v-model="content"
            :readonly="true"
            @click="togglePicker"
            spellcheck="false"
            type="colorpicker" />

        <chrome-picker
            @click.native="stopEventPropagation"
            :class="{ 'is-visible': pickerVisible }"
            v-model="pickerContent"
            ref="colorpicker" />
    </div>
</template>

<script>
import { Chrome } from 'vue-color';

export default {
    name: 'color-picker',
    components: {
        'chrome-picker': Chrome
    },
    props: {
        value: {
            default: '',
            type: String
        },
        outputFormat: {
            default: 'RGBAorHEX',
            type: String
        },
        anchor: {
            default: '',
            type: String
        },
        customCssClasses: {
            default: '',
            type: String
        }
    },
    computed: {
        cssClasses () {
            let cssClasses = { 
                'color-picker': true,
                'has-disabled-toggle': this.outputFormat === 'RGBA' || this.outputFormat === 'HSLA'
            };

            if (this.customCssClasses && this.customCssClasses.trim() !== '') {
                this.customCssClasses.split(' ').forEach(item => {
                    item = item.replace(/[^a-z0-9\-\_\s]/gmi, '');
                    cssClasses[item] = true;
                });
            }

            return cssClasses;
        }
    },
    data () {
        return {
            content: '',
            pickerContent: '',
            pickerVisible: false
        };
    },
    watch: {
        value (newValue) {
            this.content = newValue;
        },
        content (newValue) {
            this.$emit('input', this.content);
        }
    },
    mounted: function() {
        if (this.outputFormat === 'RGBA') {
            this.$refs['colorpicker'].fieldsIndex = 1;
        } else if (this.outputFormat === 'HSLA') {
            this.$refs['colorpicker'].fieldsIndex = 2;
        }

        this.$watch('value', (color) => {
            this.content = color;
            this.pickerContent = color;
        }, { immediate: true });

        this.$watch('pickerContent', (color) => {
            if (typeof color === 'string') {
                return;
            }

            if (this.outputFormat === 'RGBAorHEX') {
                if (color.a !== 1) {
                    this.content = 'rgba(' + color.rgba.r + ',' + color.rgba.g + ',' + color.rgba.b + ',' + color.rgba.a + ')';
                } else {
                    this.content = color.hex;
                }
            } else if (this.outputFormat === 'RGBA') {
                this.content = 'rgba(' + color.rgba.r + ',' + color.rgba.g + ',' + color.rgba.b + ',' + color.rgba.a + ')';
            } else if (this.outputFormat === 'HSLA') {
                this.content = 'hsla(' + parseInt(color.hsl.h, 10) + ', ' + parseInt(color.hsl.s * 100, 10) + '%, ' + parseInt(color.hsl.l * 100, 10) + '%, ' + color.hsl.a + ')';
            } else if (this.outputFormat === 'HEX') {
                this.content = color.hex;   
            } else {
                this.content = color.hex;
            }
        }, { immediate: true });

        this.pickerContent = this.value;
        this.$bus.$on('document-body-clicked', this.hide);
    },
    methods: {
        getValue () {
            return this.content;
        },
        togglePicker (e) {
            e.stopPropagation();
            this.pickerVisible = !this.pickerVisible;

            if (this.pickerVisible) {
                this.$bus.$off('document-body-clicked', this.hide);
                this.$bus.$emit('document-body-clicked');
                this.$bus.$on('document-body-clicked', this.hide);
            }
        },
        stopEventPropagation (e) {
            e.stopPropagation();
        },
        hide () {
            this.pickerVisible = false;
        }
    },
    beforeDestroy () {
        this.$bus.$off('document-body-clicked', this.hide);
    }
}
</script>

<style lang="scss" scoped>
@import '../../scss/variables.scss';

.color-picker {
    position: relative;

    &-preview {
        border-radius: 50%;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
        cursor: pointer;
        float: left;
        height: 20px;
        left: 14px;
        margin-right: -30px;
        pointer-events: none;
        position: relative;
        top: 14px;
        width: 20px!important;

        & + input {
            cursor: pointer;
            text-indent: 25px;
            width: 100%;
        }
    }

    .vc-chrome {
        display: none;
        position: absolute;
        top: 60px;
        z-index: 10;

        &.is-visible {
            display: block;
        }  

        ::v-deep .vc-chrome-body {
            background-color: var(--bg-primary);
        }   
        
        ::v-deep .vc-input__input {
            background-color: var(--input-bg);
            box-shadow: inset 0 0 0 1px var(--input-border-color);
            color: var(--text-primary-color);
        }
        
        ::v-deep .vc-chrome-toggle-icon {
            
            path {
               fill: var(--icon-primary-color);
            }
            
            &:hover {
               path {
                  fill: var(--icon-tertiary-color);
               }
            }
        }
        
        ::v-deep .vc-chrome-toggle-icon-highlight {
            background: var(--input-border-color);
        }
    }

    &.has-disabled-toggle {
        .vc-chrome {
            ::v-deep .vc-chrome-toggle-btn {
                display: none;
                pointer-events: none;
            }
        }
    }
}
</style>
