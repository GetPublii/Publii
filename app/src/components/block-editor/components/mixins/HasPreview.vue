<script>
export default {
  name: 'has-preview',
  data () {
    return {
      view: 'code'
    };
  },
  mounted () {
    this.$bus.$on('block-editor-deselect-blocks', this.deselectBlock);
    this.$bus.$on('block-editor-block-selected', this.selectBlock);
  },
  methods: {
    setView (newView) {
      if (
        this.view === 'code' &&
        newView === 'preview'
      ) {
        this.save();
      }

      if (
        this.content === '' &&
        newView === 'preview'
      ) {
        this.view = 'code';
      } else {
        setTimeout(() => {
          this.view = newView;
        }, 0);
      }
    },
    selectBlock (id) {
      if (this.id === id) {
        this.setView('code');

        setTimeout(() => {
          this.focus('end');
        }, 0);
      }
    },
    deselectBlock (id) {
      if (this.id !== id) {
        this.setView('preview');
      }
    },
    showPreview () {
      this.setView('preview');
    }
  },
  beforeDestroy () {
    this.$bus.$off('block-editor-deselect-blocks', this.deselectBlock);
    this.$bus.$off('block-editor-block-selected', this.selectBlock);
  }
}
</script>
