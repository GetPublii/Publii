const availableConversions = [
  {
    'icon': 'html',
    'name': 'HTML',
    'type': 'publii-html',
    'convert': function (config, content, editorInstance, rawBlock) {
      let newContent = rawBlock.innerHTML;
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
