<template>
    <v-select
        ref="dropdown"
        :class="'posts-dropdown ' + customCssClasses.replace(/[^a-z0-9\-\_\s]/gmi, '')"
        :id="anchor"
        :options="postPages"
        :options-limit="100"
        v-model="selectedPost"
        :custom-label="postLabels"
        :close-on-select="true"
        :show-labels="false"
        :multiple="multiple"
        @select="closeDropdown()"
        :placeholder="placeholder"></v-select>
</template>

<script>
export default {
    name: 'posts-dropdown',
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
        allowedPostStatus: {
            default: ['any']
        },
        customCssClasses: {
            default: '',
            type: String
        }
    },
    data () {
        return {
            selectedPost: ''
        };
    },
    computed: {
        postPages () {
            return [''].concat(this.$store.state.currentSite.posts.filter(post => {
                let postStatuses = post.status.split(',');

                if (postStatuses.indexOf('trashed') > -1) {
                    return false;
                }

                if (this.allowedPostStatus[0] === 'any') {
                    return true;
                }

                return this.allowedPostStatus.some(status => postStatuses.includes(status));
            }).sort((a, b) => {
                return a.title.localeCompare(b.title);
            }).map(post => post.id));
        },
        placeholder () {
            return this.$t('post.selectPostPage');
        },
        postTitlesById () {
            let map = new Map();

            for (let post of this.$store.state.currentSite.posts) {
                map.set(post.id, post.title);
            }

            return map;
        }
    },
    watch: {
        value: function (newValue, oldValue) {
            this.selectedPost = newValue;
        },
        selectedPost: function (newValue, oldValue) {
            this.$emit('input', newValue);
        }
    },
    mounted () {
        if (this.value) {
            this.selectedPost = this.value;
        }
    },
    methods: {
        postLabels (value) {
            return this.postTitlesById.get(value);
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
