<template>
  <div :class="{ 'publii-block-embed-wrapper': true, 'is-empty': isEmpty }">
    <div
      :class="{ 'publii-block-embed': true, 'is-visible': view === 'code' }"
      ref="block">
      <textarea
        @keydown="handleKeyboard"
        @keyup="handleCaret($event); debouncedSave()"
        ref="code"
        :placeholder="$t('editor.enterUrlOrEmbedCode')"
        v-model="content"></textarea>
    </div>
    <div
      v-if="view === 'preview'"
      v-html="modifiedContent"
      :class="{ 'publii-block-embed-preview': true }">
    </div>

    <top-menu
      ref="top-menu"
      :config="[]" />
  </div>
</template>

<script>
import Block from './../../Block.vue';
import ConfigForm from './config-form.json';
import ContentEditableImprovements from './../../helpers/ContentEditableImprovements.vue';
import EmbedHelper from './embed.js';
import HasPreview from './../../mixins/HasPreview.vue';
import TopMenuUI from './../../helpers/TopMenuUI.vue';

export default {
  name: 'Embed',
  mixins: [
    Block,
    ContentEditableImprovements,
    HasPreview
  ],
  components: {
    'top-menu': TopMenuUI
  },
  data () {
    return {
      focusable: ['code'],
      config: {
        advanced: {
          cssClasses: this.getAdvancedConfigDefaultValue('cssClasses'),
          id: this.getAdvancedConfigDefaultValue('id')
        }
      },
      content: ''
    };
  },
  computed: {
    modifiedContent () {
      if (EmbedHelper.isEmbedable(this.content)) {
        return EmbedHelper.embed(this.content, this.$bus, this.id);
      }

      return this.content;
    }
  },
  beforeCreate () {
    this.configForm = ConfigForm;
  },
  mounted () {
    this.content = this.inputContent;
    this.view = this.content === '' ? 'code' : 'preview';
  },
  methods: {
    handleKeyboard (e) {
      if (e.code === 'Enter' && !e.isComposing && e.shiftKey === false) {
        this.$bus.$emit('block-editor-add-block', 'publii-paragraph', this.id);
        e.returnValue = false;
      }

      if (e.code === 'Tab' && e.shiftKey === false) {
        e.preventDefault();
        // eslint-disable-next-line
        document.execCommand('insertHTML', false, "  ");
        e.returnValue = false;
      }

      if (e.code === 'Backspace' && this.content === '') {
        this.$bus.$emit('block-editor-delete-block', this.id);
        e.returnValue = false;
      }
    },
    save () {
      this.$bus.$emit('block-editor-save-block', {
        id: this.id,
        config: JSON.parse(JSON.stringify(this.config)),
        content: this.content
      });
    }
  }
}
</script>

<style lang="scss" >
@import '../../../../../scss/vendor/modularscale';
@import '../../../../../scss/variables.scss';
@import '../../../../../scss/mixins.scss';

.publii-block-embed {
    background: var(--gray-1);
    border-radius: var(--border-radius);
    color: var(--gray-2);
    display: none;
    font-size: ms(-1);
    padding: baseline(6,em);
    outline: none;
    width: 100%;

    textarea {
        background: var(--white);
        border: 1px solid var(--gray-2);
        border-radius: var(--border-radius);
        font-family: var(--font-monospace);
        font-size: ms(-1);
        min-height: 180px;
        padding: 20px;
        resize: vertical;
        width: 100%;
    }

    &.is-visible {
        display: block;
    }

    &-preview {
        background: var(--gray-1);
        margin: 0;
        padding: 0 0 56.25%;
        position: relative;

        iframe {
            height: 100%;
            pointer-events: none;
            position: absolute;
            width: 100%;
        }
    }
}
</style>
