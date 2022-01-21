<template>
  <div
    :data-block-type="blockType"
    ref="block-wrapper"
    :class="{
      'wrapper': true,
      'is-selected': isSelected,
      'show-bulk-operations': $parent.bulkOperationsMode,
      'has-ui-opened': uiOpened,
      [customCssClasses.join(' ')]: true,
      'is-hovered': isHovered && !uiOpened
    }"
    @mousemove="moveOverBlock"
    @mouseleave="leaveBlock"
    @click.stop="blockClick">
    <slot />

    <div
      v-if="$parent.bulkOperationsMode"
      class="wrapper-ui-bulk">
      <button
        class="wrapper-ui-bulk-delete"
        tabindex="-1"
        @click.stop="deleteBlock">
        <icon name="trash" />
      </button>
      <button
        class="wrapper-ui-bulk-duplicate"
        tabindex="-1"
        :disabled="blockType === 'publii-readmore'"
        @click.stop="duplicateBlock">
        <icon name="duplicate" />
      </button>
      <button
        class="wrapper-ui-bulk-move"
        tabindex="-1"
        :disabled="$parent.internal.firstBlockID === id"
        @click.stop="moveUp">
        <icon name="up" />
      </button>
      <button
        class="wrapper-ui-bulk-move"
        tabindex="-1"
        :disabled="$parent.internal.lastBlockID === id"
        @click.stop="moveDown">
        <icon name="down" />
      </button>
    </div>

    <div class="wrapper-ui">
      <div
        :class="{ 'wrapper-ui-show-options': true }"
        @click.stop="togglePopup">
          <button
            :class="{ 'wrapper-ui-show-options-button': true, 'is-visible': isSelected && !uiOpened }">
            <icon name="dotted-line" />
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

    <button
      class="wrapper-ui-add-block-between"
      @click="addBlockAfter(id)">
      <icon name="add" />
    </button>
  </div>
</template>

<script>
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
  data () {
    return {
      customCssClasses: [],
      isHovered: false,
      isSelected: false,
      uiOpened: false,
      moveTimeout: false
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
    '$parent.bulkOperationsMode': function (newState) {
      if (newState) {
        this.uiOpened = false;
      }
    }
  },
  mounted () {
    this.$bus.$on('block-editor-deselect-blocks', this.deselectBlock);
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
      if (blockID !== this.id) {
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
    },
    closePopup () {
      this.uiOpened = false;
    },
    togglePopup () {
      this.uiOpened = !this.uiOpened;

      if (this.uiOpened) {
        this.$bus.$emit('block-editor-clear-text-selection', this.id);

        if (this.blockType === 'publii-paragraph') {
          this.$bus.$emit('block-editor-close-new-block-ui', this.id);
        }
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
    },
    moveDown () {
      let startBlockTop = this.$refs['block-wrapper'].getBoundingClientRect().top;
      this.$bus.$emit('block-editor-move-block-down', this.id, startBlockTop);
    },
    deleteBlock () {
      this.$bus.$emit('block-editor-delete-block', this.id);
    },
    duplicateBlock () {
      this.$bus.$emit('block-editor-duplicate-block', this.id);
    },
    addBlockAfter () {
      this.$bus.$emit('block-editor-add-block', 'publii-paragraph', this.id);
    },
    saveChangesHistory () {
        this.$slots.default[0].componentInstance.saveChangesHistory();
    }
  },
  beforeDestroy () {
    this.$bus.$off('block-editor-deselect-blocks', this.deselectBlock);
  }
}
</script>

<style lang="scss">
@import '../vendors/modularscale';
@import '../../../scss/variables.scss';
@import '../../../scss/mixins.scss';

.wrapper {
  border: 1px solid transparent;
  box-sizing: content-box;
  margin: 0 auto;
  opacity: .33;
  padding: 0 32px;
  position: relative;
  transition: width .25s ease-out, opacity .35s ease-out;
  width: var(--editor-width);
  z-index: 1;

  &[data-block-type="publii-embed"] {
    margin: 0 auto;
  }

  &[data-block-type="publii-header"] {
    & > div {
      line-height: 1.3 !important;
    }
  }

  &.is-selected {
    z-index: 10;

    .wrapper-ui {
      opacity: 1;
      pointer-events: auto;
    }
  }

  &.show-bulk-operations {
      background: var(--popup-bg);
      margin-top: baseline(8,em);
      transition: all .25s ease-out;

    div {
      pointer-events: none;
    }

    .wrapper-ui {
      display: none;
    }

    .wrapper-ui-bulk {
      pointer-events: auto;
    }
  }

  & > div {
    padding: baseline(4,em) 0;
  }

  &.has-ui-opened {
    background: var(--popup-bg);
    border-radius: 6px;
    box-shadow: 0 0 32px var(--shadow);
    margin-top: -44px;
    opacity: 1;
    user-select: none;
    z-index: 2;

    &::after {
      background: var(--color-primary);
      bottom: -1px;
      content: "";
      position: absolute;
      right: -1px;
      top: -1px;
      width: 3px;
      z-index: 10;
    }

    & > div {
      display: flex;
      flex-direction: column-reverse;

      .publii-block-code-lang {
          top: calc(#{baseline(6,em)} + 44px)!important;
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
      width: calc(var(--editor-width) + 168px)!important;
  }

  &.contains-full-image {
    width: calc(100% - 252px)!important;

    .publii-block-image-form input {
      margin-left: auto;
      margin-right: auto;
      max-width: calc(var(--editor-width) + 84px);
    }
  }

  &-ui {
    opacity: 0;
    position: absolute;
    pointer-events: none;
    right: -50px;
    top: -41px;
    z-index: 1;

    .wrapper-ui-show-options {
      height: 44px;
      transition: all .25s ease-out;
      width: 50px;

      &-button {
        background: none;
        border: none;
        cursor: pointer;
        opacity: 0;
        padding: 16px;
        position: absolute;
        right: 0px;
        top: 14px;
        transform: scale(.5);
        transform-origin: center center;
        transition: transform .25s ease-out;

        &:focus {
          outline: none;
        }

        &::after {
          content:"";
          border: 2px solid rgba(var(--color-primary-rgb), .4);
          border-radius: 50%;
          height: 50px;
          left: 50%;
          opacity: 0;
          position: absolute;
          top: 50%;
          transform: translate(-50%, -50%);
          width: 50px;

          @keyframes focusOut {
            0% {
                opacity: 0;
            }
            25% {
                 opacity: 1;
            }
          }
        }

        & > svg {
          fill: var(--color-primary);
          vertical-align: middle;
        }

        &.is-visible {
          opacity: 1;
          transform: scale(1.2);

          &:hover {
            transform: scale(1.4);
          }

          &::after {
            animation: focusOut .75s ease-out backwards;
          }
        }
      }
    }

    &-options {
      height: 44px;
      position: absolute;
      right: 64px;
      top: 47px;

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
        height: 100%;
        justify-content: center;
        margin: 0;
        outline: none;
        padding: 0;
        position: absolute;
        top: 0;
        width: 38px;
        z-index: 0;

        svg {
          fill: var(--icon-primary-color);
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
          height: 34px;
          top: 50%;
          transition: all .15s cubic-bezier(.4,0,.2,1);
          transform: scale(.5) translate(-50%, -50%);
          transform-origin: left top;
          width: 34px;
          z-index: -1;
        }

        &:hover,
        &.is-active {

          svg {
            fill: var(--icon-tertiary-color);
          }

          &::before {
            opacity: 1;
            transform: scale(1) translate(-50%, -50%);
          }
        }
        &:disabled {
            cursor: default;
            opacity: .4;

          &::before {
              background: none;
          }
        }
      }

      &-button-move {
        right: -60px;
        top: -2px;
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
          fill: var(--icon-tertiary-color);
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
          transition: all .15s cubic-bezier(.4,0,.2,1);
          transform: scale(.5) translate(-50%, -50%);
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

  &-ui-bulk {
    background: transparent;
    border-right: 3px solid var(--color-primary);
    border-radius: 6px 0 0 6px;
    box-shadow: 0 0 16px var(--shadow);
    height: 100%;
    left: 0;
    position: absolute;
    top: 0;
    width: calc(var(--editor-width) + 64px);

    &-move,
    &-delete,
    &-duplicate {
        background: transparent;
        border: none;
        cursor: pointer;
        margin: 0;
        outline: none;
        padding: 0;
        position: absolute;
        top: 50%;
        transform: translateY(-50%);
        width: 38px;

        svg {
          fill: var(--icon-primary-color);
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
          height: 34px;
          top: 50%;
          transition: all .15s cubic-bezier(.4,0,.2,1);
          transform: scale(.5) translate(-50%, -50%);
          transform-origin: left top;
          width: 34px;
          z-index: -1;
        }

        &:hover,
        &.is-active {

          svg {
            fill: var(--icon-tertiary-color);
          }

          &::before {
            opacity: 1;
            transform: scale(1) translate(-50%, -50%);
          }
        }
      }

    &-delete {
      &:hover {
        svg {
            fill: var(--white);
          }
          &::before {
           background: var(--warning);
          }        
      }
    }

    &-move {
      right: -90px;

      svg {
          vertical-align: middle;
      }

      & + .wrapper-ui-bulk-move {
        right: -60px;
      }

      &:disabled {
        cursor: default;
        opacity: .4;

        &::before {
           background: none;
        }
      }
    }

    &-delete {
      left: -90px;
    }

    &-duplicate {
      left: -60px;
    }
  }

  &-ui-add-block-between {
    background: none;
    border: none;
    bottom: -8px;
    cursor: pointer;
    display: none;
    height: 30px;
    left: 50%;
    outline: none;
    padding: 0!important;
    position: absolute;
    transform: translateX(-50%);
    width: 60px;

    & > svg {
        fill: var(--color-primary);
    }
  }

  &.is-hovered {
    .wrapper-ui-add-block-between {
      display: block;

      & > svg {
          animation: fadeInAddButton .12s ease-out forwards;
      }
    }
  }
}

.editor[data-ui-opened-block=""] {
  .wrapper {
    opacity: 1;
  }
}

.editor:not([data-ui-opened-block=""]),
.show-bulk-operations {
  .wrapper-ui-add-block-between {
    display: none!important;
  }
}

.is-empty:not(.publii-block-image-wrapper):not(.publii-block-gallery-wrapper) ~ .wrapper-ui-add-block-between {
  display: none!important;
}
</style>
