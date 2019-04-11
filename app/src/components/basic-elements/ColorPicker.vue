<template>
    <div class="color-picker">
        <div
            class="color-picker-preview"
            @click="togglePicker"
            :style="'background-color: ' + content"></div>
        <input
            v-model="content"
            :readonly="true"
            @click="togglePicker"
            type="colorpicker" />

        <chrome-picker
            @click.native="stopEventPropagation"
            :class="{ 'is-visible': pickerVisible }"
            v-model="pickerContent" />
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
        'value': {
            default: '',
            type: String
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
        this.$watch('value', (color) => {
            this.content = color;
            this.pickerContent = color;
        }, { immediate: true });

        this.$watch('pickerContent', (color) => {
            if (typeof color === 'string') {
                return;
            }

            if (color.a !== 1) {
                this.content = 'rgba(' + color.rgba.r + ',' + color.rgba.g + ',' + color.rgba.b + ',' + color.rgba.a + ')';
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
    }
}
</style>
