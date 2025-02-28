<template>
    <v-select
        ref="dropdown"
        :class="'pages-dropdown ' + customCssClasses.replace(/[^a-z0-9\-\_\s]/gmi, '')"
        :id="anchor"
        :options="pages"
        v-model="selectedPage"
        :custom-label="pageLabels"
        :close-on-select="true"
        :show-labels="false"
        :multiple="multiple"
        @select="closeDropdown()"
        :placeholder="placeholder"></v-select>
</template>

<script>
export default {
    name: 'pages-dropdown',
    props: {
        multiple: {
            type: Boolean,
            default: false
        },
        anchor: {
            default: '',
            type: String
        },
        value: {},
        customCssClasses: {
            default: '',
            type: String
        }
    },
    data () {
        return {
            selectedPage: ''
        };
    },
    computed: {
        pages () {
            return [''].concat(this.$store.state.currentSite.pages.slice().sort((a, b) => {
                return a.title.localeCompare(b.title);
            }).map(page => page.id));
        },
        placeholder () {
            return this.$t('page.selectPage');
        }
    },
    watch: {
        value: function (newValue, oldValue) {
            this.selectedPage = newValue;
        },
        selectedPage: function (newValue, oldValue) {
            this.$emit('input', newValue);
        }
    },
    mounted () {
        if (this.value) {
            this.selectedPage = this.value;
        }
    },
    methods: {
        pageLabels (value) {
            return this.$store.state.currentSite.pages.filter(page => page.id === value).map(page => page.title)[0];
        },
        closeDropdown () {
            this.$refs['dropdown'].isOpen = false;
        }
    }
}
</script>

<style lang="scss">
.multiselect {
    line-height: 2;
}

.multiselect,
.multiselect__tags {
    min-height: 49px;
}

.multiselect__tags {
    padding: 0 4rem 0 1.8rem;
}

.posts-dropdown .multiselect__input {
    max-width: 100%;
}
</style>
