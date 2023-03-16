<template>
  <div :class="{ 'is-empty': isEmpty }">
    <div
      class="publii-block-readmore"
      contenteditable="true"
      @keyup="getFocusFromTab($event); handleCaret($event)"
      @paste="pastePlainText"
      @click="updateCurrentBlockID"
      ref="block"
      :data-translation="$t('editor.readMore')">
      <hr />
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

export default {
  name: 'ReadMore',
  mixins: [
    Block
  ],
  components: {
    'top-menu': TopMenuUI
  },
  data () {
    return {
      config: {
        advanced: {}
      },
      content: false
    };
  },
  beforeCreate () {
    this.configForm = ConfigForm;
  },
  mounted () {
    this.content = this.inputContent;
    this.$refs['block'].addEventListener('keydown', this.handleKeyboard);
  },
  methods: {
    handleKeyboard (e) {
      if (e.code === 'Enter' && !e.isComposing) {
        this.$bus.$emit('block-editor-add-block', 'publii-paragraph', this.id);
      }

      if (e.code === 'Backspace') {
        this.$bus.$emit('block-editor-delete-block', this.id);
        e.returnValue = false;
      }

      if (e.code !== 'Tab') {
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
  },
  beforeDestroy () {
    this.$refs['block'].removeEventListener('keydown', this.handleKeyboard);
  }
}
</script>

<style lang="scss">
@import '../../../../../scss/vendor/modularscale';
@import '../../../../../scss/variables.scss';
@import '../../../../../scss/mixins.scss';

.publii-block-readmore {
  align-items: center;
  caret-color: transparent;
  display: flex;
  justify-content: center;
  outline: none;
  width: 100%;

  hr {
    border: none;
    height: auto;
    line-height: 100%;
    position: relative;
  }

  &::before {
    border-bottom: 1px solid var(--text-primary-color);
    content: " ";
    display: block;
    position: relative;
    transform: translateY(-50%);
    width: 100%;
    white-space: pre;
  }

  &::after {
    background: var(--input-bg);
    content: attr(data-translation);
    display: inline-block;
    font-family: var(--font-base);
    font-size: ms(-3);
    font-weight: var(--font-weight-semibold);
    padding: 6px 16px;
    position: absolute;
    white-space: pre;
  }
}
</style>
