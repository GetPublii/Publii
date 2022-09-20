<script>
export default {
    name: 'post-editors-common',
    mounted () {
        this.sidebarVisible = localStorage.getItem('publii-' + this.$options.editorType + '-editor-sidebar') === 'opened';
        this.$bus.$on('update-post-slug', this.updateSlug);
    },
    methods: {
        slugUpdated () {
            this.postSlugEdited = true;
        },
        async updateSlug (forceUpdate = false) {
            if ((this.isEdit || this.postSlugEdited) && !forceUpdate) {
                return;
            }

            let slugValue = await mainProcessAPI.invoke('app-main-process-create-slug', this.postData.title);
            this.postData.slug = slugValue;
        },
        toggleSidebar () {
            this.sidebarVisible = !this.sidebarVisible;

            if (this.sidebarVisible) {
                this.sidebarVisible = true;
                localStorage.setItem('publii-' + this.$options.editorType + '-editor-sidebar', 'opened');
            } else {
                this.sidebarVisible = false;
                localStorage.setItem('publii-' + this.$options.editorType + '-editor-sidebar', 'closed');
            }
        },
        closeEditor () {
            let siteName = this.$route.params.name;

            if (this.postData.isTrashed) {
                this.$router.push('/site/' + siteName + '/posts/trashed');
            } else {
                this.$router.push('/site/' + siteName + '/posts/');
            }
        }
    },
    beforeDestroy () {
        this.$bus.$off('update-post-slug', this.updateSlug);
    }
}
</script>
