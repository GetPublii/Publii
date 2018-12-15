<template>
    <v-select
        ref="dropdown"
        :options="tagPages"
        v-model="selectedTag"
        :custom-label="tagLabels"
        :close-on-select="true"
        :show-labels="false"
        @select="closeDropdown()"
        :placeholder="placeholder"></v-select>
</template>

<script>
export default {
    name: 'tags-dropdown',
    props: {
        placeholder: {
            type: String,
            default: 'Select tag page'
        },
        value: {},
        returnedValue: {
            default: 'id'
        }
    },
    data () {
        return {
            selectedTag: ''
        };
    },
    computed: {
        tagPages () {
            return this.$store.state.currentSite.tags.map(tag => tag[this.returnedValue]);
        }
    },
    watch: {
        value: function (newValue, oldValue) {
            this.selectedTag = newValue;
        }
    },
    mounted () {
        if (this.value) {
            this.selectedTag = this.value;
        }
    },
    methods: {
        tagLabels (value) {
            return this.$store.state.currentSite.tags.filter(tag => tag[this.returnedValue] === value).map(tag => tag.name)[0];
        },
        closeDropdown () {
            this.$emit('input', this.selectedTag);
            this.$refs['dropdown'].isOpen = false;
        }
    }
}
</script>