<template>
  <div id="publii-block-editor">
    <div
      id="post-title"
      ref="post-title"
      class="post-editor-form-title"
      contenteditable="true"
      @paste.prevent="pasteTitle"
      @keydown="detectEnterInTitle"
      @input="updateTitle"
      :data-translation="itemType === 'post' ? $t('post.addPostTitle') : $t('page.addPageTitle')"></div>

    <block-editor
        ref="block-editor" />
    <textarea
        id="post-editor"></textarea>
    <input
        name="image"
        id="post-editor-fake-image-uploader"
        class="is-hidden"
        type="file" />
    <input
        name="image"
        id="post-editor-fake-multiple-images-uploader"
        class="is-hidden"
        type="file"
        multiple />
  </div>
</template>

<script>
import Vue from 'vue';
import BlockEditor from './components/BlockEditor.vue';

export default {
  name: 'publii-block-editor',
  props: [
    'itemType'
  ],
  components: {
    BlockEditor
  },
  mounted () {
    this.$bus.$on('block-editor-set-post-id', this.setPostID);
    this.$bus.$on('block-editor-set-post-text', this.setPostText);
    this.$bus.$on('block-editor-set-post-title', this.setPostTitle);
    this.$bus.$on('block-editor-post-save', this.postSave);
    this.$bus.$on('block-editor-set-current-site-data', this.setCurrentSiteData);
    mainProcessAPI.receive('block-editor-undo', this.undoAction);
    mainProcessAPI.receive('block-editor-redo', this.redoAction);
    this.$refs['post-title'].focus();
  },
  methods: {
    setPostID (postID) {
      this.$refs['block-editor'].setPostID(postID);
    },
    setPostText (postText) {
      document.getElementById('post-editor').value = postText;

      setTimeout(() => {
        this.$bus.$emit('publii-block-editor-load');
      }, 0);
    },
    detectEnterInTitle (event) {
      if (event.key === 'Enter') {
        event.preventDefault();
        let firstBlockID = this.$refs['block-editor'].content[0].id;
        this.$refs['block-editor'].$refs['block-' + firstBlockID][0].focus();
      }
    },
    setPostTitle (postTitle) {
      this.$refs['post-title'].innerText = postTitle;
    },
    updateTitle () {
      let title = this.$refs['post-title'].innerText.replace(/\n/gmi, ' ');
      this.$bus.$emit('block-editor-title-updated', title);
    },
    pasteTitle (e) {
      let text = (e.originalEvent || e).clipboardData.getData('text/plain').replace(/\n/gmi, '');
      document.execCommand('insertHTML', false, text);
    },
    postSave () {
      this.$bus.$emit('publii-block-editor-save');

      setTimeout(() => {
        this.$bus.$emit('block-editor-post-saved');
      }, 500);
    },
    setCurrentSiteData (currentSiteData) {
      this.$refs['block-editor'].currentSiteData = currentSiteData;
    },
    undoAction () {
      this.$refs['block-editor'].undo();
    },
    redoAction () {

    }
  },
  beforeDestroy () {
    this.$bus.$off('block-editor-set-post-id', this.setPostID);
    this.$bus.$off('block-editor-set-post-text', this.setPostText);
    this.$bus.$off('block-editor-set-post-title', this.setPostTitle);
    this.$bus.$off('block-editor-post-save', this.postSave);
    this.$bus.$off('block-editor-set-current-site-data', this.setCurrentSiteData);
    mainProcessAPI.stopReceiveAll('block-editor-undo', this.undoAction);
    mainProcessAPI.stopReceiveAll('block-editor-redo', this.redoAction);
  }
}
</script>

<style>
#post-title {
  border: none;
  box-shadow: none;
  color: var(--headings-color);
  display: block;
  font-family: -apple-system, BlinkMacSystemFont, Arial, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif;
  font-size: 36px;
  font-weight: var(--font-weight-bold);
  letter-spacing: var(--letter-spacing);
  line-height: 1.2;
  margin: 0 10% 1.6rem;
  outline: none;
  padding: 0;
  text-align: center;
  width: 80%;
}

#post-editor {
  display: none;
}

#post-title:empty:before {
  content: attr(data-translation);
  color: var(--gray-4);
}

#post-title:empty:focus:before {
  content: "";
}

@media (min-width: 1800px) {
    #post-title {
        margin: 0 auto 1.6rem;
        max-width: calc(100vw - 880px);
        width: 100%;
    }
}
</style>
