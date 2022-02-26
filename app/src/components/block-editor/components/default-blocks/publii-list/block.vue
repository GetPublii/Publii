<template>
  <div :class="{ 'is-empty': isEmpty }">
    <component
      :is="config.listType"
      contenteditable="true"
      @keyup="getFocusFromTab($event); handleCaret($event); handleKeyUp($event); debouncedSave()"
      @focus="updateCurrentBlockID"
      @paste="pastePlainText"
      @keydown="handleKeyboard"
      @mouseup="handleMouseUp"
      v-initial-html="content"
      ref="block"
      class="publii-block-list" />

    <inline-menu ref="inline-menu" />

    <top-menu
      ref="top-menu"
      :conversions="conversions"
      :config="topMenuConfig"
      :advancedConfig="configForm" />
  </div>
</template>

<script>
import AvailableConversions from './conversions.js';
import Block from './../../Block.vue';
import ConfigForm from './config-form.json';
import InlineMenu from './../../mixins/InlineMenu.vue';
import InlineMenuUI from './../../helpers/InlineMenuUI.vue';
import TopMenuUI from './../../helpers/TopMenuUI.vue';

export default {
  name: 'List',
  mixins: [
    Block,
    InlineMenu
  ],
  components: {
    'inline-menu': InlineMenuUI,
    'top-menu': TopMenuUI
  },
  computed: {
    isEmpty () {
      return this.content === '<li></li>';
    }
  },
  data () {
    return {
      config: {
        listType: 'ul',
        advanced: {
          cssClasses: this.getAdvancedConfigDefaultValue('cssClasses'),
          id: this.getAdvancedConfigDefaultValue('id')
        }
      },
      content: '<li></li>',
      conversions: AvailableConversions,
      topMenuConfig: [
        {
          activeState: function () { return this.config.listType === 'ul'; },
          onClick: function () { this.setListType('ul'); },
          icon: 'unordered-list',
          tooltip: this.$t('editor.useUnorderedList')
        },
        {
          activeState: function () { return this.config.listType === 'ol'; },
          onClick: function () { this.setListType('ol'); },
          icon: 'ordered-list',
          tooltip: this.$t('editor.useOrderedList')
        },
        {
          activeState: () => false,
          onClick: function () { this.clearListHtml(); },
          icon: 'eraser',
          tooltip: this.$t('editor.clearFormatting')
        }
      ]
    };
  },
  beforeCreate () {
    this.configForm = ConfigForm;
  },
  beforeMount () {
    this.content = this.inputContent;

    if (!this.inputContent) {
      this.content = '<li></li>';
    }
  },
  methods: {
    handleKeyUp (e) {
      this.textIsHighlighted = false;

      if (e.code === 'Backspace') {
        e.preventDefault();
        let range = document.getSelection().getRangeAt(0);
        range.deleteContents();
      }
    },
    handleKeyboard (e) {
      if (
        e.code === 'Backspace' &&
        (
          this.$refs['block'].innerHTML === '<li></li>' ||
          this.$refs['block'].innerHTML === '<li><br></li>'
        )
      ) {
        this.$bus.$emit('block-editor-delete-block', this.id);
        e.returnValue = false;
      }

      if (
        e.code === 'Enter' && !e.isComposing &&
        (
          (
            this.$refs['block'].innerHTML.substr(-13) === '<li><br></li>' ||
            this.$refs['block'].innerHTML.substr(-9) === '<li></li>'
          ) && this.$refs['block'].querySelectorAll('li').length > 1
        )
      ) {
        this.$bus.$emit('block-editor-add-block', 'publii-paragraph', this.id);
        this.$refs['block'].innerHTML = this.$refs['block'].innerHTML.substr(0, this.$refs['block'].innerHTML.length - 13);
        e.returnValue = false;
      }
    },
    setListType (type) {
      this.save();
      this.config.listType = type;
    },
    save () {
      this.content = this.$refs['block'].innerHTML;

      this.$bus.$emit('block-editor-save-block', {
        id: this.id,
        config: JSON.parse(JSON.stringify(this.config)),
        content: this.content
      });
    },
    clearListHtml () {
      let html = this.$refs['block'].innerHTML;
      let tempNode = document.createElement('div');
      tempNode.innerHTML = html;
      let allElements = tempNode.querySelectorAll('*');

      for (let i = 0; i < allElements.length; i++) {
        if (['UL', 'OL', 'LI'].indexOf(allElements[i].tagName) > -1) {
          continue;
        }

        let parent = allElements[i].parentNode;

        while (allElements[i].firstChild) {
          parent.insertBefore(allElements[i].firstChild, allElements[i]);
        }

        parent.removeChild(allElements[i]);
      }

      this.$refs['block'].innerHTML = tempNode.innerHTML;
      tempNode.remove();
    },
    saveChangesHistory () {
      this.$bus.$emit('undomanager-save-history', this.id, this.$refs['block'].innerHTML);
    }
  }
}
</script>

<style lang="scss">
.publii-block-list {
  outline: none;
  width: 100%;

  li {
    width: 100%;
  }
}
</style>
