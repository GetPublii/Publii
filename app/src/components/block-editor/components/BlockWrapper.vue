<template>
  <div
    :data-block-type="blockType"
    ref="block-wrapper"
    :data-id="id"
    :class="{
      'wrapper': true,
      'is-selected': isSelected,
      'is-activated': isActivated,
      'has-ui-opened': uiOpened,
      'has-ui-block-selector-opened': newBlockUIListVisible,
      [customCssClasses.join(' ')]: true,
      'is-hovered': isHovered && !uiOpened && canDisplayUI
    }"
    @mousemove="moveOverBlock"
    @mouseleave="leaveBlock"
    @click.stop="blockClick">
    <div
      :class="{ 
        'block-selector': true, 
        'is-visible': (isHovered || newBlockUIListVisible) && !uiOpened && canDisplayUI
      }">
      <button
        class="block-selector-add"
        @click.stop="toggleNewBlockUI()"
        tabindex="-1">
        <icon name="add"/>
      </button>

      <div
        v-if="newBlockUIListVisible"
        @click.stop
        :class="{ 'block-selector-list': true, 'is-visible': true }">
        <text-input 
            v-model="blockFilterPhrase" 
            :placeholder="$t('editor.searchForABlock')" 
            ref="block-search-input"
            icon="magnifier-small"/>
        <div class="block-selector-list-wrapper">
            <button
                v-for="(blockItem, index) of filteredBlocks"
                :key="'filtered-blocks-' + index"
                :class="{ 
                    'block-selector-list-item': true, 
                    'is-active': newBlockUIActiveIndex === index 
                }"
                @click.stop="addNewBlock(blockItem.blockName);">
                <span class="block-selector-list-item-icon">
                    <icon :name="blockItem.icon" />
                </span>
                <span class="block-selector-list-item-label">
                    {{ $t(blockItem.label) }}
                </span>
            </button>
            <span 
                v-if="!filteredBlocks.length"
                class="block-selector-list-empty-state">
                {{ $t('editor.nothingFound') }}
            </span>
        </div>
      </div>
    </div>

    <slot />

    <div class="wrapper-ui">
      <div 
        :class="{ 'wrapper-ui-show-options': true }"
        @click.stop="togglePopup">
        <button
          :class="{ 'wrapper-ui-show-options-button': true, 'is-visible': isHovered && !uiOpened && canDisplayUI }">
          <icon name="menu-dots" />
        </button>

        <div
          v-if="uiOpened"
          :class="{ 'wrapper-ui-options': true, 'is-visible': true }">
          <button
            class="wrapper-ui-options-button-move"
            tabindex="-1"
            :disabled="$parent.internal.firstBlockID === id"
            @click.stop="moveUp">
            <icon name="up" />
          </button>
          <button
            class="wrapper-ui-options-button-move"
            tabindex="-1"
            :disabled="$parent.internal.lastBlockID === id"
            @click.stop="moveDown">
            <icon name="down" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import AvailableBlocks from '../available-blocks.json';
import Icon from '../components/elements/EditorIcon.vue';

export default {
  name: 'BlockWrapper',
  props: [
    'id',
    'blockType',
    'editor'
  ],
  components: {
    'icon': Icon
  },
  computed: {
    availableBlocks () {
        return AvailableBlocks;
    },
    canDisplayUI () {
        return !this.editor.uiSelectorID || this.editor.uiSelectorID === this.id;
    },
    filteredBlocks () {
      let blocks = JSON.parse(JSON.stringify(this.availableBlocks));

      blocks = blocks.map(block => {
        block.labelText = this.$t(block.label).toLocaleLowerCase();
        return block;
      });

      if (this.editor.hasReadMore) {
        blocks = blocks.filter(block => block.blockName !== 'publii-readmore');
      }

      if (this.blockType === 'publii-paragraph' && this.blockContentIsEmpty) {
        blocks = blocks.filter(block => block.blockName !== 'publii-paragraph');
      }

      if (this.blockFilterPhrase.length) {
        let phrase = this.blockFilterPhrase.toLocaleLowerCase();
        blocks = blocks.filter(block => block.blockName.replace('publii-', '').indexOf(phrase) > -1 || block.labelText.indexOf(phrase) > -1);
      }

      return blocks;
    }
  },
  data () {
    return {
      customCssClasses: [],
      isHovered: false,
      isSelected: false,
      isActivated: false,
      uiOpened: false,
      moveTimeout: false,
      // new block UI
      blockFilterPhrase: '',
      newBlockUIActiveIndex: 0,
      newBlockUIListVisible: false,
      blockContentIsEmpty: false
    };
  },
  watch: {
    uiOpened (newState, oldState) {
      if (newState) {
        this.$bus.$emit('block-editor-ui-opened-for-block', this.id);
      } else {
        this.$bus.$emit('block-editor-ui-closed-for-block', this.id);
      }
    },
    newBlockUIListVisible (newState) {
        if (newState === true) {
            this.$bus.$emit('block-editor-deselect-other-blocks', this.id);

            setTimeout(() => {
                this.blockFilterPhrase = '';
                this.$bus.$emit('block-editor-ui-selector-opened', this.id);
            }, 100);
        } else if (newState === false) {
            this.$bus.$emit('block-editor-ui-selector-opened', false);
        }
    }
  },
  mounted () {
    this.$bus.$on('block-editor-deselect-blocks', this.deselectBlock);
    this.$bus.$on('block-editor-deselect-block', this.deselectSingleBlock);
    this.$bus.$on('block-editor-deselect-other-blocks', this.deselectOtherBlocks);
    this.$bus.$on('block-editor-close-new-block-ui', this.hideNewBlockUI);
    this.$bus.$on('block-editor-list-activate-item', this.activateItem);
    this.$bus.$on('block-editor-list-deactivate-item', this.deactivateItem);
  },
  methods: {
    blockClick (e) {
      this.$bus.$emit('block-editor-deselect-blocks', this.id);
      this.setSelectionState(true);

      if (e && e.detail === 2 && e.layerX <= 30 && this.$slots.default[0] && !this.$slots.default[0].componentInstance.isEmpty) {
        this.togglePopup();
      }
    },
    deselectBlock (blockID) {
        this.newBlockUIListVisible = false;

        if (blockID !== this.id) {
            this.setSelectionState(false);
        }
    },
    deselectSingleBlock (blockID) {
        this.newBlockUIListVisible = false;

        if (blockID === this.id) {
            this.setSelectionState(false);
        }
    },
    deselectOtherBlocks (blockID) {
        if (blockID !== this.id) {
            this.newBlockUIListVisible = false;
            this.setSelectionState(false);
        }
    },
    moveOverBlock () {
      clearTimeout(this.moveTimeout);
      this.isHovered = true;

      this.moveTimeout = setTimeout(() => {
        this.isHovered = false;
      }, 2000);
    },
    leaveBlock () {
      this.isHovered = false;
    },
    openPopup () {
      this.uiOpened = true;
      this.$bus.$emit('block-editor-clear-text-selection', this.id);
      this.$bus.$emit('block-editor-set-selected-block', this.id);
    },
    closePopup () {
      this.uiOpened = false;
      this.$bus.$emit('block-editor-set-selected-block', false);
    },
    togglePopup () {
      this.uiOpened = !this.uiOpened;

      if (this.uiOpened) {
        this.$bus.$emit('block-editor-clear-text-selection', this.id);
        this.$bus.$emit('block-editor-set-selected-block', this.id);

        if (this.blockType === 'publii-paragraph') {
          this.$bus.$emit('block-editor-close-new-block-ui', this.id);
        }
      } else {
        this.$bus.$emit('block-editor-set-selected-block', false);
      }
    },
    setSelectionState (newState) {
      if (this.isSelected && newState === false) {
        this.$bus.$emit('block-editor-trigger-block-save', this.id);
      }

      this.isSelected = newState;

      if (!this.isSelected) {
        this.uiOpened = false;
      }

      if (newState) {
        this.$bus.$emit('block-editor-block-selected', this.id);
      }
    },
    addCustomCssClass (cssClass) {
      if (this.customCssClasses.indexOf(cssClass) === -1) {
        this.customCssClasses.push(cssClass);
      }
    },
    removeCustomCssClass (cssClass) {
      if (this.customCssClasses.indexOf(cssClass) > -1) {
        this.customCssClasses = this.customCssClasses.filter(item => item !== cssClass);
      }
    },
    moveUp () {
      let startBlockTop = this.$refs['block-wrapper'].getBoundingClientRect().top;
      this.$bus.$emit('block-editor-move-block-up', this.id, startBlockTop);

      setTimeout(() => {
        this.$refs['block-wrapper'].scrollIntoView({
            behavior: 'smooth',
            block: 'center',
            inline: 'center'
        });
      }, 0);
    },
    moveDown () {
      let startBlockTop = this.$refs['block-wrapper'].getBoundingClientRect().top;
      this.$bus.$emit('block-editor-move-block-down', this.id, startBlockTop);

      setTimeout(() => {
        this.$refs['block-wrapper'].scrollIntoView({
            behavior: 'smooth',
            block: 'center',
            inline: 'center'
        });
      }, 0);
    },
    saveChangesHistory () {
        this.$slots.default[0].componentInstance.saveChangesHistory();
    },
    /**
     * New block UI methods
     */
    toggleNewBlockUI () {
      this.blockContentIsEmpty = this.checkIfBlockContentIsEmpty();
      this.newBlockUIListVisible = !this.newBlockUIListVisible;

      setTimeout(() => {
        if (this.$refs['block-search-input']) {
            this.$refs['block-search-input'].$el.querySelector('input').focus();
        }
      }, 100);
    },
    addNewBlock (blockType) {
      this.$bus.$emit('block-editor-add-block', blockType, this.id);

      if (this.blockContentIsEmpty) {
        this.$bus.$emit('block-editor-delete-block', this.id, false);
      }

      this.newBlockUIListVisible = false;
      this.$bus.$emit('block-editor-ui-selector-opened', false);
    },
    checkIfBlockContentIsEmpty () {
	    if (['publii-paragraph', 'publii-header', 'publii-code', 'publii-list'].indexOf(this.blockType) === -1) {
	      return false;
	    }

      let isEmpty = false;

      this.$slots.default.forEach(vNode => { 
        if (vNode.componentInstance.$refs['block'].innerHTML === '') {
          isEmpty = true;
        }
      });

      return isEmpty;
    },
    hideNewBlockUI () {
      this.newBlockUIListVisible = false;
    },
    activateItem (id) {
      if (id === this.id) {
        this.isActivated = true;

        setTimeout(() => {
            this.isActivated = false;
        }, 1200);
      }
    },
    deactivateItem () {
      this.isActivated = false;
    }
  },
  beforeDestroy () {
    this.$bus.$off('block-editor-deselect-blocks', this.deselectBlock);
    this.$bus.$off('block-editor-deselect-block', this.deselectSingleBlock);
    this.$bus.$off('block-editor-deselect-other-blocks', this.deselectOtherBlocks);
    this.$bus.$off('block-editor-close-new-block-ui', this.hideNewBlockUI);
    this.$bus.$off('block-editor-list-activate-item', this.activateItem);
    this.$bus.$off('block-editor-list-deactivate-item', this.deactivateItem);
  }
}
</script>

<style lang="scss">
@import "../vendors/modularscale";
@import "../../../scss/variables.scss";
@import "../../../scss/mixins.scss";

.wrapper {
  border: 1px solid transparent;
  box-sizing: content-box;
  margin: 0 auto;
  opacity: 0.33;
  padding: 0 68px;
  position: relative;
  transition: width .25s ease-out, opacity .35s ease-out, background .25s ease-out;
  width: var(--editor-width);
  z-index: 1;

  &.has-ui-block-selector-opened {
    z-index: 2;
  }

  &[data-block-type="publii-embed"] {
    margin: 0 auto;
  }

  &.is-hovered {
    .wrapper-ui {
      opacity: 1;
      pointer-events: auto;
    }
  }

  &.is-selected {
    z-index: 10;
  }

  &.is-activated {
    background: rgba(var(--color-primary-rgb), .12);
    border-radius: calc(var(--border-radius) / 2);
    z-index: 10;
  }

  & > div {
    padding: baseline(4, em) 0;
  }

  &.has-ui-opened {
    background: var(--popup-bg);
    border-radius: var(--border-radius);
    box-shadow: 0 0 32px var(--shadow);
    margin-top: -44px;
    opacity: 1;
    padding: 0 32px;
    user-select: none;
    z-index: 10;

    & > div {
      display: flex;
      flex-direction: column-reverse;
      left: -38px;
      opacity: 1;
      top: 44px;

      .publii-block-code-lang {
        top: calc(#{baseline(6, em)} + 44px) !important;
      }
      .publii-block-code > .prism-editor__line-numbers,
      .publii-block-html > .prism-editor__line-numbers {
        background: var(--pre-bg-hover) !important;
      }
      .publii-block-code > pre,
      .publii-block-html > pre {
        background: var(--pre-bg-hover) !important;
      }
      .publii-block-gallery-uploader-loader-overlay {
        height: 250px;
        top: 61px;
        width: calc(100% - 64px) !important;
      }
    }

    .publii-block-paragraph-block-selector {
      display: none;
    }
  }

  &.has-block-selector-visible {
    z-index: 10;
  }

  &.contains-wide-image {
    width: calc(var(--editor-width) + 168px) !important;
  }

  &.contains-full-image {
    width: calc(100% - 168px) !important;

    .publii-block-image-form input {
      margin-left: auto;
      margin-right: auto;
      max-width: calc(var(--editor-width) + 84px);
    }
  }

  &-ui {
    left: 32px;
    opacity: 0;
    position: absolute;
    pointer-events: none;
    top: -2px;
    z-index: 1;

    .wrapper-ui-show-options {
      transition: all 0.25s ease-out;
     
      &-button {
        background: none;
        border: none;
        cursor: pointer; 
        font-size: 19px;
        height: 32px;
        opacity: 0;
        padding: 4px;
        transition: transform 0.25s ease-out; 
        width: 32px;

         // hover effect
        &::before {
          content: "";
          background: var(--gray-6);
          border-radius: 3px;
          display: block;
          left: 50%;
          opacity: 0;
          position: absolute;
          height: 32px;
          top: 50%;
          transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
          transform: scale(0.5) translate(-50%, -50%);
          transform-origin: left top;
          width: 32px;
          z-index: -1;
        }

        &:hover {
          &::before {
            opacity: 1;
            transform: scale(1) translate(-50%, -50%);
          }
        }

        &:focus {
          outline: none;
        }

        & > svg {
          color: var(--icon-tertiary-color);
        }

        &.is-visible {
          opacity: 1;
        }
      }
    }

    &-options {
      left: 0;
      position: absolute;
      top: 0;

      &.is-visible {
        opacity: 1;
        pointer-events: auto;
      }

      &-row {
        display: flex;
      }

      &-button-move {
        align-items: center;
        background: transparent;
        border: none;
        cursor: pointer;
        display: flex;
        height: 32px;
        justify-content: center;
        margin: 0;
        outline: none;
        padding: 0;
        position: absolute;
        top: 0;
        width: 32px;
        z-index: 0;

        svg {
          color: var(--icon-primary-color);
          transition: var(--transition);
        }

        // hover effect
        &::before {
          content: "";
          background: var(--gray-6);
          border-radius: 3px;
          display: block;
          left: 50%;
          opacity: 0;
          position: absolute;
          height: 32px;
          top: 50%;
          transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
          transform: scale(0.5) translate(-50%, -50%);
          transform-origin: left top;
          width: 32px;
          z-index: -1;
        }

        &:hover,
        &.is-active {
          svg {
            color: var(--icon-tertiary-color);
          }

          &::before {
            opacity: 1;
            transform: scale(1) translate(-50%, -50%);
          }
        }
        &:disabled {
          cursor: default;
          opacity: 0.4;

          &::before {
            background: none;
          }
        }
      }

      &-button-move + .wrapper-ui-options-button-move {
        top: 32px;
      }
    }

    &-top-menu {
      align-items: center;
      border: none;
      display: flex;
      height: 44px;
      justify-content: flex-end;
      margin: -9px 0 9px 0;

      &-title {
        color: var(--gray-3);
        display: block;
        font-size: 11px;
        font-weight: 700;
        margin: 0 auto 0 0;
        text-transform: uppercase;
      }

      &-button {
        align-items: center;
        background: transparent;
        border: none;
        cursor: pointer;
        display: flex;
        height: 100%;
        min-height: 34px;
        justify-content: center;
        margin: 0;
        outline: none;
        padding: 0;
        position: relative;
        width: 38px;

        svg {
          color: var(--icon-tertiary-color);
        }

        // hover effect
        &::before {
          content: "";
          background: var(--gray-6);
          border-radius: 3px;
          display: block;
          left: 50%;
          opacity: 0;
          position: absolute;
          height: 34px;
          top: 50%;
          transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
          transform: scale(0.5) translate(-50%, -50%);
          transform-origin: left top;
          width: 34px;
          z-index: -1;
        }

        &:hover,
        &.is-active {
          &::before {
            opacity: 1;
            transform: scale(1) translate(-50%, -50%);
          }
        }
      }
    }
}
}

.editor[data-ui-opened-block=""] {
  .wrapper {
    opacity: 1;
  }
}

.block-selector {
  display: none !important;
  left: 0;
  position: absolute;
  top: 0;
  z-index: 10;

  &.is-visible {
    display: block !important;
  }

  &-list {
    background: var(--popup-bg);
    box-shadow: var(--box-shadow-medium);
    border-radius: var(--border-radius);
    font-family: var(--font-base);
    font-size: 14px;
    padding: 8px 8px 0;
    position: absolute;
    top: 60px;
    width: 212px;
    z-index: 100;
    
    input {
        font-size: 14px;
        padding: 10px 38px 10px 12px !important;
    }
    .input-wrapper svg {
        height: 16px !important;
        left: auto;
        right: 12px;
        width: 16px !important;
    }

    &-empty-state {
      display: block;
      padding: 4px 12px 4px;
    }

    &-wrapper {
        margin: 4px 0;
        max-height: 214px;
        overflow: auto; 
    }

    &-item {
        align-items: center;
        background: none;
        border: none;
        border-radius: var(--border-radius);
        color: var(--text-primary-color);
        cursor: pointer;
        display: flex;   
        font-weight: var(--font-weight-semibold);
        margin: 5px 2px;
        padding: 0;
        text-align: left;
        transition: var(--transition);
        width: 98%;

      &-icon {
          align-items: center;
          background-color: var(--gray-1);
          border-radius: var(--border-radius);
          display: inline-flex;
          color: var(--icon-primary-color);
          height: 36px;
          justify-content: center;
          margin-right: 12px;
          transition: var(--transition);
          width: 36px;
      }

      &:hover {
          background-color: var(--gray-1);
          color: var(--headings-color);

        .block-selector-list-item-icon {
            background: var(--button-secondary-bg);
            color: var(--icon-tertiary-color);
        }
      }

      &:focus-visible {
          box-shadow: inset 0 0 2px 1px var(--input-border-focus);

        .block-selector-list-item-icon {
            background: none;
        }
      }
    }
  }

  &-add {
      align-items: center;
      background: transparent;
      border: none;
      cursor: pointer;
      display: flex;
      height: 32px;
      justify-content: center;
      outline: none;
      width: 32px;

       // hover effect
       &::before {
          content: "";
          background: var(--gray-6);
          border-radius: 3px;
          display: block;
          left: 50%;
          opacity: 0;
          position: absolute;
          height: 32px;
          top: 50%;
          transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
          transform: scale(0.5) translate(-50%, -50%);
          transform-origin: left top;
          width: 32px;
          z-index: -1;
        }

      & > svg {
        color: var(--icon-tertiary-color);
        transition: all .25s ease-out;
      }

      &:hover {
        &::before {
            opacity: 1;
            transform: scale(1) translate(-50%, -50%);
          }
       }
    }
}
</style>
