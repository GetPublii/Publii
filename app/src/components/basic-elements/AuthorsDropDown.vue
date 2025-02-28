<template>
<div>
    <v-select
        ref="dropdown"
        :options="authors"
        v-model="selectedAuthor"
        :custom-label="authorLabels"
        :close-on-select="true"
        :show-labels="false"
        @select="closeDropdown()"
        :multiple="multiple"
        :id="anchor"
        :class="customCssClasses.replace(/[^a-z0-9\-\_\s]/gmi, '')"
        :placeholder="placeholder"></v-select>
</div>
</template>

<script>
export default {
    name: 'authors-dropdown',
    props: {
        multiple: {
            type: Boolean,
            default: false
        },
        value: {},
        anchor: {
            type: String,
            default: '',
        },
        customCssClasses: {
            default: '',
            type: String
        }
    },
    data () {
        return {
            selectedAuthor: ''
        };
    },
    computed: {
        authors () {
            return [''].concat(this.$store.state.currentSite.authors.slice().sort((a, b) => {
                return a.username.localeCompare(b.username);
            }).map(author => author.id));
        },
        placeholder () {
            return this.$t('author.selectAuthor');
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
    min-height: 49px;
}

.multiselect__tags {
    padding: 0 4rem 0 1.8rem;
}

.multiselect__input {
    max-width: 100%;
}
</style>
