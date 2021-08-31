const availableConversions = [
  {
    'icon': 'paragraph',
    'name': 'editor.conversions.toParagraph',
    'type': 'publii-paragraph',
    'convert': function (config, content, editorInstance) {
      let newContent = editorInstance.extensions.conversionHelpers.stripTags(content).replace(/\n/gmi, '<br>');
      let newConfig = {
        textAlign: 'left',
        advanced: {
          style: '',
          cssClasses: config.advanced.cssClasses,
          id: config.advanced.id
        }
      };

      return {
        content: newContent,
        config: newConfig
      };
    }
  }
];

module.exports = availableConversions;
