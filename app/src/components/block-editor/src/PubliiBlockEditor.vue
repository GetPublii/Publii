<template>
  <div id="publii-block-editor">
    <div
      id="post-title"
      ref="post-title"
      class="post-editor-form-title"
      contenteditable="true"
      @paste.prevent="pasteTitle"
      @keydown="detectEnterInTitle"
      @keyup="updateTitle"></div>

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
  components: {
    BlockEditor
  },
  mounted () {
    if (this.$ipcRenderer) {
      this.$ipcRenderer.on('set-post-id', this.setPostID);
      this.$ipcRenderer.on('set-post-text', this.setPostText);
      this.$ipcRenderer.on('set-post-title', this.setPostTitle);
      this.$ipcRenderer.on('post-save', this.postSave);
      this.$ipcRenderer.on('set-current-site-data', this.setCurrentSiteData);
      this.$ipcRenderer.on('block-editor-undo', this.undoAction);
      this.$ipcRenderer.on('block-editor-redo', this.redoAction);
    }

    this.$refs['post-title'].focus();
  },
  methods: {
    setPostID (event, postID) {
      this.$refs['block-editor'].setPostID(postID);
    },
    setPostText (event, postText) {
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
    setPostTitle (event, postTitle) {
      this.$refs['post-title'].innerText = postTitle;
    },
    updateTitle () {
      let title = this.$refs['post-title'].innerText.replace(/\n/gmi, ' ');

      if (this.$ipcRenderer) {
        this.$ipcRenderer.sendToHost('editor-title-updated', title);
      }
    },
    pasteTitle (e) {
      let text = (e.originalEvent || e).clipboardData.getData('text/plain').replace(/\n/gmi, '');
      document.execCommand('insertHTML', false, text);
    },
    postSave () {
      this.$bus.$emit('publii-block-editor-save');

      setTimeout(() => {
        if (this.$ipcRenderer) {
          this.$ipcRenderer.sendToHost('editor-post-saved', document.querySelector('#post-editor').value);
        }
      }, 500);
    },
    setCurrentSiteData (event, currentSiteData) {
      this.$refs['block-editor'].currentSiteData = currentSiteData;
    },
    undoAction () {
      this.$refs['block-editor'].undo();
    },
    redoAction () {

    }
  }
}
</script>

<style>
#post-title {
  border: none;
  box-shadow: none;
  color: var(--eb-text-primary-color);
  display: block;
  font-family: -apple-system, BlinkMacSystemFont, Arial, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif;
  font-size: 35px;
  font-weight: 600;
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

#post-title:empty {
  color: var(--eb-icon-primary-color);
}

#post-title:empty:before {
  content: "Add post title";
  color: var(--eb-gray-4);
}

#post-title:empty:focus:before {
  content: "";
}

@media (min-width: 1800px) {
    #post-title {
        margin: 0 auto 1.6rem;
        max-width: calc(100% - 880px);
        width: 100%;
    }
}
</style>
