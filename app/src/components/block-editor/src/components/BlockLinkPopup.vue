<template>
  <div
    @click.prevent.stop="hide()"
    :class="{ 'block-link-popup-overlay': true, 'is-visible': isVisible }">
    <div
      @click.prevent.stop
      class="block-link-popup">
      <div class="block-link-popup-link-type">
        <div
          :class="{ 'block-link-popup-link-type-item': true, 'is-active': linkType === 'post' }"
          @click="setLinkType('post')">
          Post
        </div>
        <div
          :class="{ 'block-link-popup-link-type-item': true, 'is-active': linkType === 'tag' }"
          @click="setLinkType('tag')">
          Tag
        </div>
        <div
          :class="{ 'block-link-popup-link-type-item': true, 'is-active': linkType === 'author' }"
          @click="setLinkType('author')">
          Author
        </div>
        <div
          :class="{ 'block-link-popup-link-type-item': true, 'is-active': linkType === 'external' }"
          @click="setLinkType('external')">
          Custom
        </div>
        <div
          :class="{ 'block-link-popup-link-type-item': true, 'is-active': linkType === 'file' }"
          @click="setLinkType('file')">
          File
        </div>
      </div>
      <vue-select
        v-if="linkType === 'post'"
        slot="field"
        ref="postPagesSelect"
        :options="postPages"
        v-model="linkSelectedPost"
        :custom-label="customPostLabels"
        :close-on-select="true"
        :show-labels="false"
        placeholder="Select post page"></vue-select>
      <vue-select
        v-if="linkType === 'tag'"
        slot="field"
        ref="tagPagesSelect"
        :options="tagPages"
        v-model="linkSelectedTag"
        :custom-label="customTagLabels"
        :close-on-select="true"
        :show-labels="false"
        placeholder="Select tag page"></vue-select>
      <vue-select
        v-if="linkType === 'author'"
        slot="field"
        ref="authorPagesSelect"
        :options="authorPages"
        v-model="linkSelectedAuthor"
        :custom-label="customAuthorsLabels"
        :close-on-select="true"
        :show-labels="false"
        placeholder="Select author page"></vue-select>
      <vue-select
        v-if="linkType === 'file'"
        slot="field"
        ref="fileSelect"
        :options="filesList"
        v-model="linkSelectedFile"
        :close-on-select="true"
        :show-labels="false"
        placeholder="Select file from File Manager"></vue-select>
      <input
        v-if="linkType === 'external'"
        type="text"
        class="block-link-popup-link-external-input"
        v-model="link.url"
        :spellcheck="false"
        placeholder="https://example.com"
        @keyup.enter="save()" />
      <div class="block-link-popup-link-switcher">
        <switcher
          v-model="link.targetBlank" />
        Open in new tab
      </div>

      <div
        v-if="linkType === 'file'"
        class="block-link-popup-link-switcher">
        <switcher v-model="link.download" /> Add "download" attribute
      </div>

      <div class="block-link-popup-link-switcher">
        <switcher v-model="link.noFollow" /> Add rel="nofollow"
        <switcher v-model="link.sponsored"/> rel="sponsored"
        <switcher v-model="link.ugc" /> rel="ugc"
      </div>

      <div class="block-link-popup-buttons">
        <button @click.stop="save()">
          Save
        </button>
        <button @click.stop="hide()" class="outline">
          Cancel
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import Switcher from './elements/Switcher.vue';
import LinkHelpers from './mixins/LinkHelpers.vue';
import vSelect from 'vue-multiselect/dist/vue-multiselect.min.js';

export default {
  name: 'block-link-popup',
  mixins: [
    LinkHelpers
  ],
  components: {
    'switcher': Switcher,
    'vue-select': vSelect
  },
  data () {
    return {
      isVisible: false,
      currentBlockID: '',
      linkType: 'post',
      linkSelectedAuthor: '',
      linkSelectedPost: '',
      linkSelectedTag: '',
      linkSelectedFile: '',
      link: {
        url: '',
        noFollow: false,
        targetBlank: false,
        sponsored: false,
        ugc: false,
        download: false
      }
    };
  },
  watch: {
    linkType (newValue) {
      if (newValue !== 'file') {
        this.link.download = false;
      }
    }
  },
  mounted () {
    this.$bus.$on('block-editor-show-link-popup', this.show);
  },
  methods: {
    show (blockID, link) {
      this.isVisible = true;
      this.currentBlockID = blockID;
      this.linkType = 'post';
      this.linkSelectedAuthor = '';
      this.linkSelectedPost = '';
      this.linkSelectedTag = '';
      this.linkSelectedFile = '';
      this.link = {
        url: '',
        noFollow: false,
        targetBlank: false,
        sponsored: false,
        ugc: false,
        download: false
      };
      this.link = Object.assign(this.link, JSON.parse(JSON.stringify(link)));
      this.parseLink();
    },
    hide () {
      this.isVisible = false;
      this.$bus.$emit('block-editor-hide-link-popup');

      setTimeout(() => {
        this.currentBlockID = '';
      }, 500);
    },
    parseLink () {
      if (this.link.url === '') {
        this.linkType = 'post';
        return;
      }

      if (this.link.url.indexOf('#INTERNAL_LINK#') > -1) {
        if (this.link.url.indexOf('post') > -1) {
          this.linkType = 'post';
          this.linkSelectedPost = parseInt(this.link.url.split('/').pop(), 10);
        } else if (this.link.url.indexOf('tag') > -1) {
          this.linkType = 'tag';
          this.linkSelectedTag = parseInt(this.link.url.split('/').pop(), 10);
        } else if (this.link.url.indexOf('author') > -1) {
          this.linkType = 'author';
          this.linkSelectedAuthor = parseInt(this.link.url.split('/').pop(), 10);
        } else if (this.link.url.indexOf('file') > -1) {
          this.linkType = 'file';
          this.linkSelectedFile = this.link.url.replace('#INTERNAL_LINK#/file/', '');
        }
      } else {
        this.linkType = 'external';
      }
    },
    setLinkType (type) {
      this.linkType = type;

      if (type === 'external' && this.link.url.indexOf('#INTERNAL_LINK#') === 0) {
        this.link.url = '';
      }
    },
    prepareLink () {
      if (this.linkType === 'post') {
        if (this.linkSelectedPost) {
          return '#INTERNAL_LINK#/post/' + this.linkSelectedPost;
        } else {
          return '';
        }
      } else if (this.linkType === 'author') {
        if (this.linkSelectedAuthor) {
          return '#INTERNAL_LINK#/author/' + this.linkSelectedAuthor;
        } else {
          return '';
        }
      } else if (this.linkType === 'tag') {
        if (this.linkSelectedTag) {
          return '#INTERNAL_LINK#/tag/' + this.linkSelectedTag;
        } else {
          return '';
        }
      } else if (this.linkType === 'file') {
        if (this.linkSelectedFile) {
          return '#INTERNAL_LINK#/file/' + this.linkSelectedFile;
        } else {
          return '';
        }
      }

      if (this.link.url[0] && this.link.url[0] !== '#') {
        if (
          this.link.url.substr(0, 8) !== 'https://' &&
          this.link.url.substr(0, 7) !== 'http://' &&
          this.link.url.substr(0, 6) !== 'dat://' &&
          this.link.url.substr(0, 6) !== 'ftp://' &&
          this.link.url.substr(0, 3) !== '://' &&
          this.link.url.substr(0, 2) !== '//' &&
          this.link.url.substr(0, 7) !== 'mailto:' &&
          this.link.url.substr(0, 4) !== 'tel:'
        ) {
          if (this.link.url.indexOf('@') > -1) {
            this.link.url = 'mailto:' + this.link.url;
          } else {
            this.link.url = 'https://' + this.link.url;
          }
        }
      }

      return this.link.url;
    },
    save () {
      this.link.url = this.prepareLink();
      this.$bus.$emit('block-editor-save-link-popup', this.currentBlockID, this.link);
      this.hide();
    }
  },
  beforeDestroy () {
    this.$bus.$off('block-editor-show-link-popup', this.show);
  }
};
</script>

<style lang="scss">
@import '../assets/variables.scss';

.block-link-popup {
  background: var(--eb-popup-bg);
  border-radius: 6px;
  box-shadow: 0 0 32px var(--eb-shadow);
  padding: 2rem;
  transform: scale(.5);
  transition: all .24s cubic-bezier(0, 0, 0.25, 0.99);
  user-select: none;
  width: 580px;

  &-overlay {
    align-items: center;
    background: var(--eb-overlay);
    display: flex;
    height: 100%;
    justify-content: center;
    left: 0;
    opacity: 0;
    pointer-events: none;
    position: fixed;
    top: 0;
    transition: all .3s ease-out;
    width: 100%;
    z-index: 10000;

    &.is-visible {
      opacity: 1;
      pointer-events: auto;

      .block-link-popup {
        transform: scale(1);
      }
    }
  }

  &-link {
    width: 100%;

    &-type {
      display: flex;
      justify-content: space-between;
      margin: -20px 0 3rem;

      &-item {
        border-bottom: 2px solid var(--eb-gray-2);
        color: var(--eb-label-color);
        cursor: pointer;
        font-size: 15px;
        font-weight: 500;
        padding: 12px 12px 20px;
        text-align: center;
        transition: all .24s ease-out;
        user-select: none;
        width: 25%;

        &:hover {
           border-bottom-color: var(--eb-primary-color);
        }

        &.is-active {
          border-bottom-color: var(--eb-primary-color);
          font-weight: var(--font-weight-bold);
          color: var(--eb-primary-color);
        }
      }
    }

    &-external-input {
      background: var(--eb-input-bg);
      border: 1px solid var(--eb-input-border-color);
      color: var(--eb-text-primary-color);
      display: block;
      font-size: 16px;
      margin: 32px 0 24px;
      padding: 14px;
      width: 100%;

      &::placeholder {
        color: var(--eb-text-light-color);
      }
    }

    &-switcher {
      align-items: center;
      color: var(--eb-label-color);
      display: flex;
      margin-bottom: 12px;

      .switcher {
        top: 0;

          & + .switcher {
              margin-left: 24px;
          }
      }

      &:last-of-type {
        margin-bottom: 12px;
      }
    }
  }

  .multiselect {
    margin: 32px 0 24px;
  }

  &-buttons {
    margin: 3rem -2rem -2rem;

    button {
      background: var(--eb-button-bg);
      border: none;
      box-shadow: none;
      border-bottom-left-radius: 6px;
      border-top: 1px solid var(--eb-button-bg);
      color: var(--eb-white);
      cursor: pointer;
      font-size: 15px;
      font-weight: var(--font-weight-semibold);
      line-height: 1;
      width: 50%;
      padding: 18px;
      transition: all .25s ease-out;

      &:hover {
        background: var(--eb-button-hover-bg);
        border-color: var(--eb-button-hover-bg);
      }

      &.outline {
        background: var(--eb-popup-btn-cancel-bg);
        border: none;
        border-top: 1px solid var(--eb-input-border-color);
        border-bottom-right-radius: 6px;
        color: var(--eb-popup-btn-cancel-color);

        &:hover {
           background: var(--eb-popup-btn-cancel-hover-bg);
           color: var(--eb-popup-btn-cancel-hover-color);
        }
      }
    }
  }
}
</style>
