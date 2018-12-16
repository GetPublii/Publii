<template>
    <v-select
        ref="dropdown"
        :options="postPages"
        v-model="selectedPost"
        :custom-label="postLabels"
        :close-on-select="true"
        :show-labels="false"
        @select="closeDropdown()"
        :placeholder="placeholder"></v-select>
</template>

<script>
export default {
    name: 'posts-dropdown',
    props: {
        placeholder: {
            type: String,
            default: 'Select post page'
        },
        value: {},
        allowedPostStatus: {
            default: ['any']
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
                if (this.allowedPostStatus[0] === 'any') {
                    return true;
                }

                return this.allowedPostStatus.indexOf(post.status) > -1;                
            }).map(post => post.id));
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
            return this.$store.state.currentSite.posts.filter(post => post.id === value).map(post => post.title)[0];
        },
        closeDropdown () {
            this.$refs['dropdown'].isOpen = false;
        }
    }
}
</script>