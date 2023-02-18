<template>
  <div :class="{ 'is-empty': isEmpty }">
    <div class="publii-block-quote-wrapper">
      <div
        :class="{ 'publii-block-quote-form': true, 'is-visible': view === 'code' }"
        ref="block">
        <div
          class="publii-block-quote-text"
          @focus="updateCurrentBlockID"
          @keyup="getFocusFromTab($event); handleCaretText($event); handleKeyUp($event); debouncedSave()"
          @keydown="handleTextKeyboard"
          @paste="pastePlainText"
          @mouseup="handleMouseUp"
          ref="contentText"
          contenteditable="true"
          v-initial-html="content.text"></div>
        <input
          type="text"
          @focus="updateCurrentBlockID"
          @keyup="handleCaretAuthor($event); debouncedSave()"
          @keydown="handleAuthorKeyboard"
          v-model="content.author"
          :placeholder="$t('editor.quoteAuthor')"
          ref="contentAuthor" />
      </div>
      <figure
        v-if="view === 'preview'"
        class="publii-block-quote"
        ref="block"
        :data-translation="$t('editor.quoteText')">
          <blockquote v-html="content.text" />
          <figcaption v-html="content.author" />
      </figure>
    </div>

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
import HasPreview from './../../mixins/HasPreview.vue';
import InlineMenu from './../../mixins/InlineMenu.vue';
import InlineMenuUI from './../../helpers/InlineMenuUI.vue';
import TopMenuUI from './../../helpers/TopMenuUI.vue';
import Utils from './../../utils/Utils.js';

export default {
  name: 'Quote',
  mixins: [
    Block,
    ContentEditableImprovements,
    HasPreview,
    InlineMenu
  ],
  components: {
    'inline-menu': InlineMenuUI,
    'top-menu': TopMenuUI
  },
  data () {
    return {
      focusable: ['contentText', 'contentAuthor'],
      caretIsAtStartText: false,
      caretIsAtEndText: false,
      caretIsAtStartAuthor: false,
      caretIsAtEndAuthor: false,
      config: {
        advanced: {
          cssClasses: this.getAdvancedConfigDefaultValue('cssClasses'),
          id: this.getAdvancedConfigDefaultValue('id')
        }
      },
      content: {
        text: '',
        author: ''
      },
      conversions: AvailableConversions,
      inlineMenuContainer: 'contentText',
      topMenuConfig: [
        {
          activeState: () => false,
          onClick: function () { this.clearContentHtml('contentText'); },
          icon: 'eraser',
          tooltip: this.$t('editor.clearFormatting')
        }
      ]
    };
  },
  watch: {
    'view': function (newValue, oldValue) {
      if (oldValue === 'code' && newValue === 'preview') {
        this.setCursorAtEndOfElement('contentText', true);
      }
    }
  },
  beforeCreate () {
    this.configForm = ConfigForm;
  },
  beforeMount () {
    this.content = Utils.deepMerge(this.content, this.inputContent);
  },
  mounted () {
    this.view = (!this.content.text && !this.content.author) ? 'code' : 'preview';
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
    handleTextKeyboard (e) {
      if (e.code === 'Backspace' && this.$refs['contentText'].value === '' && this.$refs['contentAuthor'].value === '') {
        this.$bus.$emit('block-editor-delete-block', this.id);
        e.returnValue = false;
      }
    },
    handleAuthorKeyboard (e) {
      if (e.code === 'Enter' && !e.isComposing && e.shiftKey === false) {
        this.$bus.$emit('block-editor-add-block', 'publii-paragraph', this.id);
        e.returnValue = false;
      }

      if (e.code === 'Backspace' && this.$refs['contentAuthor'].value === '') {
        this.$refs['contentText'].focus();
        e.returnValue = false;
      }
    },
    handleCaretText (e) {
      if (e.code === 'ArrowUp' && this.getCursorPosition('contentText') === 0) {
        if (!this.caretIsAtStartText) {
          this.caretIsAtStartText = true;
          return;
        }

        let previousBlockID = this.findPreviousBlockID();

        if (previousBlockID) {
          this.editor.$refs['block-wrapper-' + previousBlockID][0].blockClick();
          this.editor.$refs['block-' + previousBlockID][0].focus();
        }
      }

      if (e.code === 'ArrowDown' && this.getCursorPosition('contentText') >= this.$refs['contentText'].innerHTML.length - 2) {
        if (!this.caretIsAtEndText) {
          this.caretIsAtEndText = true;
          return;
        }

        this.$refs['contentAuthor'].focus();
        e.returnValue = false;
      }

      if (e.code === 'ArrowDown' || e.code === 'ArrowUp') {
        this.caretIsAtStartText = false;
        this.caretIsAtEndText = false;
      }
    },
    handleCaretAuthor (e) {
      if (e.code === 'ArrowUp' && this.getCursorPosition('contentAuthor') === 0) {
        if (!this.caretIsAtStartAuthor) {
          this.caretIsAtStartAuthor = true;
          return;
        }

        this.$refs['contentText'].focus();
        e.returnValue = false;
      }

      if (e.code === 'ArrowDown' && this.getCursorPosition('contentAuthor') >= this.$refs['contentAuthor'].value.length - 2) {
        if (!this.caretIsAtEndAuthor) {
          this.caretIsAtEndAuthor = true;
          return;
        }

        let nextBlockID = this.findNextBlockID();

        if (nextBlockID) {
          this.editor.$refs['block-wrapper-' + nextBlockID][0].blockClick();
          this.editor.$refs['block-' + nextBlockID][0].focus('none');
        }
      }

      if (e.code === 'ArrowDown' || e.code === 'ArrowUp') {
        this.caretIsAtStartAuthor = false;
        this.caretIsAtEndAuthor = false;
      }
    },
    setView (newView) {
      if (
        this.view === 'code' &&
        newView === 'preview'
      ) {
        this.save();
      }

      if (
        !this.content.text &&
        newView === 'preview'
      ) {
        this.view = 'code';
      } else {
        setTimeout(() => {
          this.view = newView;
        }, 0);
      }
    },
    save () {
      this.content.text = this.$refs['contentText'].innerHTML;
      this.content.author = this.$refs['contentAuthor'].value;

      this.$bus.$emit('block-editor-save-block', {
        id: this.id,
        config: JSON.parse(JSON.stringify(this.config)),
        content: JSON.parse(JSON.stringify(this.content))
      });
    },
    saveChangesHistory () {
      this.$bus.$emit('undomanager-save-history', this.id, this.$refs['block'].innerHTML);
    }
  }
}
</script>

<style lang="scss">
@import '../../../../../scss/variables.scss';
@import '../../../../../scss/mixins.scss';
@import '../../../../../scss/vendor/modularscale';


.publii-block-quote {
    outline: none;

  p {
    outline: none;
  }

  figcaption {
    font-size: ms(-2) !important;
    border-left: 2px solid var(--gray-3);
    padding: baseline(2,em) 0 0 baseline(5,em);
    text-align: left !important;
  }

  &-form {
    display: none;
    padding: 0;

    &.is-visible {
      display: block;
    }

    input {    
      display: block;   
      width: 100%;
    }
  }

  &-text {
    background: var(--input-bg);
    border: 1px solid var(--input-border-color);
    border-radius: 3px;
    font-size: inherit;
    line-height: inherit;
    margin-bottom: 16px;
    outline: none;
    padding: 20px;
    width: 100%;

    &:empty {
      &:before {
        content: attr(data-translation);
        color: var(--gray-4);
      }
    }
  }
}
</style>
