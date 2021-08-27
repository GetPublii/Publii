const availableConversions = [
  {
    'icon': 'headings',
    'name': 'editor.conversions.toHeader',
    'type': 'publii-header',
    'convert': function (config, content, editorInstance) {
      // eslint-disable-next-line
      let newContent = editorInstance.extensions.conversionHelpers.stripTags(content.replace(/<br>/gmi, "\n")).replace(/\n/gmi, '<br>');
      let newConfig = {
        headingLevel: 2,
        textAlign: config.textAlign,
        link: {
          url: '',
          noFollow: false,
          targetBlank: false,
          sponsored: false,
          ugc: false
        },
        advanced: {
          cssClasses: config.advanced.cssClasses,
          customId: false,
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
    'icon': 'quote',
    'name': 'editor.conversions.toQuote',
    'type': 'publii-quote',
    'convert': function (config, content, editorInstance) {
      let newConfig = {
        advanced: {
          cssClasses: config.advanced.cssClasses,
          id: config.advanced.id
        }
      };

      return {
        content: {
          text: content,
          author: ''
        },
        config: newConfig
      };
    }
  },
  {
    'icon': 'unordered-list',
    'name': 'editor.conversions.toList',
    'type': 'publii-list',
    'convert': function (config, content, editorInstance) {
      let newContent = '<li>' + content.split('<br>').join('</li><li>') + '</li>';
      let newConfig = {
        listType: 'ul',
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
  },
  {
    'icon': 'code',
    'name': 'editor.conversions.toCode',
    'type': 'publii-code',
    'convert': function (config, content, editorInstance) {
      // eslint-disable-next-line
      let newContent = editorInstance.extensions.conversionHelpers.stripTags(content.replace(/<br>/gmi, "\n"));
      let newConfig = {
        language: 'html',
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
  },
  {
    'icon': 'html',
    'name': 'editor.conversions.toHTML',
    'type': 'publii-html',
    'convert': function (config, content, editorInstance, rawBlock) {
      let newContent = rawBlock.outerHTML.replace(/<p.*?>/gmi, '<p>');
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
