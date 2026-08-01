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
    },
    postTitlesById () {
      let map = new Map();

      if (this.$parent.currentSiteData) {
        for (let post of this.$parent.currentSiteData.posts) {
          map.set(post.id, post.title);
        }
      }

      return map;
    },
    pageTitlesById () {
      let map = new Map();

      if (this.$parent.currentSiteData) {
        for (let page of this.$parent.currentSiteData.pages) {
          map.set(page.id, page.title);
        }
      }

      return map;
    },
    tagNamesById () {
      let map = new Map();

      if (this.$parent.currentSiteData) {
        for (let tag of this.$parent.currentSiteData.tags) {
          map.set(tag.id, tag.name);
        }
      }

      return map;
    },
    authorNamesByUsername () {
      let map = new Map();

      if (this.$parent.currentSiteData) {
        for (let author of this.$parent.currentSiteData.authors) {
          map.set(author.username, author.name);
        }
      }

      return map;
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
      return this.tagNamesById.get(value) || '';
    },
    customAuthorsLabels (value) {
      return this.authorNamesByUsername.get(value) || '';
    },
    customPostLabels (value) {
      return this.postTitlesById.get(value) || '';
    },
    customPageLabels (value) {
      return this.pageTitlesById.get(value) || '';
    }
  }
}
</script>
