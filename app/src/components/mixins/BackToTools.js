export default {
    methods: {
        goBack: function() {
            let siteName = this.$route.params.name;
            this.$router.push('/site/' + siteName + '/tools/');
        }
    }
};
