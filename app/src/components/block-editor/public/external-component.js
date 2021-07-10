(function () {
  let template = window.publiiBlockEditor.compileToFunctions(`
    <component
      :is="'h' + config.headingLevel"
      contenteditable="true"
      @keyup="getFocusFromTab"
      ref="block"
      v-initial-html="content" />
  `);

  window.Vue.component('publii-header-custom', {
    mixins: [
      window.publiiBlockEditor.Block,
      window.publiiBlockEditor.ContentEditableImprovements
    ],
    data () {
      return {
        config: {
          headingLevel: 2
        },
        content: ''
      };
    },
    render: template.render,
    beforeMount () {
      this.content = this.inputContent;
    },
    methods: {
      save () {
        this.content = this.$refs['block'].innerHTML;

        this.$bus.$emit('block-editor-save-block', {
          id: this.id,
          config: JSON.parse(JSON.stringify(this.config)),
          content: this.content
        });
      }
    }
  });
})();
