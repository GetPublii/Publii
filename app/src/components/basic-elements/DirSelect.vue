<template>
    <div
        class="box"
        @click="selectDir">
        <text-input
            icon="folder"
            ref="input"
            :id="id"
            :placeholder="placeholder"
            :value="value"
            :readonly="readonly"
            :spellcheck="false"
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
        readonly: {
            default: false,
            type: Boolean
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
            this.$emit('input', '');
        },
        async selectDir () {
            await mainProcessAPI.invoke('app-main-process-select-directory', 'dir-select');

            mainProcessAPI.receiveOnce('app-directory-selected', (data) => {
                if (data.path === undefined || !data.path.filePaths.length) {
                    return;
                }

                this.$refs.input.content = data.path.filePaths[0];
                this.fieldValue = data.path.filePaths[0];
                this.onChange(this.fieldValue);
                this.$emit('input', this.fieldValue);
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
