<template>
  <div class="vue-easymde">
    <textarea 
      ref="editor-textarea"
      :name="name"></textarea>
  </div>
</template>

<script>
import EasyMDE from 'easymde';

export default {
  name: 'vue-easymde',
  props: {
    configs: {
      type: Object,
      default() {
        return {};
      }
    },
    name: String,
    value: String
  },
  mounted() {
    let configs = Object.assign({
      element: this.$refs['editor-textarea'],
      initialValue: this.value,
      renderingConfig: {},
    }, this.configs);

    if (configs.initialValue) {
      this.$emit('input', configs.initialValue);
    }

    this.easymde = new EasyMDE(configs);
    this.initEvents();
  },
  watch: {
    value(val) {
      if (val === this.easymde.value()) {
        return;
      }

      this.easymde.value(val);
    },
  },
  activated() {
    let editor = this.easymde;

    if (!editor) {
      return;
    }

    let isActive = editor.isSideBySideActive() || editor.isPreviewActive();

    if (isActive) {
      editor.toggleFullScreen();
    }
  },
  methods: {
    initEvents() {
      this.easymde.codemirror.on('change', () => {
        this.$emit('input', this.easymde.value());
      });
    }
  },
  destroyed() {
    this.easymde = null;
  }
};
</script>
