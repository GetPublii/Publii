<script>
export default {
  name: 'AdvancedConfig',
  mounted () {
    this.$bus.$on('block-editor-save-advanced-config', this.saveAdvancedConfig);
    this.$bus.$on('block-editor-trigger-advanced-config', this.showAdvancedConfig);
  },
  methods: {
    getAdvancedConfigDefaultValue (fieldName) {
      let index = this.configForm.findIndex(field => field.name === fieldName);
      return this.configForm[index].defaultValue;
    },
    saveAdvancedConfig (blockID, savedValues) {
      if (blockID !== this.id) {
        return;
      }

      let keys = Object.keys(savedValues);

      for (let key of keys) {
        this.config.advanced[key] = savedValues[key];
      }

      this.save();
    },
    showAdvancedConfig (blockID) {
      if (blockID !== this.id) {
        return;
      }

      this.$bus.$emit('block-editor-show-advanced-config', this.id, this.config.advanced, this.configForm);
    }
  },
  beforeDestroy () {
    this.$bus.$off('block-editor-save-advanced-config', this.saveAdvancedConfig);
    this.$bus.$off('block-editor-trigger-advanced-config', this.showAdvancedConfig);
  }
};
</script>
