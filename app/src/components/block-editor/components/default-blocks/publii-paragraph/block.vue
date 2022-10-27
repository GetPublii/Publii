<template>
  <div :class="{ 'is-empty': isEmpty }">
    <p
      :class="{ 'publii-block-paragraph': true, [config.advanced.style]: true }"
      :style="'text-align: ' + config.textAlign + ';'"
      ref="block"
      slot="block"
      @focus="updateCurrentBlockID"
      @blur="handleEditBlur"
      @keyup="getFocusFromTab($event); handleKeyUp($event); handleCaret($event); debouncedSave()"
      @paste="pastePlainText"
      @keydown="handleKeyboard"
      @mouseup="handleMouseUp"
      contenteditable="true"
      v-initial-html="content"
      :data-translation="$t('editor.startWritingOrPressTabToChooseBlock')">
    </p>

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
import ContentEditableImprovements from './../../helpers/ContentEditableImprovements.vue';
import EditorIcon from './../../elements/EditorIcon.vue';
import InlineMenu from './../../mixins/InlineMenu.vue';
import InlineMenuUI from './../../helpers/InlineMenuUI.vue';
import TopMenuUI from './../../helpers/TopMenuUI.vue';

export default {
  name: 'Paragraph',
  mixins: [
    Block,
    ContentEditableImprovements,
    InlineMenu
  ],
  components: {
    'icon': EditorIcon,
    'inline-menu': InlineMenuUI,
    'top-menu': TopMenuUI
  },
  data () {
    return {
      config: {
        textAlign: 'left',
        advanced: {
          style: this.getAdvancedConfigDefaultValue('style'),
          cssClasses: this.getAdvancedConfigDefaultValue('cssClasses'),
          id: this.getAdvancedConfigDefaultValue('id')
        }
      },
      content: '',
      conversions: AvailableConversions,
      topMenuConfig: [
        {
          activeState: function () { return this.config.textAlign === 'left'; },
          onClick: function () { this.alignText('left'); },
          icon: 'align-left',
          tooltip: this.$t('editor.alignTextLeft')
        },
        {
          activeState: function () { return this.config.textAlign === 'center'; },
          onClick: function () { this.alignText('center'); },
          icon: 'align-center',
          tooltip: this.$t('editor.alignTextCenter')
        },
        {
          activeState: function () { return this.config.textAlign === 'right'; },
          onClick: function () { this.alignText('right'); },
          icon: 'align-right',
          tooltip: this.$t('editor.alignTextRight')
        },
        {
          activeState: () => false,
          onClick: function () { this.clearContentHtml('block'); },
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
  },
  methods: {
    refresh () {
      this.$refs['block'].innerHTML = this.content;
    },
    handleEditBlur (e) {
      if (e.relatedTarget && e.relatedTarget.classList.contains('wrapper-ui-inline-menu-button')) {
        return;
      }

      this.save();
    },
    handleKeyboard (e) {
      if (e.code === 'Enter' && !e.isComposing && e.shiftKey === false) {
        let newElementName = this.$parent.$parent.extensions.shortcutManager.checkContentForShortcuts(this.$refs['block'].innerText);

        if (newElementName === 'publii-readmore' && this.editor.hasReadMore) {
          if (window.app) {
            this.$bus.$emit('alert-display', {
              message: 'You can add only one read more per post.'
            });
          } else {
            alert('You can add only one read more per post.');
          }
          e.returnValue = false;
          return;
        }

        if (newElementName === 'publii-paragraph') {
          document.execCommand('insertHTML', false, '<line-separator />');

          if (this.$refs['block'].innerHTML.substr(-33) === '<line-separator></line-separator>') {
            this.$bus.$emit('block-editor-add-block', 'publii-paragraph', this.id);
            this.$refs['block'].innerHTML = this.$refs['block'].innerHTML.replace('<line-separator></line-separator>', '');
          } else {
            let separatedContent = this.$refs['block'].innerHTML.split('<line-separator></line-separator>');
            let firstPart = separatedContent[0];
            let secondPart = separatedContent[1];

            if (secondPart.substr(0, 4) === '<br>') {
              secondPart = secondPart.substr(4);
            }

            this.$refs['block'].innerHTML = firstPart;
            this.$bus.$emit('block-editor-add-block', 'publii-paragraph', this.id, secondPart);
          }

          this.save();
        } else {
          this.$bus.$emit('block-editor-add-block', newElementName, this.id);
          this.$bus.$emit('block-editor-delete-block', this.id);
        }

        e.returnValue = false;
      }

      if (e.code === 'Backspace' && this.$refs['block'].innerHTML === '') {
        this.$bus.$emit('block-editor-delete-block', this.id);
        e.returnValue = false;
        return;
      }

      if (e.code === 'Backspace' && this.$refs['block'].innerHTML !== '' && this.cursorIsAtTheBeginning()) {
        this.mergeParagraphs();
        e.returnValue = false;
        return;
      }

      if (e.code === 'Tab' && this.$refs['block'].innerHTML === '' && this.$parent.newBlockUIListVisible === false) {
        this.$parent.toggleNewBlockUI();
        e.returnValue = false;
        return;
      }
    },
    handleKeyUp (e) {
      this.textIsHighlighted = false;

      if (e.code === 'Backspace') {
        e.preventDefault();
        let range = document.getSelection().getRangeAt(0);
        range.deleteContents();
      }

      if (e.code === 'Space') {
        this.saveChangesHistory();
      }
    },
    alignText (position) {
      this.config.textAlign = position;
    },
    mergeParagraphs () {
      this.save();

      setTimeout(() => {
        this.$bus.$emit('block-editor-merge-paragraphs', this.id);
      }, 0);
    },
    save () {
      this.content = this.$refs['block'].innerHTML;

      this.$bus.$emit('block-editor-save-block', {
        id: this.id,
        config: JSON.parse(JSON.stringify(this.config)),
        content: this.content
      });
    },
    cursorIsAtTheBeginning () {
      let selectedObject = document.getSelection();
      return selectedObject.rangeCount === 1 && selectedObject.baseOffset === 0;
    },
    saveChangesHistory () {
      this.$bus.$emit('undomanager-save-history', this.id, this.$refs['block'].innerHTML);
    },
    setContent (newContent) {
      this.content = newContent;
      this.$refs['block'].innerHTML = newContent;

      setTimeout(() => {
        this.setCursorAtEndOfElement();
      }, 0);
    }
  }
}
</script>

<style lang="scss">
@import '../../../../../scss/variables.scss';

.publii-block-paragraph {
  outline: none;
  width: 100%;

  code,
  mark {
    display: inline;
  }

  &:empty {
    &:before {
      content: attr(data-translation);
      color: var(--gray-4);
    }
  }
}
</style>
