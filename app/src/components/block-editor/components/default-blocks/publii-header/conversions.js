const availableConversions = [
  {
    'icon': 'paragraph',
    'name': 'editor.conversions.toParagraph',
    'type': 'publii-paragraph',
    'convert': function (config, content, editorInstance) {
      // eslint-disable-next-line
      let newContent = content.replace(/\n/gmi, '<br>');
      let newConfig = {
        textAlign: config.textAlign,
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
  },
  {
    'icon': 'html',
    'name': 'editor.conversions.toHTML',
    'type': 'publii-html',
    'convert': function (config, content, editorInstance, rawBlock) {
      let newContent = rawBlock.outerHTML.replace(/<h([0-9]{1,1}).*?>/gmi, '<h$1>');
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
