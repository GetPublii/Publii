<template>
    <div
        class="box"
        @click="selectFile">
        <text-input
            icon="folder"
            ref="input"
            :id="id"
            :placeholder="placeholder"
            :disabled="disabled"
            :value="value"
            :spellcheck="false"
            properties="keyboard-blocked" />

        <span
            v-if="fieldValue && !disabled"
            class="clear"
            @click.stop="clear">
            &times;
        </span>
    </div>
</template>

<script>
export default {
    name: 'fileselect',
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
        disabled: {
            default: false,
            type: Boolean
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
        clear () {
            this.$refs.input.content = '';
            this.fieldValue = '';
            this.onChange('');
        },
        async selectFile () {
            await mainProcessAPI.invoke('app-main-process-select-file', 'file-select');

            mainProcessAPI.receiveOnce('app-file-selected', (data) => {
                if (data.path === undefined || !data.path.filePaths.length) {
                    return;
                }

                this.$refs.input.content = data.path.filePaths[0];
                this.fieldValue = data.path.filePaths[0];
                this.$emit('input', this.fieldValue);
                this.onChange(this.fieldValue);
            });
        },
        getValue () {
            return this.fieldValue;
        }
    }
}
</script>

<style lang="scss" scoped>
@import '../../scss/variables.scss';

// @ToDo: move ".clear" to a separate component - ClearButton

.box {
    position: relative;

    input {
        float: left;
        padding-left: 4.5rem!important;
        width: 100%!important;
    }

    .clear {
        border-radius: 50%;
        color: var(--warning);
        cursor: pointer;
        font-size: 2.4rem;
        font-weight: 300;
        height: 3rem; 
        line-height: 1.1;
        position: absolute;
        right: 1.5rem;
        text-align: center;
        transition: var(--transition);           
        top: 50%;
        transform: translateY(-50%); 
        width: 3rem;

        &:active,
        &:focus,
        &:hover {
            color: var(--icon-tertiary-color);
        }
        
        &:hover {
            background: var(--input-border-color);
        }   
    }

    svg {
        left: .5rem;
        position: absolute;
        top: .75rem;
        z-index: 1;
    }

    & ~ small.note {
        color: var(--warning);
        padding: 1rem 0;
        width: 100%;

        svg {
            fill: var(--warning);
            height: 1.8rem!important;
            margin-left: 1.3rem;
            position: relative;
            top: 3px;
            width: 1.8rem!important;
        }
    }
}
</style>
