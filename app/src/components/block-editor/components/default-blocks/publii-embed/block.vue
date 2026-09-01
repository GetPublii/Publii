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

<style >

.publii-block-embed {
    background: var(--color-surface-subtle);
    border-radius: var(--radius-base);
    color: var(--color-text-faint);
    display: none;
    font-size: 0.8889em;
    padding: 1.3714em;
    outline: none;
    width: 100%;

    textarea {
        background: var(--white);
        border: 1px solid var(--color-border-default);
        border-radius: var(--radius-base);
        font-family: var(--font-family-mono);
        font-size: 0.8889em;
        min-height: 180px;
        padding: 20px;
        resize: vertical;
        width: 100%;
    }

    &.is-visible {
        display: block;
    }
}

.publii-block-embed-preview {
    background: var(--color-surface-subtle);
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
</style>
