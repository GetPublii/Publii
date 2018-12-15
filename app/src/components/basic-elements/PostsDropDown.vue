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
        },
        returnedValue: {
            default: 'id'
        }
    },
    data () {
        return {
            selectedPost: ''
        };
    },
    computed: {
        postPages () {
            return this.$store.state.currentSite.posts.filter(post => {
                if (this.allowedPostStatus[0] === 'any') {
                    return true;
                }

                return this.allowedPostStatus.indexOf(post.status) > -1;                
            }).map(post => post[this.returnedValue]);
        }
    },
    watch: {
        value: function (newValue, oldValue) {
            this.selectedPost = newValue;
        }
    },
    mounted () {
        if (this.value) {
            this.selectedPost = this.value;
        }
    },
    methods: {
        postLabels (value) {
            return this.$store.state.currentSite.posts.filter(post => post[this.returnedValue] === value).map(post => post.title)[0];
        },
        closeDropdown () {
            this.$emit('input', this.selectedPost);
            this.$refs['dropdown'].isOpen = false;
        }
    }
}
</script>