<template>
    <v-select
        ref="dropdown"
        :options="authors"
        v-model="selectedAuthor"
        :custom-label="authorLabels"
        :close-on-select="true"
        :show-labels="false"
        @select="closeDropdown()"
        :placeholder="placeholder"></v-select>
</template>

<script>
export default {
    name: 'authors-dropdown',
    props: {
        placeholder: {
            type: String,
            default: 'Select author'
        },
        value: {},
        returnedValue: {
            default: 'id'
        }
    },
    data () {
        return {
            selectedAuthor: ''
        };
    },
    computed: {
        authors () {
            return this.$store.state.currentSite.authors.map(author => author[this.returnedValue]);
        }
    },
    watch: {
        value: function (newValue, oldValue) {
            this.selectedAuthor = newValue;
        }
    },
    mounted () {
        if (this.value) {
            this.selectedAuthor = this.value;
        }
    },
    methods: {
        authorLabels (value) {
            return this.$store.state.currentSite.authors.filter(author => author[this.returnedValue] === value).map(author => author.name)[0];
        },
        closeDropdown () {
            this.$emit('input', this.selectedAuthor);
            this.$refs['dropdown'].isOpen = false;
        }
    }
}
</script>