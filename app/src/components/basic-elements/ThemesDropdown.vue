<template>
    <select
        :id="id"
        @change="onChangeEvent">
        <option value="">{{ $t('theme.selectTheme') }}</option>
        <optgroup
            v-for="key in themesGroups()"
            :label="themesGroupName(key)"
            :key="'themes-group-' + key">
            <option
                v-for="(item, value) in themesGroup(key)"
                :value="value"
                :key="'themes-group-' + key + '-' + value">
                {{ item }}
            </option>
        </optgroup>
    </select>
</template>

<script>
export default {
    name: 'themes-dropdown',
    props: {
        id: {
            default: '',
            required: true,
            type: String
        },
        value: {
            default: '',
            type: String
        }
    },
    data: function() {
        return {
            selectedValue: ''
        };
    },
    computed: {
        themes () {
            return this.$store.getters.themeSelect;
        }
    },
    methods: {
        onChangeEvent (e) {
            this.selectedValue = e.target.value;
            this.$emit('input', this.selectedValue);
        },
        themesGroups () {
            return Object.keys(this.themes);
        },
        themesGroupName (key) {
            return this.themes[key].name;
        },
        themesGroup (key) {
            return this.themes[key].items;
        }
    }
}
</script>

<style lang="scss" scoped>
@import '../../scss/variables.scss';

select {
    -webkit-appearance: none;
    max-width: 100%;
    min-width: 100px;
    min-height: 46px;
    position: relative;
    width: 100%;

    &:not([multiple]) {
        background: url('data:image/svg+xml;utf8,<svg fill="%238e929d" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 6"><polygon points="10 0 5 0 0 0 5 6 10 0"/></svg>') no-repeat calc(100% - 2rem) 50%;
        background-color: var(--input-bg);
        background-size: 10px;
        padding-right: 3rem;
    }
}

/*
 * Special rules for Windows
 */

body[data-os="win"] {
    select:not([multiple]) {
        height: 4.8rem;
    }
}
</style>
