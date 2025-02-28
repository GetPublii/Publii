<template>
    <v-select
        ref="dropdown"
        :options="tagPages"
        v-model="selectedTag"
        :custom-label="tagLabels"
        :close-on-select="true"
        :show-labels="false"
        @select="closeDropdown()"
        :multiple="multiple"
        :id="anchor"
        :class="customCssClasses.replace(/[^a-z0-9\-\_\s]/gmi, '')"
        :placeholder="placeholder"></v-select>
</template>

<script>
export default {
    name: 'tags-dropdown',
    props: {
        multiple: {
            type: Boolean,
            default: false
        },
        value: {},
        anchor: {
            default: '',
            type: String
        },
        customCssClasses: {
            default: '',
            type: String
        }
    },
    data () {
        return {
            selectedTag: ''
        };
    },
    computed: {
        tagPages () {
            return [''].concat(this.$store.state.currentSite.tags.slice().sort((a, b) => {
                return a.name.localeCompare(b.name);
            }).map(tag => tag.id));
        },
        placeholder () {
            return this.$t('tag.selectTag');
        },
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
            return this.$store.state.currentSite.tags.filter(tag => tag.id === value).map(tag => {
                if (tag.additionalData.indexOf('"isHidden":true') > -1) {
                    return tag.name + ' (' + this.$t('tag.thisTagIsHidden') + ')';
                } else {
                    return tag.name;
                }
            })[0];
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

.multiselect__input {
    max-width: 100%;
}
</style>
