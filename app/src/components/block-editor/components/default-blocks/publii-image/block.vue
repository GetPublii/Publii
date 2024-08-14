<template>
  <div 
    :class="{ 'publii-block-image-wrapper': true, 'is-empty': isEmpty }"
    @click="resetDeleteConfirmation">
    <figure
      v-if="view === 'preview' || content.image !== ''"
      ref="block"
      :class="{ 'publii-block-image': true, 'is-wide': config.imageAlign === 'wide', 'is-full': config.imageAlign === 'full' }">
      <img
        v-if="!!content.image"
        :src="content.image"
        :height="content.imageHeight"
        :width="content.imageWidth" />

      <button
        v-if="!!content.image && !confirmDelete"
        class="publii-block-image-delete"
        @click.stop.prevent="clearImage()">
        <icon name="trash" />
      </button>

      <button
        v-if="!!content.image && confirmDelete"
        class="publii-block-image-delete is-active has-tooltip"
        @click.stop.prevent="clearImage()">
        <icon name="open-trash" />
        <span class="ui-tooltip has-bigger-space">
          {{ $t('editor.clickToConfirm') }}
        </span>
      </button>

      <figcaption v-if="content.caption !== '' && view === 'preview'">
        {{ content.caption }}
      </figcaption>
    </figure>

    <div
      v-if="(content.image === '') || $parent.uiOpened"
      :class="{ 'publii-block-image-form': true, 'is-visible': true }"
      ref="block">
      <div
        v-if="content.image === ''"
        :class="{ 'publii-block-image-uploader': true, 'is-hovered': isHovered }"
        @drag.stop.prevent
        @dragstart.stop.prevent
        @dragend.stop.prevent
        @dragover.stop.prevent="dragOver"
        @dragenter.stop.prevent
        @dragleave.stop.prevent="dragLeave"
        @drop.stop.prevent="drop">
        <div class="publii-block-image-uploader-inner">
          <icon
            v-if="!imageUploadInProgress"
            name="blank-image"
            height="62"
            width="75" />
          <span v-if="!imageUploadInProgress">
            {{ $t('editor.dropToUploadYourPhotoOr') }}
          </span>
          <button
            v-if="!imageUploadInProgress"
            @click="filePickerCallback">
            {{ $t('file.selectFile') }}
          </button>
          <span
            v-if="imageUploadInProgress"
            class="publii-block-image-uploader-loader"></span>
        </div>
      </div>

      <input
        v-if="$parent.uiOpened"
        type="text"
        @focus="updateCurrentBlockID"
        @keydown="handleCaptionKeyboard"
        @keyup="handleCaretCaption"
        @click.stop
        v-model="content.caption"
        :placeholder="$t('image.enterCaption')"
        ref="contentCaption" />
      <input
        v-if="$parent.uiOpened"
        type="text"
        @focus="updateCurrentBlockID"
        @keydown="handleAltKeyboard"
        @keyup="handleCaretAlt"
        @click.stop
        v-model="content.alt"
        :placeholder="$t('image.enterAltText')"
        ref="contentAlt" />
    </div>

    <top-menu
      ref="top-menu"
      :config="topMenuConfig"
      :advancedConfig="configForm" />
  </div>
</template>

<script>
import Block from './../../Block.vue';
import ConfigForm from './config-form.json';
import ContentEditableImprovements from './../../helpers/ContentEditableImprovements.vue';
import EditorIcon from './../../elements/EditorIcon.vue';
import HasPreview from './../../mixins/HasPreview.vue';
import LinkConfig from './../../mixins/LinkConfig.vue';
import TopMenuUI from './../../helpers/TopMenuUI.vue';
import Utils from './../../utils/Utils.js';

export default {
  name: 'PImage',
  mixins: [
    Block,
    ContentEditableImprovements,
    HasPreview,
    LinkConfig
  ],
  components: {
    'icon': EditorIcon,
    'top-menu': TopMenuUI
  },
  data () {
    return {
      caretIsAtStartCaption: false,
      caretIsAtEndCaption: false,
      caretIsAtStartAlt: false,
      caretIsAtEndAlt: false,
      confirmDelete: false,
      isHovered: false,
      imageUploadInProgress: false,
      config: {
        imageAlign: 'center',
        link: {
          url: '',
          noFollow: false,
          targetBlank: false,
          sponsored: false,
          ugc: false
        },
        advanced: {
          cssClasses: this.getAdvancedConfigDefaultValue('cssClasses'),
          id: this.getAdvancedConfigDefaultValue('id')
        }
      },
      content: {
        image: '',
        imageHeight: '',
        imageWidth: '',
        alt: '',
        caption: ''
      },
      topMenuConfig: [
        {
          activeState: function () { return this.config.imageAlign === 'center'; },
          onClick: function () { this.alignImage('center'); },
          icon: 'center',
          tooltip: this.$t('image.centeredImage')
        },
        {
          activeState: function () { return this.config.imageAlign === 'wide'; },
          onClick: function () { this.alignImage('wide'); },
          icon: 'wide',
          tooltip: this.$t('image.wideImage')
        },
        {
          activeState: function () { return this.config.imageAlign === 'full'; },
          onClick: function () { this.alignImage('full'); },
          icon: 'full',
          tooltip: this.$t('image.fullWidthImage')
        },
        {
          activeState: () => this.config.link.url !== '',
          onClick: this.showLinkPopupWithoutHighlight,
          icon: 'link',
          tooltip: this.$t('link.addLink')
        },
        {
          activeState: () => false,
          onClick: this.removeLink,
          isVisible: () => this.config.link.url !== '',
          icon: 'unlink',
          tooltip: this.$t('link.removeLink')
        }
      ]
    };
  },
  computed: {
    isInsidePublii () {
      return !!window.process;
    }
  },
  beforeCreate () {
    this.configForm = ConfigForm;
  },
  mounted () {
    this.content = Utils.deepMerge(this.content, this.inputContent);
    this.view = (this.content.image === '') ? 'code' : 'preview';
    this.initFakeFilePicker();
    this.setParentCssClasses(this.config.imageAlign);
    this.$bus.$on('block-editor-save-link-popup', this.setLink);
  },
  methods: {
    dragOver (e) {
      this.isHovered = true;
    },
    dragLeave (e) {
      this.isHovered = false;
    },
    drop (e) {
      let files = e.dataTransfer.files;
      let siteName = window.app.getSiteName();
      this.imageUploadInProgress = true;

      if (!files[0] || !files[0].path) {
        this.imageUploadInProgress = false;
      } else {
        mainProcessAPI.send('app-image-upload', {
          id: this.editor.config.postID,
          site: siteName,
          path: files[0].path,
          imageType: 'contentImages'
        });

        mainProcessAPI.receiveOnce('app-image-uploaded', (data) => {
          if (data.baseImage && data.baseImage.size && data.baseImage.size.length >= 2) {
            this.content.imageWidth = data.baseImage.size[0];
            this.content.imageHeight = data.baseImage.size[1];
            this.content.image = data.baseImage.url;
          } else {
            this.content.image = data.url;
          }

          this.imageUploadInProgress = false;
          this.$parent.openPopup();
        });
      }

      this.isHovered = false;
    },
    initFakeFilePicker () {
      let imageUploader = document.getElementById('post-editor-fake-image-uploader');

      imageUploader.addEventListener('change', () => {
        if (!imageUploader.value) {
          return;
        }

        setTimeout(() => {
          if (!this.fileSelectionCallback) {
            return;
          }

          let filePath = false;

          if (imageUploader.files) {
            filePath = imageUploader.files[0].path;
          }

          if (!filePath) {
            return;
          }

          this.imageUploadInProgress = true;
          // eslint-disable-next-line
          mainProcessAPI.send('app-image-upload', {
            id: this.editor.config.postID,
            site: window.app.getSiteName(),
            path: filePath,
            imageType: 'contentImages'
          });

          // eslint-disable-next-line
          mainProcessAPI.receiveOnce('app-image-uploaded', (data) => {
            this.content.imageWidth = data.baseImage.size[0];
            this.content.imageHeight = data.baseImage.size[1];
            this.content.image = data.baseImage.url;
            this.fileSelectionCallback = false;
            this.imageUploadInProgress = false;
            this.$parent.openPopup();
          });

          imageUploader.value = '';
        }, 50);
      });
    },
    filePickerCallback () {
      this.fileSelectionCallback = true;
      document.getElementById('post-editor-fake-image-uploader').click();
    },
    clearImage () {
      if (!this.confirmDelete) {
        this.confirmDelete = true;
      } else {
        this.content.image = '';
        this.isHovered = false;
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
        !this.content.image &&
        newView === 'preview'
      ) {
        this.view = 'code';
      } else {
        setTimeout(() => {
          this.view = newView;
        }, 0);
      }
    },
    alignImage (newValue) {
      this.config.imageAlign = newValue;
      this.setParentCssClasses(newValue);
    },
    setParentCssClasses (imageMode) {
      if (imageMode === 'full') {
        this.$parent.addCustomCssClass('contains-full-image');
      } else {
        this.$parent.removeCustomCssClass('contains-full-image');
      }

      if (imageMode === 'wide') {
        this.$parent.addCustomCssClass('contains-wide-image');
      } else {
        this.$parent.removeCustomCssClass('contains-wide-image');
      }
    },
    focus () {
      this.setView('code');
    },
    handleCaptionKeyboard (e) {
      if (e.code === 'Enter' && !e.isComposing && e.shiftKey === false) {
        this.$refs['contentAlt'].focus();
        e.returnValue = false;
      }

      if (e.code === 'Backspace' && this.$refs['contentCaption'].value === '' && this.$refs['contentAlt'].value === '') {
        this.$bus.$emit('block-editor-delete-block', this.id);
        e.returnValue = false;
      }
    },
    handleAltKeyboard (e) {
      if (e.code === 'Enter' && !e.isComposing && e.shiftKey === false) {
        this.$bus.$emit('block-editor-add-block', 'publii-paragraph', this.id);
        e.returnValue = false;
      }

      if (e.code === 'Backspace' && this.$refs['contentCaption'].value === '') {
        this.$refs['contentCaption'].focus();
        e.returnValue = false;
      }
    },
    handleCaretCaption (e) {
      if (e.code === 'ArrowUp' && this.getCursorPosition('contentCaption') === 0) {
        if (!this.caretIsAtStartCaption) {
          this.caretIsAtStartCaption = true;
          return;
        }

        let previousBlockID = this.findPreviousBlockID();

        if (previousBlockID) {
          this.editor.$refs['block-wrapper-' + previousBlockID][0].blockClick();
          this.editor.$refs['block-' + previousBlockID][0].focus();
        }
      }

      if (e.code === 'ArrowDown' && this.getCursorPosition('contentCaption') >= this.$refs['contentCaption'].value.length - 2) {
        if (!this.caretIsAtEndCaption) {
          this.caretIsAtEndCaption = true;
          return;
        }

        this.$refs['contentAlt'].focus();
        e.returnValue = false;
      }

      if (e.code === 'ArrowDown' || e.code === 'ArrowUp') {
        this.caretIsAtStartCaption = false;
        this.caretIsAtEndCaption = false;
      }
    },
    handleCaretAlt (e) {
      if (e.code === 'ArrowUp' && this.getCursorPosition('contentAlt') === 0) {
        if (!this.caretIsAtStartAlt) {
          this.caretIsAtStartAlt = true;
          return;
        }

        this.$refs['contentCaption'].focus();
        e.returnValue = false;
      }

      if (e.code === 'ArrowDown' && this.getCursorPosition('contentAlt') >= this.$refs['contentAlt'].value.length - 2) {
        if (!this.caretIsAtEndAlt) {
          this.caretIsAtEndAlt = true;
          return;
        }

        let nextBlockID = this.findNextBlockID();

        if (nextBlockID) {
          this.editor.$refs['block-wrapper-' + nextBlockID][0].blockClick();
          this.editor.$refs['block-' + nextBlockID][0].focus('none');
        }
      }

      if (e.code === 'ArrowDown' || e.code === 'ArrowUp') {
        this.caretIsAtStartAlt = false;
        this.caretIsAtEndAlt = false;
      }
    },
    save () {
      if (this.$refs['contentAlt']) {
        this.content.alt = this.$refs['contentAlt'].value;
      }

      if (this.$refs['contentCaption']) {
        this.content.caption = this.$refs['contentCaption'].value;
      }

      this.$bus.$emit('block-editor-save-block', {
        id: this.id,
        config: JSON.parse(JSON.stringify(this.config)),
        content: JSON.parse(JSON.stringify(this.content))
      });
    },
    resetDeleteConfirmation () {
      this.confirmDelete = false;
    }
  },
  beforeDestroy () {
    this.$bus.$off('block-editor-save-link-popup', this.setLink);
  }
}
</script>

<style lang="scss">
@import '../../../../../scss/vendor/modularscale';
@import '../../../../../scss/variables.scss';
@import '../../../../../scss/mixins.scss';

.publii-block-image {
  outline: none;
  position: relative;

  &:hover {
    .publii-block-image-delete {
      opacity: 1;
      pointer-events: auto;
    }
  }

  & > img {
    display: block;
    height: auto;
    margin: 0 auto;
    max-width: 100%;
    transition: all .25s ease-out;
  }

  & > figcaption {
    display: block;
    padding: baseline(3,em) 0 0;
  }

  &-empty-state {
    color: var(--gray-3);
    font-family: var(--font-base);
    font-size: 14px;
    text-align: center;
  }

  &-delete {
    align-items: center;
    background: var(--warning);
    border: none;
    border-radius: var(--border-radius);
    cursor: pointer;
    display: flex;
    height: 34px;
    justify-content: center;
    left: 15px;
    opacity: 0;
    pointer-events: none;
    position: absolute;
    top: 15px;
    transition: var(--transition);
    will-change: transform;
    width: 34px;
    z-index: 2;

    svg {
       color: var(--white);
    }

    &:active,
    &:focus,
    &:hover {
       transform: scale(1.1);
    }
  }

  & + &-form {
    padding: baseline(5,em) 0;
  }

  &-form {
    display: none;

    &.is-visible {
      display: block;
      order: -1;
    }

    input,
    textarea {  
      display: block;
      width: 100%;
    }


    input + input {
      margin-top: 16px;
    }
  }

  &-uploader {       
    border: 2px dashed var(--input-border-color);
    border-radius: var(--border-radius);
    height: 250px;
    margin: 0 0 16px 0;
    padding: 6px;
    position: relative;
    width: 100%;

    &.is-hovered {
      border-color: var(--color-primary);
    }

    &-loader {
      animation: loader 1s linear infinite;
      border: 3px solid var(--color-primary);
      border-left-color: transparent;
      border-radius: 50%;
      display: block;
      height: 32px;
      left: 50%;
      position: absolute;
      top: 50%;
      transform: translateX(-50%) translateY(-50%);
      width: 32px!important;
    }

    &-inner {
      align-items: center;
      display: flex;
      flex-wrap: wrap;
      font-family: var(--font-base);
      justify-content: center;
      height: 234px;
      padding: 2rem;
      width: 100%;

      svg {
        fill: var(--icon-quaternary-color);
      }

      span {
        display: block;
        font-size: $app-font-base;
        text-align: center;
        width: 100%;
      }

      button {
        background: var(--button-secondary-bg);
        border: 1px solid var(--button-secondary-bg);
        border-radius: var(--border-radius);
        color: var(--button-secondary-color);
        cursor: pointer;
        font-weight: var(--font-weight-semibold);
        font-size: 15px;
        padding: .5rem 2rem;
        text-align: center;
        outline: none;

        &:active,
        &:focus,
        &:hover {
          background: var(--button-secondary-bg-hover);
          border-color: var(--button-secondary-bg-hover);
          color: var(--button-secondary-color-hover);
        }
      }
    }
  }
}

@keyframes loader {
  from {
    transform: translateX(-50%) translateY(-50%) rotate(0deg);
  }

  to {
    transform: translateX(-50%) translateY(-50%) rotate(360deg);
  }
}
</style>
