<template>
    <div 
        :id="anchor"
        :class="cssClasses">
        <template v-for="(item, index) in items">
            <input
                type="radio"
                :name="name"
                :id="name + '-' + item.value"
                :value="item.value"
                :key="'radio-item-' + index"
                :disabled="item.disabled"
                v-model="content" />
            <label
                class="radio"
                :for="name + '-' + item.value"
                :key="'radio-label-' + index">
                {{ item.label }}
            </label>
        </template>
    </div>
</template>

<script>
export default {
    name: 'radio-buttons',
    props: {
        name: {
            default: '',
            type: String
        },
        items: {
            default: () => [],
            type: Array
        },
        value: {
            default: '',
            type: [String, Number]
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
                'radio-buttons': true 
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
    data: function() {
        return {
            content: this.value
        };
    },
    watch: {
        value (newValue, oldValue) { 
            this.content = newValue;
        },
        content: function(newValue) {
            this.$emit('input', newValue);
        }
    }
}
</script>

<style scoped>

/*
 * Radio buttons
 */

input[type="radio"] {
    display: none;
}

input[type="radio"] + label {
    color: var(--label-color);
    display: inline-block;
    cursor: pointer;
    top: 0;
    margin-right: var(--space-4);
}

label.radio:before {
    border: 1px solid var(--input-border-color);
    border-radius: 2px;
    content: "";
    display: inline-block;
    height: 1.8rem;
    line-height: 1.8rem;
    margin-right: var(--space-2);
    vertical-align: sub;
    text-align: center;
    width: 1.8rem;
}

label.radio:before {
    border-radius: 50%;
}

input[type="radio"]:checked + label.radio:before {
    background: var(--input-border-focus);
    border: 1px solid var(--input-border-focus);
    box-shadow: inset 0 0 0 4px var(--input-bg);
    content: "";
}
</style>
