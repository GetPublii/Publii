<template>
  <div
    :class="{ 'publii-block-gallery-wrapper': true, 'is-empty': isEmpty }"
    @dragover.stop.prevent="dragOver"
    @dragleave.stop.prevent="dragLeave"
    @drop.stop.prevent="drop"
    @click="resetDeleteConfirmation">
    <draggable
      v-if="content.images.length > 0 && view === 'preview'"
      ref="block"
      v-model="content.images"
      handle="img"
      :data-cols="config.columns"
      :data-count="content.images.length"
      @start="draggingInProgress = true"
      @end="draggingInProgress = false"
      :class="{ 'publii-block-gallery': true, 'is-wide': config.imageAlign === 'wide', 'is-full': config.imageAlign === 'full' }">
      <div
        v-for="(image, index) of content.images"
        :key="'gallery-item-' + index"
        class="publii-block-gallery-item">
        <img
          :src="image.src"
          :height="image.height"
          :width="image.width" />

        <button
          v-if="confirmDelete !== index"
          class="publii-block-gallery-item-delete"
          @click.stop.prevent="removeImage(index)">
          <icon name="trash" />
        </button>

        <button
          v-if="confirmDelete === index"
          class="publii-block-gallery-item-delete is-active has-tooltip"
          @click.stop.prevent="removeImage(index)">
          <icon name="open-trash" />
          <span class="ui-tooltip has-bigger-space">
            {{ $t('editor.clickToConfirm') }}
          </span>
        </button>
      </div>
    </draggable>

    <draggable
      v-if="content.images.length > 0 && view === 'edit'"
      v-model="content.images"
      :data-cols="config.columns"
      :data-count="content.images.length"
      @start="draggingInProgress = true"
      @end="draggingInProgress = false"
      class="publii-block-gallery-list">
      <div
        v-for="(image, index) of content.images"
        :key="'gallery-item-' + index"
        class="publii-block-gallery-list-item">
        <div class="publii-block-gallery-list-item-image">
          <img
            :src="image.thumbnailSrc"
            :height="image.height"
            :width="image.width" />
        </div>

        <div class="publii-block-gallery-list-item-config">
          <input type="text" v-model="image.alt" :placeholder="$t('editor.enterAltText')"/>
          <input type="text" v-model="image.caption" :placeholder="$t('editor.enterCaption')"/>
        </div>
      </div>
    </draggable>

    <div
      v-if="(content.images.length === 0 || view === 'edit')"
      :class="{ 'publii-block-gallery-form': true, 'is-visible': content.images.length === 0 }"
      ref="block">
      <div
        :class="{ 'publii-block-gallery-uploader': true, 'is-hovered': isHovered }">
        <div class="publii-block-gallery-uploader-inner">
          <icon
            v-if="!imageUploadInProgress"
            name="blank-gallery"
            height="62"
            width="75" />
          <span v-if="!imageUploadInProgress">
            {{ $t('editor.dropToUploadYourPhotosOr') }}
          </span>
          <button
            v-if="!imageUploadInProgress"
            @click="filePickerCallback">
            {{ $t('editor.selectFiles') }}
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="imageUploadInProgress"
      class="publii-block-gallery-uploader-loader-overlay">
      <span class="publii-block-gallery-uploader-loader"></span>
    </div>

    <top-menu
      ref="top-menu"
      :config="topMenuConfig"
      :advancedConfig="configForm" />
  </div>
</template>

<script>
import Draggable from 'vuedraggable';
import Block from './../../Block.vue';
import ConfigForm from './config-form.json';
import ContentEditableImprovements from './../../helpers/ContentEditableImprovements.vue';
import EditorIcon from './../../elements/EditorIcon.vue';
import TopMenuUI from './../../helpers/TopMenuUI.vue';
import Utils from './../../utils/Utils.js';

export default {
  name: 'PGallery',
  mixins: [
    Block,
    ContentEditableImprovements
  ],
  components: {
    'icon': EditorIcon,
    'top-menu': TopMenuUI,
    'draggable': Draggable
  },
  watch: {
    '$parent.uiOpened': function (newValue) {
      if (!this.content.images.length) {
        return;
      }

      if (newValue) {
        this.view = 'edit';
      } else {
        this.view = 'preview';
      }
    }
  },
  data () {
    return {
      confirmDelete: false,
      draggingInProgress: false,
      isHovered: false,
      imageUploadInProgress: false,
      imagesQueue: [],
      imageUploader: null,
      view: 'preview',
      config: {
        imageAlign: 'center',
        columns: 3,
        advanced: {
          cssClasses: this.getAdvancedConfigDefaultValue('cssClasses'),
          id: this.getAdvancedConfigDefaultValue('id')
        }
      },
      content: {
        images: []
      },
      topMenuConfig: [
        {
          type: 'select',
          label: this.$t('image.columns'),
          configKey: 'columns',
          clearable: false,
          searchable: false,
          cssClasses: 'is-narrow',
          options: [1, 2, 3, 4, 5, 6, 7, 8]
        },
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
    this.initFakeFilePicker();
    this.setParentCssClasses(this.config.imageAlign);
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

      if (!files[0] || !files[0].path) {
        this.imageUploadInProgress = false;
      } else {
        this.imagesQueue = [];

        for (let i = 0; i < files.length; i++) {
        this.imagesQueue.push(files[i].path);
        }

        this.imageUploadInProgress = true;
        this.$parent.$el.setAttribute('style', 'height: ' + this.$parent.$el.clientHeight + 'px; overflow: hidden;');
        this.uploadImage();
      }

      this.isHovered = false;
    },
    initFakeFilePicker () {
      this.imageUploader = document.getElementById('post-editor-fake-multiple-images-uploader');
      this.imageUploader.addEventListener('change', () => {
        if (!this.imageUploader.value) {
          return;
        }

        setTimeout(() => {
          if (!this.fileSelectionCallback) {
            return;
          }

          if (this.imageUploader.files) {
            this.imagesQueue = [];

            for (let i = 0; i < this.imageUploader.files.length; i++) {
              this.imagesQueue.push(this.imageUploader.files[i].path);
            }
          } else {
            return;
          }

          this.imageUploadInProgress = true;
          this.$parent.$el.setAttribute('style', 'height: ' + this.$parent.$el.clientHeight + 'px; overflow: hidden;');
          this.uploadImage();
        }, 50);
      });
    },
    uploadImage () {
      let filePath = this.imagesQueue.shift();

      // eslint-disable-next-line
      mainProcessAPI.send('app-image-upload', {
        id: this.editor.config.postID,
        site: window.app.getSiteName(),
        path: filePath,
        imageType: 'galleryImages'
      });

      // eslint-disable-next-line
      mainProcessAPI.receiveOnce('app-image-uploaded', (data) => {
        let thumbnailSrc = data.thumbnailDimensions ? data.thumbnailPath[0] : data.thumbnailPath;
        let sizeWidth = data.baseImage.size[0] || '';
        let sizeHeight = data.baseImage.size[1] || '';

        this.content.images.push({
          src: data.baseImage.url,
          thumbnailSrc: thumbnailSrc,
          height: data.thumbnailDimensions ? data.thumbnailDimensions.height : sizeHeight,
          width: data.thumbnailDimensions ? data.thumbnailDimensions.width : sizeWidth,
          dimensions: data.baseImage.size.join('x'),
          alt: '',
          caption: ''
        });

        if (this.imagesQueue.length) {
          this.uploadImage();
        } else {
          this.$parent.$el.removeAttribute('style');
          this.fileSelectionCallback = false;
          this.imageUploadInProgress = false;
          this.imageUploader.value = '';
          this.$parent.openPopup();
        }
      });
    },
    filePickerCallback () {
      this.fileSelectionCallback = true;
      document.getElementById('post-editor-fake-multiple-images-uploader').click();
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
    removeImage (index) {
      if (this.confirmDelete !== index) {
        this.confirmDelete = index;
      } else {
        this.content.images.splice(index, 1);
      }
    },
    save () {
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

.publii-block-gallery {
  display: flex;
  flex-wrap: wrap;
  margin: -1rem;
  outline: none;
  position: relative;

  &-empty-state {
    color: var(--gray-3);
    font-family: var(--font-base);
    font-size: 14px;
    text-align: center;
  }

  &-item {
    cursor: move;
    padding: 1rem;
    position: relative;
    width: calc(100% / 3);

    & > img {
      display: block;
      height: 30vh;
      max-width: 100%;
      object-fit: cover;
      width: 100%;
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
      left: 25px;
      opacity: 0;
      pointer-events: none;
      position: absolute;
      top: 25px;
      transition: var(--transition);
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

    &:hover {
      .publii-block-gallery-item-delete {
        opacity: 1;
        pointer-events: auto;
      }
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

      &-overlay {
        background: var(--bg-primary);
        border: 2px dashed var(--input-border-color);
        border-radius: var(--border-radius);
        bottom: 0;
        padding: 6px;
        position: absolute;
        left: auto;
        right: auto;
        top: 0;
        width: var(--editor-width);
        z-index: 1;

        &::after {
          content: "";
          background: var(--gray-1);
          display: block;
          height: 100%;
          width: 100%;
        }
      }
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

  &-list {
    &-item {
      align-items: center;
      display: flex;
      margin: 2rem 0 2.5rem;

      &-image {
        height: 112px;
        margin: 0 20px 0 0;
        overflow: hidden;
        position: relative;
        width: 120px;

        img {
          height: auto;
          left: 50%;
          width: 100%;
          position: absolute;
          top: 50%;
          transform: translateX(-50%) translateY(-50%);
        }
      }

      &-config {
        width: calc(100% - 140px);

        input {
          display: block;
          width: 100%;       

          & + input {
             margin-top: 16px;
          }
        }
      }
    }
  }
}

@for $i from 1 through 8 {
  .publii-block-gallery[data-cols="#{$i}"] .publii-block-gallery-item {
    flex-grow: 1;
    width: calc(100% / #{$i});
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
