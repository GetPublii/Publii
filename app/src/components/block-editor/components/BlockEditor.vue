<template>
  <div
    class="editor"
    data-ui-opened-block=""
    ref="editor-main"
    @click="$bus.$emit('block-editor-deselect-blocks')">
    <div :class="{ 'editor-inner': true }">
      <block-wrapper
        v-for="block of content"
        :id="block.id"
        :block-type="block.type"
        :key="'block-wrapper-' + block.id"
        :ref="'block-wrapper-' + block.id"
        :editor="editorInstance">
        <component
          :is="block.type"
          :id="block.id"
          :inputConfig="block.config"
          :inputContent="block.content"
          :key="'block-' + block.id"
          :ref="'block-' + block.id"
          :editor="editorInstance" />
      </block-wrapper>
      <div
        class="editor-inner-trigger"
        @click="addNewParagraphAtEnd"></div>
    </div>

    <block-advanced-config />
    <block-link-popup />
    <blocks-list
      :content="simplifiedContent" />
  </div>
</template>

<script>
// core elements
import Vue from 'vue';
import Block from './Block.vue';
import BlockAdvancedConfig from './BlockAdvancedConfig.vue';
import BlockLinkPopup from './BlockLinkPopup.vue';
import BlocksList from './BlocksList.vue';
import BlockWrapper from './BlockWrapper.vue';
import ContentEditableImprovements from './helpers/ContentEditableImprovements.vue';
import { compileToFunctions } from 'vue-template-compiler';
import Icon from './elements/EditorIcon.vue';
// default blocks
import PubliiCode from './default-blocks/publii-code/block.vue';
// import PubliiEmbed from './default-blocks/publii-embed/block.vue';
import PubliiHeader from './default-blocks/publii-header/block.vue';
import PubliiHtml from './default-blocks/publii-html/block.vue';
import PubliiImage from './default-blocks/publii-image/block.vue';
import PubliiGallery from './default-blocks/publii-gallery/block.vue';
import PubliiList from './default-blocks/publii-list/block.vue';
import PubliiParagraph from './default-blocks/publii-paragraph/block.vue';
import PubliiReadmore from './default-blocks/publii-readmore/block.vue';
import PubliiSeparator from './default-blocks/publii-separator/block.vue';
import PubliiToc from './default-blocks/publii-toc/block.vue';
import PubliiQuote from './default-blocks/publii-quote/block.vue';
// extensions
import ConversionHelpers from './extensions/ConversionHelpers.js';
import ShortcutManager from './extensions/ShortcutManager.js';
import UndoManager from './extensions/UndoManager.js';

export default {
  name: 'BlockEditor',
  components: {
    'block-advanced-config': BlockAdvancedConfig,
    'block-link-popup': BlockLinkPopup,
    'block-wrapper': BlockWrapper,
    'blocks-list': BlocksList,
    'icon': Icon,
    'publii-code': PubliiCode,
    // 'publii-embed': PubliiEmbed,
    'publii-header': PubliiHeader,
    'publii-html': PubliiHtml,
    'publii-image': PubliiImage,
    'publii-gallery': PubliiGallery,
    'publii-list': PubliiList,
    'publii-paragraph': PubliiParagraph,
    'publii-readmore': PubliiReadmore,
    'publii-separator': PubliiSeparator,
    'publii-toc': PubliiToc,
    'publii-quote': PubliiQuote
  },
  computed: {
    hasReadMore () {
      return this.content.filter(block => block.type === 'publii-readmore').length > 0;
    },
    simplifiedContent () {
      return this.content.map((block, index) => ({ 
        id: block.id, 
        type: block.type,
        isFirstAndEmpty: index === 0 && !block.content
      }));
    }
  },
  data () {
    return {
      editorInstance: this,
      uiSelectorID: false,
      config: {
        postID: ''
      },
      currentSiteData: null,
      state: {
        selectedBlockID: false
      },
      internal: {
        lastScroll: 0,
        firstBlockID: 0,
        lastBlockID: 0,
        currentBlockID: 0,
        firstChangeDone: false,
        editorIsLoaded: false
      },
      extensions: {
        conversionHelpers: new ConversionHelpers(),
        shortcutManager: new ShortcutManager(),
        undoManager: new UndoManager()
      },
      content: [
        {
          id: crypto.randomUUID(),
          type: 'publii-paragraph',
          content: '',
          config: {}
        }
      ]
    };
  },
  watch: {
    content: {
      handler (newState) {
        this.$bus.$emit('block-editor-content-updated');

        if (!this.internal.firstChangeDone && this.internal.editorIsLoaded) {
          this.internal.firstChangeDone = true;
          this.$bus.$emit('block-editor-content-updated');
        }

        if (this.content.length) {
          let lastIndex = this.content.length - 1;
          this.internal.firstBlockID = this.content[0].id;
          this.internal.lastBlockID = this.content[lastIndex].id;
        }
      },
      deep: true
    }
  },
  mounted () {
    this.$bus.$on('block-editor-move-block-up', this.moveBlockUp);
    this.$bus.$on('block-editor-move-block-down', this.moveBlockDown);
    this.$bus.$on('block-editor-save-block', this.saveBlock);
    this.$bus.$on('block-editor-delete-block', this.deleteBlock);
    this.$bus.$on('block-editor-duplicate-block', this.duplicateBlock);
    this.$bus.$on('block-editor-add-block', this.addNewBlock);
    this.$bus.$on('block-editor-merge-paragraphs', this.mergeParagraphs);
    this.$bus.$on('block-editor-shortcut-manager-add-shortcut', this.extensions.shortcutManager.add);
    this.$bus.$on('block-editor-ui-opened-for-block', this.uiOpenedForBlock);
    this.$bus.$on('block-editor-ui-closed-for-block', this.uiClosedForBlock);
    this.$bus.$on('block-editor-convert-block', this.convertBlock);
    this.$bus.$on('publii-block-editor-save', this.saveAllBlocks);
    this.$bus.$on('publii-block-editor-load', this.loadAllBlocks);
    this.$bus.$on('publii-block-editor-update-current-block-id', this.updateCurrentBlockID);
    this.$bus.$on('undomanager-save-history', this.saveChangesHistory);
    this.$bus.$on('block-editor-ui-selector-opened', this.setUISelectorID);
    this.$bus.$on('block-editor-set-selected-block', this.setSelectedBlock);
    this.$bus.$on('block-editor-items-reorder', this.reorderBlocks);

    setTimeout(() => {
      this.internal.editorIsLoaded = true;
    }, 1500);
  },
  methods: {
    moveBlockUp (blockID, startBlockTop) {
      let blockIndex = this.content.findIndex(el => el.id === blockID);

      if (blockIndex > 0) {
        let tempBlock = JSON.parse(JSON.stringify(this.content[blockIndex]));
        Vue.set(this.content, blockIndex, this.content[blockIndex - 1]);
        Vue.set(this.content, blockIndex - 1, tempBlock);
      }

      this.scrollWindow(blockID, startBlockTop);
    },
    moveBlockDown (blockID, startBlockTop) {
      let blockIndex = this.content.findIndex(el => el.id === blockID);

      if (blockIndex < this.content.length - 1) {
        let tempBlock = JSON.parse(JSON.stringify(this.content[blockIndex]));
        Vue.set(this.content, blockIndex, this.content[blockIndex + 1]);
        Vue.set(this.content, blockIndex + 1, tempBlock);
      }

      this.scrollWindow(blockID, startBlockTop);
    },
    scrollWindow (blockID, startBlockTop) {
      if (+new Date() < this.internal.lastScroll + 100) {
        return;
      }

      this.internal.lastScroll = +new Date();

      this.$nextTick(() => {
        let endBlockTop = this.$refs['block-wrapper-' + blockID][0].$refs['block-wrapper'].getBoundingClientRect().top;
        window.scrollBy(0, endBlockTop - startBlockTop);
      });
    },
    saveBlock (blockData) {
      let blockIndex = this.content.findIndex(el => el.id === blockData.id);

      if (blockIndex > -1) {
        this.content[blockIndex].content = blockData.content;
        this.content[blockIndex].config = blockData.config;
      }
    },
    deleteBlock (blockID, addFocusToPreviousBlock = true) {
      let blockIndex = this.content.findIndex(el => el.id === blockID);
      this.content.splice(blockIndex, 1);
      this.state.selectedBlockID = false;

      if (blockIndex > 0 && addFocusToPreviousBlock) {
        this.$refs['block-' + this.content[blockIndex - 1].id][0].focus();
      }

      if (!this.content.length) {
        this.addNewBlock('publii-paragraph', false);
      }

      this.$refs['editor-main'].setAttribute('data-ui-opened-block', '');
    },
    duplicateBlock (blockID) {
      let blockIndex = this.content.findIndex(el => el.id === blockID);
      let blockCopy = JSON.parse(JSON.stringify(this.content[blockIndex]));
      blockCopy.id = crypto.randomUUID() ;
      this.content.splice(blockIndex, 0, blockCopy);
    },
    addNewBlock (blockType, afterBlockID = false, content = '') {
      let blockIndex = this.content.findIndex(el => el.id === afterBlockID);
      let blockConfig = {};
      this.$bus.$emit('block-editor-deselect-blocks');

      if (!afterBlockID) {
        blockIndex = -1;
      }

      if (blockType.indexOf('publii-header-') === 0) {
        let headerSize = parseInt(blockType.replace('publii-header-', ''), 10);
        blockConfig.headingLevel = headerSize;
        blockType = 'publii-header';
      }

      let newBlockID = crypto.randomUUID();
      let newBlockObject = {
        id: newBlockID,
        type: blockType,
        content: content,
        config: blockConfig
      };
      this.content.splice(blockIndex + 1, 0, newBlockObject);

      setTimeout(() => {
        if (blockType === 'publii-readmore' || blockType === 'publii-separator') {
          let newlyAddedBlockIndex = this.content.findIndex(el => el.id === newBlockID);

          if (newlyAddedBlockIndex === this.content.length - 1) {
            this.addNewParagraphAtEnd();
          } else {
            let nextIndex = newlyAddedBlockIndex + 1;
            let nextBlockID = this.content[nextIndex].id;
            this.$refs['block-' + nextBlockID][0].focus('end');
            this.$bus.$emit('block-editor-block-selected', nextBlockID);
          }
        } else {
          if (content === '') {
            this.$refs['block-' + newBlockID][0].focus('end');
          } else {
            this.$refs['block-' + newBlockID][0].focus('start');
          }
        }
      }, 50);
    },
    addNewParagraphAtEnd () {
      let lastContentBlockIndex = this.content.length - 1;
      let lastContentBlock = this.content[lastContentBlockIndex];

      if (!lastContentBlock) {
        this.addNewBlock('publii-paragraph', false);
        return;
      }

      if (lastContentBlock.type === 'publii-paragraph' && lastContentBlock.content === '') {
        let blockID = lastContentBlock.id;
        this.$refs['block-' + blockID][0].focus();
        return;
      }

      this.addNewBlock('publii-paragraph', lastContentBlock.id);
    },
    mergeParagraphs (blockIDToMerge) {
      let blockIndex = this.content.findIndex(el => el.id === blockIDToMerge);

      if (blockIndex === 0) {
        return;
      }

      let previousBlockType = this.content[blockIndex - 1].type;
      let previousBlockID = this.content[blockIndex - 1].id;

      if (previousBlockType === 'publii-paragraph') {
        this.content[blockIndex - 1].content = this.content[blockIndex - 1].content + '<span class="temp-paragraph-merge-caret"></span>' + this.content[blockIndex].content;
        this.content.splice(blockIndex, 1);

        setTimeout(() => {
          this.$refs['block-' + previousBlockID][0].content = this.content[blockIndex - 1].content;
          this.$refs['block-' + previousBlockID][0].refresh();

          setTimeout(() => {
            let range = document.createRange();
            let caret = this.$refs['block-' + previousBlockID][0].$refs['block'].querySelector('.temp-paragraph-merge-caret');
            this.$refs['block-' + previousBlockID][0].focus('none');
            let sel = document.getSelection();

            setTimeout(() => {
              range.selectNodeContents(caret);
              range.deleteContents();
              sel.removeAllRanges();
              sel.addRange(range);
              sel.baseNode.parentNode.removeChild(sel.baseNode);
            }, 0);
          }, 0);
        }, 0);
      } else {
        this.$refs['block-' + previousBlockID][0].focus('end');
      }
    },
    uiClosedForBlock (blockID) {
      this.$refs['editor-main'].setAttribute('data-ui-opened-block', '');
    },
    uiOpenedForBlock (blockID) {
      this.$refs['editor-main'].setAttribute('data-ui-opened-block', blockID);
    },
    loadAllBlocks () {
      let inputField = document.querySelector('#post-editor');

      if (inputField.value !== '') {
        let loadedContent = JSON.parse(inputField.value);

        if (loadedContent[0] && loadedContent[0].id && typeof loadedContent[0].id !== 'string') {
            loadedContent = loadedContent.map(block => {
                block.id = crypto.randomUUID();
                return block;
            });
        }

        Vue.set(this, 'content', loadedContent);
      }
    },
    saveAllBlocks () {
      let inputField = document.querySelector('#post-editor');

      for (let block of this.content) {
        this.$refs['block-' + block.id][0].save();
      }

      inputField.value = JSON.stringify(this.content);
    },
    setPostID (postID) {
      this.config.postID = postID;
    },
    convertBlock (id, blockType, data) {
      let blockToConvertIndex = this.content.findIndex(block => block.id === id);

      Vue.set(this.content, blockToConvertIndex, {
        id: id,
        type: blockType,
        content: data.content,
        config: JSON.parse(JSON.stringify(data.config))
      });
    },
    updateCurrentBlockID (blockID) {
      if (this.internal.currentBlockID !== blockID) {
        let id = this.internal.currentBlockID;

        if (this.$refs['block-' + id] && this.$refs['block-' + id][0]) {
          this.$refs['block-' + id][0].save();
        }

        this.internal.currentBlockID = blockID;
      }
    },
    undo () {
      let blockID = this.internal.currentBlockID;

      if (!blockID) {
        return;
      }

      let content = this.extensions.undoManager.undoHistory(blockID);

      if (content) {
        this.$refs['block-' + blockID][0].setContent(content);
      }
    },
    saveChangesHistory (blockID, content) {
      this.extensions.undoManager.saveHistory(blockID, content);
    },
    setUISelectorID (id) {
      this.uiSelectorID = id;
    },
    setSelectedBlock (id) {
      if (this.state.selectedBlockID !== false && this.state.selectedBlockID !== id) {
        this.$bus.$emit('block-editor-deselect-block', this.state.selectedBlockID);
      }

      setTimeout(() => {
        this.state.selectedBlockID = id;
      }, 0);
    },
    reorderBlocks (newOrdering) {
      let newContentOrder = [];

      for (let id of newOrdering) {
        let block = this.content.find(block => block.id === id);

        if (block) {
          newContentOrder.push(block);
        }
      }

      Vue.set(this, 'content', newContentOrder);
    }
  },
  beforeDestroy () {
    this.$bus.$off('block-editor-move-block-up', this.moveBlockUp);
    this.$bus.$off('block-editor-move-block-down', this.moveBlockDown);
    this.$bus.$off('block-editor-save-block', this.saveBlock);
    this.$bus.$off('block-editor-delete-block', this.deleteBlock);
    this.$bus.$off('block-editor-duplicate-block', this.duplicateBlock);
    this.$bus.$off('block-editor-add-block', this.addNewBlock);
    this.$bus.$off('block-editor-merge-paragraphs', this.mergeParagraphs);
    this.$bus.$off('block-editor-shortcut-manager-add-shortcut', this.extensions.shortcutManager.add);
    this.$bus.$off('block-editor-ui-opened-for-block', this.uiOpenedForBlock);
    this.$bus.$off('block-editor-ui-closed-for-block', this.uiClosedForBlock);
    this.$bus.$off('block-editor-convert-block', this.convertBlock);
    this.$bus.$off('publii-block-editor-save', this.saveAllBlocks);
    this.$bus.$off('publii-block-editor-load', this.loadAllBlocks);
    this.$bus.$off('publii-block-editor-update-current-block-id', this.updateCurrentBlockID);
    this.$bus.$off('undomanager-save-history', this.saveChangesHistory);
    this.$bus.$off('block-editor-set-selected-block', this.setSelectedBlock);
    this.$bus.$off('block-editor-items-reorder', this.reorderBlocks);
  }
}
</script>

<style lang="scss">
@import '../../../scss/variables.scss';
@import '../assets/typography.scss';
@import '../assets/prism-theme.scss';

.editor {
  min-height: 100%;
  padding: 0 0 50px 0;
  position: relative;
  width: 100%;

  &-inner {
    margin: 0 auto;

    &-trigger {
      height: 100%;
      left: 50%;
      min-height: 100px;
      position: relative;
      top: 0;
      transform: translateX(-50%);
      width: var(--editor-width);
      z-index: 0;
    }
  }

  // UI animations
  .block-editor-ui-fade-enter-active {
    transition: opacity .2s ease;
    transition-delay: .3s;
  }
  .block-editor-ui-fade-leave-active {
    transition: opacity .2s ease;
  }
  .block-editor-ui-fade-enter,
  .block-editor-ui-fade-leave-to {
    opacity: 0;
  }
}
</style>
