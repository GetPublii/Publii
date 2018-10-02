<template>
    <div
        class="wrapper"
        @click="selectDir">
        <text-input
            icon="folder"
            ref="input"
            :id="id"
            :placeholder="placeholder"
            :value="value"
            properties="keyboard-blocked" />

        <span
            v-if="fieldValue"
            class="clear"
            @click.stop="clear">
            &times;
        </span>
    </div>
</template>


<script>
import { ipcRenderer, remote } from 'electron';
const mainProcess = remote.require('./main');

export default {
    name: 'dirselect',
    props: {
        id: {
            default: '',
            required: true,
            type: String
        },
        placeholder: {
            default: '',
            required: false,
            type: String
        },
        value: {
            default: '',
            required: true,
            type: String
        },
        onChange: {
            default: () => false,
            type: Function
        }
    },
    data: function() {
        return {
            fieldValue: this.value
        };
    },
    watch: {
        value (newValue, oldValue) {
            this.fieldValue = newValue;
            this.$emit('input', this.fieldValue);
        }
    },
    methods: {
        clear: function() {
            this.$refs.input.content = '';
            this.fieldValue = '';
            this.$emit('input', '');
        },
        selectDir: function() {
            mainProcess.selectDirectory('dir-select');

            ipcRenderer.once('app-directory-selected', (event, data) => {
                if(data.path === undefined) {
                    return;
                }

                if(typeof data.path === "object") {
                    this.$refs.input.content = data.path[0];
                    this.fieldValue = data.path[0];
                } else {
                    this.$refs.input.content = data.path;
                    this.fieldValue = data.path;
                }

                this.onChange(this.fieldValue);
                this.$emit('input', this.fieldValue);
            });
        },
        getValue: function() {
            return this.fieldValue;
        }
    }
}
</script>

<style lang="scss" scoped>
@import '../../scss/variables.scss';

// @ToDo: move ".clear" to a separate component - ClearButton

.wrapper {
    position: relative;

    input {
        float: left;
        padding-left: 4.5rem!important;
        width: 100%!important;
    }

    .clear {
        color: $color-3;
        cursor: pointer;
        font-size: 2.4rem;
        font-weight: 300;
        height: 2rem;
        line-height: 1.9rem;
        position: absolute;
        right: 1.5rem;
        text-align: center;
        top: 1.4rem;
        transition: all .3s ease-out;
        width: 2rem;

        &:hover {
            color: $color-4;
        }
    }

    svg {
        left: .5rem;
        position: absolute;
        top: .75rem;
        z-index: 1;
    }

    & ~ small.note {
        color: $danger-color;
        padding: 1rem 0;
        width: 100%;

        svg {
            fill: $danger-color;
            height: 1.8rem!important;
            margin-left: 1.3rem;
            position: relative;
            top: 3px;
            width: 1.8rem!important;
        }
    }
}
</style>
