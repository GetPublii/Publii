import { shell } from 'electron';

export default {
    mounted: function() {
        setTimeout(() => {
            this.$refs.content.addEventListener('click', this.externalLinks);
        }, 0);
    },
    methods: {
        externalLinks: function(e) {
            if(e.target.tagName === 'A' && e.target.getAttribute('target') === '_blank') {
                e.preventDefault();
                shell.openExternal(e.target.getAttribute('href'));
            }
        }
    },
    beforeDestroy: function() {
        this.$refs.content.removeEventListener('click', this.externalLinks);
    }
};
