<template>
  <div
    :class="{ 'publii-block-gallery-wrapper': true, 'is-empty': isEmpty }"
    @dragover.stop.prevent="dragOver"
    @dragleave.stop.prevent="dragLeave"
    @drop.stop.prevent="drop">
    <draggable
      v-if="content.images.length > 0 && view === 'preview'"
      ref="block"
      v-model="content.images"
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
          class="publii-block-gallery-item-delete"
          @click.stop.prevent="removeImage(index)">
          <icon name="trash" />
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
          <input type="text" v-model="image.alt" placeholder="Enter alt text"/>
          <input type="text" v-model="image.caption" placeholder="Enter a caption"/>
        </div>
      </div>
    </draggable>

    <div
      v-if="content.images.length === 0 && editor.bulkOperationsMode && view === 'preview'"
      class="publii-block-gallery-empty-state">
      Empty gallery block
    </div>

    <div
      v-if="(content.images.length === 0 || view === 'edit') && !editor.bulkOperationsMode"
      :class="{ 'publii-block-gallery-form': true, 'is-visible': content.images.length === 0 }"
      ref="block">
      <div
        :class="{ 'publii-block-gallery-uploader': true, 'is-hovered': isHovered }">
        <div class="publii-block-gallery-uploader-inner">
          <icon
            v-if="!imageUploadInProgress"
            name="blank-gallery"
            height="50"
            width="66" />
          <span v-if="!imageUploadInProgress">
            Drop to upload your photos or
          </span>
          <button
            v-if="!imageUploadInProgress"
            @click="filePickerCallback">
            Select files
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
          label: 'Columns:',
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
          tooltip: 'Centered image'
        },
        {
          activeState: function () { return this.config.imageAlign === 'wide'; },
          onClick: function () { this.alignImage('wide'); },
          icon: 'wide',
          tooltip: 'Wide image'
        },
        {
          activeState: function () { return this.config.imageAlign === 'full'; },
          onClick: function () { this.alignImage('full'); },
          icon: 'full',
          tooltip: 'Full-width image'
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
      if (this.$ipcRenderer) {
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
      } else {
        for (let i = 0; i < e.dataTransfer.items.length; i++) {
          let blob = e.dataTransfer.items[i].getAsFile();
          this.content.images.push({
            src: window.URL.createObjectURL(blob),
            height: 240,
            width: 320,
            alt: '',
            caption: ''
          });
        }
      }

      this.isHovered = false;
    },
    initFakeFilePicker () {
      if (!this.$ipcRenderer) {
        return false;
      }

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
      this.$ipcRenderer.send('app-image-upload', {
        id: this.editor.config.postID,
        site: window.app.getSiteName(),
        path: filePath,
        imageType: 'galleryImages'
      });

      // eslint-disable-next-line
      this.$ipcRenderer.once('app-image-uploaded', (event, data) => {
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
      this.content.images.splice(index, 1);
    },
    save () {
      this.$bus.$emit('block-editor-save-block', {
        id: this.id,
        config: JSON.parse(JSON.stringify(this.config)),
        content: JSON.parse(JSON.stringify(this.content))
      });
    }
  },
  beforeDestroy () {
    this.$bus.$off('block-editor-save-link-popup', this.setLink);
  }
}
</script>

<style lang="scss">
@import '../../../vendors/modularscale';
@import '../../../assets/functions.scss';
@import '../../../assets/variables.scss';
@import '../../../assets/mixins.scss';

.publii-block-gallery {
  display: flex;
  flex-wrap: wrap;
  margin: 0 -1%;
  outline: none;
  position: relative;

  &-empty-state {
    color: var(--eb-gray-4);
    font-size: 12px;
    font-weight: bold;
    text-align: center;
    text-transform: uppercase;
  }

  &-item {
    cursor: move;
    padding: 1%;
    position: relative;
    width: calc(100% / 3);

    & > img {
      display: block;
      height: auto;
      max-width: 100%;
      width: auto;
    }

    &-delete {
      align-items: center;
      background: var(--eb-warning);
      border: none;
      border-radius: var(--eb-border-radius);
      cursor: pointer;
      display: flex;
      height: 34px;
      justify-content: center;
      left: 20px;
      opacity: 0;
      pointer-events: none;
      position: absolute;
      top: 20px;
      transition: var(--eb-transition);
      width: 34px;
      z-index: 2;

      svg {
        fill: var(--eb-white);
        transition: var(--eb-transition);
      }

      &:active,
      &:focus,
      &:hover {
        background: var(--eb-gray-2);

        svg {
           fill: var(--eb-warning);
        }
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
    border: 2px dashed var(--eb-input-border-color);
    border-radius: var(--eb-border-radius);
    height: 250px;
    margin: 0 0 16px 0;
    padding: 6px;
    position: relative;
    width: 100%;

    &.is-hovered {
      border-color: var(--eb-primary-color);
    }

    &-loader {
      animation: loader 1s linear infinite;
      border: 3px solid var(--eb-primary-color);
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
        background: var(--eb-bg-primary);
        border: 2px dashed var(--eb-input-border-color);
        border-radius: var(--eb-border-radius);
        bottom: 0;
        padding: 6px;
        position: absolute;
        left: auto;
        right: auto;
        top: 0;
        width: var(--eb-editor-width);
        z-index: 1;

        &::after {
          content: "";
          background: var(--eb-gray-1);
          display: block;
          height: 100%;
          width: 100%;
        }
      }
    }

   &-inner {
      align-items: center;
      background: var(--eb-gray-1);
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      height: 234px;
      padding: 2rem;
      width: 100%;

      svg {
        fill: var(--eb-icon-secondary-color);
      }

      span {
        color: var(--eb-gray-4);
        display: block;
        font-size: 16px;
        text-align: center;
        width: 100%;
      }

      button {
        background: var(--eb-button-gray-bg);
        border: 1px solid var(--eb-button-gray-bg);
        border-radius: var(--eb-border-radius);
        color: var(--eb-white);
        cursor: pointer;
        font-weight: 500;
        font-size: 15px;
        padding: .5rem 2rem;
        text-align: center;
        outline: none;

        &:active,
        &:focus,
        &:hover {
          background: var(--eb-button-gray-hover-bg);
          border-color: var(--eb-button-gray-hover-bg);
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
          background: var(--eb-input-bg);
          border: 1px solid var(--eb-input-border-color);
          border-radius: var(--eb-border-radius);
          color: var(--eb-text-primary-color);
          display: block;
          font-size: ms(-1);
          line-height: inherit;
          outline: none;
          padding: 10px 20px;
          width: 100%;

          &::placeholder {
             color: var(--eb-text-light-color);
          }

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
