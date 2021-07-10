const availableConversions = [
  {
    'icon': 'paragraph',
    'name': 'Paragraph',
    'type': 'publii-paragraph',
    'convert': function (config, content, editorInstance) {
      let newConfig = {
        textAlign: 'left',
        advanced: {
          style: '',
          cssClasses: config.advanced.cssClasses,
          id: config.advanced.id
        }
      };

      return {
        content: content.text,
        config: newConfig
      };
    }
  },
  {
    'icon': 'html',
    'name': 'HTML',
    'type': 'publii-html',
    'convert': function (config, content, editorInstance, rawBlock) {
      let newContent = content;
      let newConfig = {
        advanced: {
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
