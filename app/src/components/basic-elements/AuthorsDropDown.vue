<template>
    <v-select
        ref="dropdown"
        :options="authors"
        v-model="selectedAuthor"
        :custom-label="authorLabels"
        :close-on-select="true"
        :show-labels="false"
        @select="closeDropdown()"
        :multiple="mutliple"
        :placeholder="placeholder"></v-select>
</template>

<script>
export default {
    name: 'authors-dropdown',
    props: {
        multiple: {
            type: Boolean,
            default: false
        },
        placeholder: {
            type: String,
            default: 'Select author'
        },
        value: {}
    },
    data () {
        return {
            selectedAuthor: ''
        };
    },
    computed: {
        authors () {
            return [''].concat(this.$store.state.currentSite.authors.map(author => author.id));
        }
    },
    watch: {
        value: function (newValue, oldValue) {
            this.selectedAuthor = newValue;
        },
        selectedAuthor: function (newValue, oldValue) {
            this.$emit('input', this.selectedAuthor);
        }
    },
    mounted () {
        if (this.value) {
            this.selectedAuthor = this.value;
        }
    },
    methods: {
        authorLabels (value) {
            return this.$store.state.currentSite.authors.filter(author => author.id === value).map(author => author.name)[0];
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
    min-height: 52px;
}

.multiselect__input {
    max-width: 120px;
}
</style>
