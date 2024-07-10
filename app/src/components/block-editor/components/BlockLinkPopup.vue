<template>
  <div
    @click.prevent.stop="hide()"
    :class="{ 'block-link-popup-overlay': true, 'is-visible': isVisible }">
    <div
      @click.prevent.stop
      class="block-link-popup">
      <div class="block-link-popup-link-type">
        <div
          :class="{ 'block-link-popup-link-type-item': true, 'is-active': linkType === 'external' }"
          @click="setLinkType('external')">
          {{ $t('editor.custom') }}
        </div>
        <div
          :class="{ 'block-link-popup-link-type-item': true, 'is-active': linkType === 'post' }"
          @click="setLinkType('post')">
          {{ $t('post.post') }}
        </div>
        <div
          :class="{ 'block-link-popup-link-type-item': true, 'is-active': linkType === 'page' }"
          @click="setLinkType('page')">
          {{ $t('page.page') }}
        </div>
        <div
          :class="{ 'block-link-popup-link-type-item': true, 'is-active': linkType === 'tag' }"
          @click="setLinkType('tag')">
          {{ $t('tag.tag') }}
        </div>
        <div
          :class="{ 'block-link-popup-link-type-item': true, 'is-active': linkType === 'author' }"
          @click="setLinkType('author')">
          {{ $t('author.author') }}
        </div>
        <div
          :class="{ 'block-link-popup-link-type-item': true, 'is-active': linkType === 'file' }"
          @click="setLinkType('file')">
          {{ $t('file.file') }}
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
        :placeholder="$t('post.selectPostPage')"></vue-select>
      <vue-select
        v-if="linkType === 'page'"
        slot="field"
        ref="pagesSelect"
        :options="pages"
        v-model="linkSelectedPage"
        :custom-label="customPageLabels"
        :close-on-select="true"
        :show-labels="false"
        :placeholder="$t('page.selectPage')"></vue-select>
      <vue-select
        v-if="linkType === 'tag'"
        slot="field"
        ref="tagPagesSelect"
        :options="tagPages"
        v-model="linkSelectedTag"
        :custom-label="customTagLabels"
        :close-on-select="true"
        :show-labels="false"
        :placeholder="$t('tag.selectTagPage')"></vue-select>
      <vue-select
        v-if="linkType === 'author'"
        slot="field"
        ref="authorPagesSelect"
        :options="authorPages"
        v-model="linkSelectedAuthor"
        :custom-label="customAuthorsLabels"
        :close-on-select="true"
        :show-labels="false"
        :placeholder="$t('author.selectAuthorPage')"></vue-select>
      <vue-select
        v-if="linkType === 'file'"
        slot="field"
        ref="fileSelect"
        :options="filesList"
        v-model="linkSelectedFile"
        :close-on-select="true"
        :show-labels="false"
        :placeholder="$t('file.selectFileFromFileManager')"></vue-select>
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
          {{ $t('link.openInNewTab') }}
      </div>

      <div
        v-if="linkType === 'file'"
        class="block-link-popup-link-switcher">
        <switcher v-model="link.download" /> {{ $t('link.addDownloadAttr') }}
      </div>

      <div class="block-link-popup-link-switcher">
        <switcher v-model="link.noFollow" /> {{ $t('link.addNofollow') }}
        <switcher v-model="link.sponsored"/> rel="sponsored"
        <switcher v-model="link.ugc" /> rel="ugc"
      </div>

      <div class="block-link-popup-buttons">
        <button @click.stop="save()">
          {{ $t('ui.save') }}
        </button>
        <button @click.stop="hide()" class="outline">
          {{ $t('ui.cancel') }}
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
      linkType: 'external',
      linkSelectedAuthor: '',
      linkSelectedPost: '',
      linkSelectedPage: '',
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
      this.linkType = 'external';
      this.linkSelectedAuthor = '';
      this.linkSelectedPost = '';
      this.linkSelectedPage = '';
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
        this.linkType = 'external';
        return;
      }

      if (this.link.url.indexOf('#INTERNAL_LINK#') > -1) {
        if (this.link.url.indexOf('post') > -1) {
          this.linkType = 'post';
          this.linkSelectedPost = parseInt(this.link.url.split('/').pop(), 10);
        } else if (this.link.url.indexOf('page') > -1) {
          this.linkType = 'page';
          this.linkSelectedPage = parseInt(this.link.url.split('/').pop(), 10);
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
      } else if (this.linkType === 'page') {
        if (this.linkSelectedPage) {
          return '#INTERNAL_LINK#/page/' + this.linkSelectedPage;
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
@import '../../../scss/variables.scss';

.block-link-popup {
  background: var(--popup-bg);
  border-radius: 6px;
  box-shadow: 0 0 32px var(--shadow);
  padding: 4rem;
  transform: scale(.5);
  transition: all .24s cubic-bezier(0, 0, 0.25, 0.99);
  user-select: none;
  width: 720px;

  &-overlay {
    align-items: center;
    background: var(--overlay);
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
    z-index: 999991;

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
        border-bottom: 2px solid var(--gray-6);
        color: var(--label-color);
        cursor: pointer;
        font-size: $app-font-base;
        font-weight: var(--font-weight-semibold);
        padding: 12px 12px 20px;
        text-align: center;
        transition: all .24s ease-out;
        user-select: none;
        width: 25%;

        &:hover {
           border-bottom-color: var(--color-primary);
        }

        &.is-active {
          border-bottom-color: var(--color-primary);
          font-weight: var(--font-weight-bold);
          color: var(--color-primary);
        }
      }
    }

    &-external-input {
      background: var(--input-bg);
      border: 1px solid var(--input-border-color);
      color: var(--text-primary-color);
      display: block;
      font-size: $app-font-base;
      margin: 32px 0 24px;
      padding: 14px;
      width: 100%;

      &::placeholder {
        color: var(--text-light-color);
      }
    }

    &-switcher {
      align-items: center;
      color: var(--label-color);
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

    &__tags {
      padding-bottom: 0;
      padding-top: 0;
    }
  }

  &-buttons {
    display: flex;
    margin: 3rem -4rem -4rem;

    button {
      background: var(--button-bg);
      border: none;
      box-shadow: none;
      border-bottom-left-radius: 6px;
      border-top: 1px solid var(--button-bg);
      color: var(--white);
      cursor: pointer;
      font-size: 15px;
      font-weight: var(--font-weight-semibold);
      line-height: 1;
      width: 50%;
      padding: 18px;
      transition: all .25s ease-out;

      &:hover {
        background: var(--button-bg-hover);
        border-color: var(--button-bg-hover);
      }

      &.outline {
        background: var(--popup-btn-cancel-bg);
        border: none;
        border-top: 1px solid var(--input-border-color);
        border-bottom-right-radius: 6px;
        color: var(--popup-btn-cancel-color);

        &:hover {
           background: var(--popup-btn-cancel-bg-hover);
           color: var(--popup-btn-cancel-hover-color);
        }
      }
    }
  }
}
</style>
