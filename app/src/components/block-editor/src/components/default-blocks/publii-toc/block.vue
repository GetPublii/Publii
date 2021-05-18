<template>
  <div :class="{ 'is-empty': isEmpty }">
    <div
      class="publii-block-toc-wrapper"
      ref="block">
      <h3
        class="publii-block-toc-title"
        ref="title"
        @focus="updateCurrentBlockID"
        @keydown="handleKeyboard"
        @keyup="handleCaret($event, 'title'); debouncedSave()"
        contenteditable="true"
        v-initial-html="content.title"></h3>
      <ol
        class="publii-block-toc"
        ref="content"
        v-html="content.toc">
      </ol>
    </div>

    <top-menu
      ref="top-menu"
      :config="[]" />
  </div>
</template>

<script>
import Block from './../../Block.vue';
import ConfigForm from './config-form.json';
import TopMenuUI from './../../helpers/TopMenuUI.vue';
import Utils from './../../utils/Utils.js';

export default {
  name: 'ToC',
  mixins: [
    Block
  ],
  components: {
    'top-menu': TopMenuUI
  },
  data () {
    return {
      focusable: ['title'],
      config: {
        advanced: {
          cssClasses: this.getAdvancedConfigDefaultValue('cssClasses'),
          id: this.getAdvancedConfigDefaultValue('id')
        }
      },
      content: {
        title: '',
        toc: ''
      }
    };
  },
  beforeCreate () {
    this.configForm = ConfigForm;
  },
  beforeMount () {
    this.content = Utils.deepMerge(this.content, this.inputContent);
  },
  mounted () {
    this.updateToc();
    this.$bus.$on('block-editor-content-updated', this.updateToc);
    this.$bus.$on('block-editor-block-selected', this.selectBlock);
  },
  methods: {
    handleKeyboard (e) {
      if (e.code === 'Enter' && !e.isComposing) {
        this.$bus.$emit('block-editor-add-block', 'publii-paragraph', this.id);
        e.returnValue = false;
      }

      if (e.code === 'Backspace' && this.$refs['title'].innerHTML === '') {
        this.$bus.$emit('block-editor-delete-block', this.id);
        e.returnValue = false;
      }
    },
    updateToc () {
      let headers = this.$parent.$parent.content.filter(block => block.type === 'publii-header');

      if (headers.length === 0) {
        this.content.toc = '';
        return;
      }

      let html = '';
      let prevLevel = 2;
      let processedHeader;
      let nextLevel;

      if (!headers.length) {
        return '';
      }

      for (let i = 0; i < headers.length; i++) {
        processedHeader = headers[i];
        let headingLevel = processedHeader.config.headingLevel || 2;

        if (headers[i + 1]) {
          nextLevel = headers[i + 1].config.headingLevel;
        }

        if (prevLevel === headingLevel) {
          html += '<li>';
        } else {
          for (let j = prevLevel; j < headingLevel; j++) {
            html += '<ol><li>';
          }
        }

        html += '<a href="#' + processedHeader.config.advanced.id + '">' + processedHeader.content + '</a>';

        if (!nextLevel || nextLevel === headingLevel) {
          html += '</li>';

          if (!nextLevel) {
            html += '</ol>';
          }
        } else {
          for (let j = headingLevel; j > nextLevel; j--) {
            html += '</li></ol><li>';
          }
        }

        prevLevel = headingLevel;
      }

      this.content.toc = html.replace(/<li>[\s]*?<\/li>/gmi, '');
    },
    selectBlock (id) {
      if (this.id === id) {
        this.focus('end');
      }
    },
    save () {
      this.content = {
        toc: this.$refs['content'].innerHTML,
        title: this.$refs['title'].innerHTML
      };

      this.$bus.$emit('block-editor-save-block', {
        id: this.id,
        config: JSON.parse(JSON.stringify(this.config)),
        content: JSON.parse(JSON.stringify(this.content))
      });
    }
  },
  beforeDestroy () {
    this.$bus.$off('block-editor-content-updated', this.updateToc);
    this.$bus.$off('block-editor-block-selected', this.selectBlock);
  }
}
</script>

<style lang="scss">
.publii-block-toc {
  caret-color: transparent;
  display: block;
  margin: 10px 0;
  padding: 15px 0 15px 20px;
  outline: none;
  width: 100%;

  &-wrapper {
    outline: none;
    width: 100%;

    .publii-block-toc-title {
      outline: none;
      margin: 10px 0 20px !important;
      width: 100%;

      &:empty {
        &:before {
          content: "Add label";
          color: var(--eb-gray-4);
        }
      }
    }

    a {
      pointer-events: none;
    }
  }

  &:empty {
    &:before {
      content: 'The table of content is generated automatically by collecting headings (H1-H6) of your content.';
      color: var(--eb-gray-4);
      display: block;
      text-align: center;
      width: 100%;
    }
  }
}
</style>
