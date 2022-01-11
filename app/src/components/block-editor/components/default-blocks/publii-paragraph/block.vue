<template>
  <div :class="{ 'is-empty': isEmpty }">
    <p
      :class="{ 'publii-block-paragraph': true, [config.advanced.style]: true }"
      :style="'text-align: ' + config.textAlign + ';'"
      ref="block"
      slot="block"
      @focus="handleEditFocus(); updateCurrentBlockID();"
      @blur="handleEditBlur"
      @keyup="getFocusFromTab($event); handleKeyUp($event); handleCaret($event); debouncedSave()"
      @paste="pastePlainText"
      @keydown="handleKeyboard"
      @mouseup="handleMouseUp"
      contenteditable="true"
      v-initial-html="content"
      :data-translation="$t('editor.startWritingOrPressTabToChooseBlock')">
    </p>

    <div
      :class="{ 'publii-block-paragraph-block-selector': true, 'is-visible': showNewBlockUI }"
      :key="'new-block-menu-' + id">
      <button
        class="publii-block-paragraph-block-selector-list-add-button"
        @click.stop="toggleNewBlockUI()"
        tabindex="-1">
        <icon name="add" />
      </button>

      <div
        v-if="newBlockUIListVisible"
        :class="{ 'publii-block-paragraph-block-selector-list': true, 'is-visible': true }">
        <button
          :class="{ 'publii-block-paragraph-block-selector-list-button': true, 'is-active': newBlockUIActiveIndex === 0 }"
          @click.stop="addNewBlock('publii-header');"
          @mouseenter="newBlockUIActiveIndex = 0"
          @mouseleave="newBlockUIActiveIndex = -1">
          <icon name="headings" />
          <div class="publii-block-paragraph-block-selector-tooltip is-small">
            <span class="publii-block-paragraph-block-selector-tooltip-label1">
              {{ $t('editor.header') }}
            </span>
          </div>
        </button>
        <button
          :class="{ 'publii-block-paragraph-block-selector-list-button': true, 'is-active': newBlockUIActiveIndex === 1 }"
          @click.stop="addNewBlock('publii-image');"
          @mouseenter="newBlockUIActiveIndex = 1"
          @mouseleave="newBlockUIActiveIndex = -1">
          <icon name="image" />
          <div class="publii-block-paragraph-block-selector-tooltip is-small">
            <span class="publii-block-paragraph-block-selector-tooltip-label1">
              {{ $t('image.image') }}
            </span>
          </div>
        </button>
        <button
          :class="{ 'publii-block-paragraph-block-selector-list-button': true, 'is-active': newBlockUIActiveIndex === 2 }"
          @click.stop="addNewBlock('publii-gallery');"
          @mouseenter="newBlockUIActiveIndex = 2"
          @mouseleave="newBlockUIActiveIndex = -1">
          <icon name="gallery" />
          <div class="publii-block-paragraph-block-selector-tooltip is-small">
            <span class="publii-block-paragraph-block-selector-tooltip-label1">
              {{ $t('editor.gallery') }}
            </span>
          </div>
        </button>
        <button
          :class="{ 'publii-block-paragraph-block-selector-list-button': true, 'is-active': newBlockUIActiveIndex === 3 }"
          @click.stop="addNewBlock('publii-list');"
          @mouseenter="newBlockUIActiveIndex = 3"
          @mouseleave="newBlockUIActiveIndex = -1">
          <icon name="unordered-list" />
          <div class="publii-block-paragraph-block-selector-tooltip is-small">
            <span class="publii-block-paragraph-block-selector-tooltip-label1">
              {{ $t('editor.list') }}
            </span>
          </div>
        </button>
        <button
          :class="{ 'publii-block-paragraph-block-selector-list-button': true, 'is-active': newBlockUIActiveIndex === 4 }"
          @click.stop="addNewBlock('publii-quote');"
          @mouseenter="newBlockUIActiveIndex = 4"
          @mouseleave="newBlockUIActiveIndex = -1">
          <icon name="quote" />
          <div class="publii-block-paragraph-block-selector-tooltip is-small">
            <span class="publii-block-paragraph-block-selector-tooltip-label1">
              {{ $t('editor.quote') }}
            </span>
          </div>
        </button>
        <button
          :class="{ 'publii-block-paragraph-block-selector-list-button': true, 'is-active': newBlockUIActiveIndex === 5 }"
          @click.stop="addNewBlock('publii-code');"
          @mouseenter="newBlockUIActiveIndex = 5"
          @mouseleave="newBlockUIActiveIndex = -1">
          <icon name="code" />
          <div class="publii-block-paragraph-block-selector-tooltip is-small">
            <span class="publii-block-paragraph-block-selector-tooltip-label1">
              {{ $t('editor.code') }}
            </span>
          </div>
        </button>
        <button
          :class="{ 'publii-block-paragraph-block-selector-list-button': true, 'is-active': newBlockUIActiveIndex === 6 }"
          @click.stop="addNewBlock('publii-html');"
          @mouseenter="newBlockUIActiveIndex = 6"
          @mouseleave="newBlockUIActiveIndex = -1">
          <icon name="html" />
          <div class="publii-block-paragraph-block-selector-tooltip is-small">
            <span class="publii-block-paragraph-block-selector-tooltip-label1">
              {{ $t('editor.html') }}
            </span>
          </div>
        </button>
        <button
          :class="{ 'publii-block-paragraph-block-selector-list-button': true, 'is-active': newBlockUIActiveIndex === 7 }"
          @click.stop="addNewBlock('publii-separator');"
          @mouseenter="newBlockUIActiveIndex = 7"
          @mouseleave="newBlockUIActiveIndex = -1">
          <icon name="separator" />
          <div class="publii-block-paragraph-block-selector-tooltip is-small">
            <span class="publii-block-paragraph-block-selector-tooltip-label1">
              {{ $t('editor.separator') }}
            </span>
          </div>
        </button>
        <button
          v-if="!editor.hasReadMore"
          :class="{ 'publii-block-paragraph-block-selector-list-button': true, 'is-active': newBlockUIActiveIndex === 8 }"
          @click.stop="addNewBlock('publii-readmore');"
          @mouseenter="newBlockUIActiveIndex = 8"
          @mouseleave="newBlockUIActiveIndex = -1">
          <icon name="readmore" />
          <div class="publii-block-paragraph-block-selector-tooltip is-small">
            <span class="publii-block-paragraph-block-selector-tooltip-label1">
              {{ $t('editor.readMoreBlockName') }}
            </span>
          </div>
        </button>
        <button
          :class="{ 'publii-block-paragraph-block-selector-list-button': true, 'is-active': newBlockUIActiveIndex === (!editor.hasReadMore ? 9 : 8) }"
          @click.stop="addNewBlock('publii-toc');"
          @mouseenter="newBlockUIActiveIndex = (!editor.hasReadMore ? 9 : 8)"
          @mouseleave="newBlockUIActiveIndex = -1">
          <icon name="toc" />
          <div class="publii-block-paragraph-block-selector-tooltip is-small">
            <span class="publii-block-paragraph-block-selector-tooltip-label1">
              {{ $t('editor.toc') }}
            </span>
          </div>
        </button>
      </div>
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
      showNewBlockUI: false,
      newBlockUIActiveIndex: 0,
      newBlockUIListVisible: false,
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
  watch: {
    showNewBlockUI (newValue) {
      if (newValue) {
        this.$parent.addCustomCssClass('has-block-selector-visible');
      } else {
        this.$parent.removeCustomCssClass('has-block-selector-visible');
      }
    }
  },
  beforeCreate () {
    this.configForm = ConfigForm;
  },
  beforeMount () {
    this.content = this.inputContent;
  },
  mounted () {
    this.$bus.$on('block-editor-deselect-blocks', this.deselectBlock);
    this.$bus.$on('block-editor-close-new-block-ui', this.hideNewBlockUI);
  },
  methods: {
    refresh () {
      this.$refs['block'].innerHTML = this.content;
    },
    handleEditFocus () {
      if (this.$refs['block'].innerHTML === '') {
        this.showNewBlockUI = true;
      }
    },
    handleEditBlur (e) {
      if (e.relatedTarget && e.relatedTarget.classList.contains('wrapper-ui-inline-menu-button')) {
        return;
      }

      this.save();
    },
    handleKeyboard (e) {
      if (e.code === 'Enter' && !e.isComposing && e.shiftKey === false && this.showNewBlockUI === false) {
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

      if (e.code === 'Tab' && this.$refs['block'].innerHTML === '' && this.newBlockUIListVisible === false) {
        this.toggleNewBlockUI();
        this.newBlockUIActiveIndex = 0;
        e.returnValue = false;
        return;
      }

      if (e.code === 'Tab' && this.$refs['block'].innerHTML === '' && this.newBlockUIListVisible === true) {
        this.newBlockUIActiveIndex++;

        if (this.newBlockUIActiveIndex > this.$refs['block'].parentNode.querySelectorAll('.publii-block-paragraph-block-selector-list-button').length - 1) {
          this.newBlockUIActiveIndex = 0;
        }

        e.returnValue = false;
        return;
      }

      if (
        e.code === 'Enter' &&
        !e.isComposing &&
        e.shiftKey === false &&
        this.newBlockUIListVisible === false &&
        this.showNewBlockUI === true
      ) {
        this.$bus.$emit('block-editor-add-block', 'publii-paragraph', this.id);
        e.returnValue = false;
        return;
      }

      if (
        e.code === 'Enter' &&
        !e.isComposing &&
        e.shiftKey === false &&
        this.newBlockUIListVisible === true &&
        this.showNewBlockUI === true
      ) {
        this.$refs['block'].parentNode.querySelectorAll('.publii-block-paragraph-block-selector-list-button')[this.newBlockUIActiveIndex].click();
        e.returnValue = false;
        return;
      }

      if (this.blockUIVisible) {
        this.blockUIVisible = false;
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

      if (!this.showNewBlockUI && this.$refs['block'].innerHTML === '') {
        this.showNewBlockUI = true;
      } else if (this.showNewBlockUI && this.$refs['block'].innerHTML !== '') {
        this.showNewBlockUI = false;
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
    /**
     * New block UI methods
     */
    deselectBlock (blockID) {
      if (blockID !== this.id) {
        this.showNewBlockUI = false;
        this.newBlockUIListVisible = false;
      }
    },
    toggleNewBlockUI () {
      this.$refs['block'].focus();
      this.showNewBlockUI = true;
      this.newBlockUIListVisible = !this.newBlockUIListVisible;
    },
    toggleNewBlockUIIcon () {
      setTimeout(() => {
        this.showNewBlockUI = true;
      }, 0);
    },
    addNewBlock (blockType) {
      this.$bus.$emit('block-editor-add-block', blockType, this.id);
      this.$bus.$emit('block-editor-delete-block', this.id, false);
      this.toggleNewBlockUI();
    },
    hideNewBlockUI (blockID) {
      this.showNewBlockUI = false;
      this.newBlockUIListVisible = false;
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
  },
  beforeDestroy () {
    this.$bus.$off('block-editor-deselect-blocks', this.deselectBlock);
    this.$bus.$off('block-editor-close-new-block-ui', this.hideNewBlockUI);
  }
}
</script>

<style lang="scss">
@import '../../../assets/variables.scss';

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
      color: var(--eb-gray-4);
    }
  }

  &-block-selector {
    display: none;
    left: -26px;
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    z-index: 10;

    &-tooltip {
      background: var(--eb-input-bg-light);
      border-radius: var(--eb-border-radius);
      box-shadow: 0 2px 6px rgba(0, 0, 0, .16);
      color: var(--eb-text-primary-color);
      display: none;
      flex-wrap: wrap;
      justify-content: center;
      height: 40px;
      left: 50%;
      padding: 5px 0;
      position: absolute;
      top: 30px;
      transform: translateX(-50%);
      width: 64px;
      z-index: 10;

      &.is-small {
        display: none;
        height: auto;
        padding: 5px 10px;
        width: auto;

        .publii-block-paragraph-block-selector-tooltip-label1 {
          height: auto;
        }
      }

      &:after {
        border: 6px solid var(--eb-gray-1);
        border-left-color: transparent;
        border-right-color: transparent;
        border-top-color: transparent;
        content: "";
        filter: drop-shadow(0 -1px 1px rgba(0, 0, 0, .08));
        height: 12px;
        left: 50%;
        position: absolute;
        top: -12px;
        transform: translateX(-50%);
        width: 12px;
      }

      &-label1,
      &-label2 {
        align-items: center;
        display: flex;
        font-size: 13px;
        height: 13px;
        justify-content: center;
        line-height: 1;
        width: 100%;
      }

      &-label2 {
        opacity: .3;

        svg {
          margin-right: 3px;
        }
      }
    }

    &.is-visible {
      display: block;
    }

    &-list {
      display: none;
      left: 48px;
      padding: 16px 0;
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      width: 500px;

      &-add-button {
        align-items: center;
        animation: fadeInAddButton .25s ease-out forwards;
        background: transparent;
        border: none;
        border-radius: 50%;
        cursor: pointer;
        display: flex;
        height: 34px;
        justify-content: center;
        outline: none;
        width: 34px;

        @keyframes fadeInAddButton {
          0% {
            opacity: 0;
            transform: scale(.5) ;
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }

        & > svg {
          fill: var(--eb-primary-color);
          vertical-align:text-bottom;
          transition: all .25s ease-out;
        }

        &:hover {
          border: 1px solid var(--eb-secondary-color);
        }
      }

      &-button {
        align-items: center;
        background: transparent;
        border: none;
        cursor: pointer;
        display: flex;
        outline: none;
        padding: 1px 10px 2px;
        position: relative;

        svg {
          fill: var(--eb-icon-tertiary-color);
          transition: all .125s ease-out;
        }

        &.is-active {
          svg {
            animation: fadeIn .75s 1 forwards;
            color: var(--eb-secondary-color);
          }

          @keyframes fadeIn {
            0% {
               opacity: 0;
               transform: scale(.5);
            }

            50% {
               opacity: 1;
               transform: scale(1.05);
            }

            70% {
               transform: scale(.9);
            }

            100% {
               transform: scale(1);
            }
          }

          .publii-block-paragraph-block-selector-tooltip {
            display: flex;

            &.is-small {
              display: block;
            }
          }
        }

        &:hover {
           svg {
             fill: var(--eb-primary-color);
           }
        }
      }

      &.is-visible {
        background: var(--eb-bg-primary);
        display: flex;
      }
    }
  }
}
</style>
