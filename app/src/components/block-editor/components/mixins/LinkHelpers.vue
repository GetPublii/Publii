<script>
export default {
  name: 'link-helpers',
  computed: {
    tagPages () {
      if (!this.$parent.currentSiteData || !this.$parent.currentSiteData.tags.length) {
        return [0];
      }

      return this.$parent.currentSiteData.tags.filter(tag => tag.additionalData.indexOf('"isHidden":true') === -1).map(tag => tag.id);
    },
    authorPages () {
      if (!this.$parent.currentSiteData || !this.$parent.currentSiteData.authors.length) {
        return [''];
      }

      return this.$parent.currentSiteData.authors.map(author => author.username).sort((a, b) => {
        if (a.toLowerCase() < b.toLowerCase()) {
          return -1;
        }

        if (a.toLowerCase() > b.toLowerCase()) {
          return 1;
        }

        return 0;
      });
    },
    postPages () {
      if (!this.$parent.currentSiteData || !this.$parent.currentSiteData.posts.length) {
        return [0];
      }

      return this.$parent.currentSiteData.posts.filter(post => post.status.indexOf('published') > -1).map(post => post.id);
    },
    pages () {
      if (!this.$parent.currentSiteData || !this.$parent.currentSiteData.pages.length) {
        return [0];
      }

      return this.$parent.currentSiteData.pages.filter(page => page.status.indexOf('published') > -1).map(page => page.id);
    },
    filesList () {
      if (!this.$parent.currentSiteData || !this.$parent.currentSiteData.files.length) {
        return [''];
      }

      return this.$parent.currentSiteData.files;
    }
  },
  methods: {
    linkIsInvalid (link) {
      if (
        link.indexOf('http://') === -1 &&
        link.indexOf('https://') === -1 &&
        link.indexOf('://') === -1 &&
        link.indexOf('dat://') === -1 &&
        link.indexOf('ipfs://') === -1 &&
        link.indexOf('dweb://') === -1 &&
        link.indexOf('//') !== 0 &&
        link.indexOf('#') !== 0
      ) {
        return true;
      }

      return false;
    },
    customTagLabels (value) {
      if (!this.$parent.currentSiteData || !this.$parent.currentSiteData.tags.length) {
        return '';
      }

      return this.$parent.currentSiteData.tags.filter(tag => tag.id === value).map(tag => tag.name)[0];
    },
    customAuthorsLabels (value) {
      if (!this.$parent.currentSiteData || !this.$parent.currentSiteData.authors.length) {
        return '';
      }

      return this.$parent.currentSiteData.authors.filter(author => author.username === value).map(author => author.name)[0];
    },
    customPostLabels (value) {
      if (!this.$parent.currentSiteData || !this.$parent.currentSiteData.posts.length) {
        return '';
      }

      return this.$parent.currentSiteData.posts.filter(post => post.id === value).map(post => post.title)[0];
    },
    customPageLabels (value) {
      if (!this.$parent.currentSiteData || !this.$parent.currentSiteData.pages.length) {
        return '';
      }

      return this.$parent.currentSiteData.pages.filter(page => page.id === value).map(page => page.title)[0];
    }
  }
}
</script>
