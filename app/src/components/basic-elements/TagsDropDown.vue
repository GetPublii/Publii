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
        value: {}
    },
    data () {
        return {
            selectedTag: ''
        };
    },
    computed: {
        tagPages () {
            return [''].concat(this.$store.state.currentSite.tags.map(tag => tag.id));
        }
    },
    watch: {
        value: function (newValue, oldValue) {
            this.selectedTag = newValue;
        },
        selectedTag: function (newValue, oldValue) {
            this.$emit('input', newValue);
        }
    },
    mounted () {
        if (this.value) {
            this.selectedTag = this.value;
        }
    },
    methods: {
        tagLabels (value) {
            return this.$store.state.currentSite.tags.filter(tag => tag.id === value).map(tag => tag.name)[0];
        },
        closeDropdown () {
            this.$refs['dropdown'].isOpen = false;
        }
    }
}
</script>