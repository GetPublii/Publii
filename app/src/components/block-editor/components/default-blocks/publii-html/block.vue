<template>
  <div>
    <prism-editor
      :class="{ 'publii-block-html': true, 'is-visible': true }"
      ref="block"
      @keyup="handleKeyboard($event); debouncedSave()"
      @focus="updateCurrentBlockID"
      :code="content"
      :emitEvents="true"
      v-model="content"
      :lineNumbers="true"
      language="html">
    </prism-editor>

    <top-menu
      ref="top-menu"
      :conversions="conversions"
      :config="[]" />
  </div>
</template>

<script>
import AvailableConversions from './conversions.js';
import Block from './../../Block.vue';
import ConfigForm from './config-form.json';
import ContentEditableImprovements from './../../helpers/ContentEditableImprovements.vue';
import contentFilter from './content-filter.js';
import addAspectRatio from './aspect-ratio.js';
import TopMenuUI from './../../helpers/TopMenuUI.vue';

export default {
  name: 'Html',
  mixins: [
    Block,
    ContentEditableImprovements
  ],
  components: {
    'top-menu': TopMenuUI
  },
  data () {
    return {
      config: {
        advanced: {
          cssClasses: this.getAdvancedConfigDefaultValue('cssClasses'),
          id: this.getAdvancedConfigDefaultValue('id')
        }
      },
      content: '',
      conversions: AvailableConversions
    };
  },
  computed: {
    modifiedContent () {
      let codeWithAspectRatio = addAspectRatio(this.$refs['block'].code);
      return contentFilter(codeWithAspectRatio);
    }
  },
  beforeCreate () {
    this.configForm = ConfigForm;
  },
  mounted () {
    this.content = this.inputContent;
  },
  methods: {
    focus () {
      this.$refs['block'].$el.querySelector('pre').focus();
    },
    handleKeyboard (e) {
      if (e.code === 'Enter' && !e.isComposing && e.shiftKey === true) {
        e.preventDefault();
        this.$bus.$emit('block-editor-add-block', 'publii-paragraph', this.id);
        e.returnValue = false;
      }

      if (e.code === 'Tab' && e.shiftKey === false) {
        e.preventDefault();
        // eslint-disable-next-line
        document.execCommand('insertHTML', false, "  ");
        e.returnValue = false;
      }

      if (e.code === 'Backspace' && this.$refs['block'].$el.querySelector('pre').innerHTML === '') {
        this.$bus.$emit('block-editor-delete-block', this.id);
        e.returnValue = false;
      }
    },
    save () {
      this.content = this.$refs['block'].code;

      this.$bus.$emit('block-editor-save-block', {
        id: this.id,
        config: JSON.parse(JSON.stringify(this.config)),
        content: this.content
      });
    }
  }
}
</script>

<style lang="scss">
@import '../../../../../scss/vendor/modularscale';
@import '../../../../../scss/variables.scss';
@import '../../../../../scss/mixins.scss';

.publii-block-html {
  border-radius: var(--border-radius);
  background: var(--gray-4);
  box-shadow: 2px 4px 26px var(--shadow);
  outline: none;
  width: 100%;

  & > pre,
  & > .prism-editor__line-numbers {
    display: none;
  }

  &.is-visible {
    & > pre,
    & > .prism-editor__line-numbers {
      background: var(--pre-bg) !important;
      display: block;
    }

    & > pre {
      background: var(--pre-bg) !important;
    }

    code {
      background: transparent !important;
      padding: 0!important;
    }
  }

  .prism-editor__line-numbers {
    background: var(--input-bg) !important;
  }
}
</style>
