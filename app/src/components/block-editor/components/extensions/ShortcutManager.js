export default class ShortcutManager {
  constructor () {
    this.shortcuts = {};
    this.initDefaultShortcuts();
    this.initMarkdownDefaultShortcuts();
  }

  initDefaultShortcuts () {
    this.shortcuts['/separator'] = 'publii-separator';
    this.shortcuts['/hr'] = 'publii-separator';
    this.shortcuts['/header'] = 'publii-header';
    this.shortcuts['/h1'] = 'publii-header-1';
    this.shortcuts['/h2'] = 'publii-header-2';
    this.shortcuts['/h3'] = 'publii-header-3';
    this.shortcuts['/h4'] = 'publii-header-4';
    this.shortcuts['/h5'] = 'publii-header-5';
    this.shortcuts['/h6'] = 'publii-header-6';
    this.shortcuts['/list'] = 'publii-list';
    this.shortcuts['/quote'] = 'publii-quote';
    this.shortcuts['/blockquote'] = 'publii-quote';
    this.shortcuts['/code'] = 'publii-code';
    this.shortcuts['/readmore'] = 'publii-readmore';
    this.shortcuts['/more'] = 'publii-readmore';
    this.shortcuts['/html'] = 'publii-html';
    this.shortcuts['/toc'] = 'publii-toc';
    // this.shortcuts['/embed'] = 'publii-embed';
    this.shortcuts['/image'] = 'publii-image';
    this.shortcuts['/img'] = 'publii-image';
    this.shortcuts['/gallery'] = 'publii-gallery';
  }

  initMarkdownDefaultShortcuts () {
    this.shortcuts['---'] = 'publii-separator';
    this.shortcuts['***'] = 'publii-readmore';
    this.shortcuts['#'] = 'publii-header-1';
    this.shortcuts['##'] = 'publii-header-2';
    this.shortcuts['###'] = 'publii-header-3';
    this.shortcuts['####'] = 'publii-header-4';
    this.shortcuts['#####'] = 'publii-header-5';
    this.shortcuts['######'] = 'publii-header-6';
    this.shortcuts['*'] = 'publii-list';
    this.shortcuts['>'] = 'publii-quote';
    this.shortcuts['```'] = 'publii-code';
  }

  checkContentForShortcuts (text) {
    if (text !== '' && text.length < 24 && this.shortcuts[text.trim()]) {
      return this.shortcuts[text.trim()];
    }

    return 'publii-paragraph';
  }

  add (shortcut, componentName) {
    if (!this.shortcuts[shortcut]) {
      this.shortcuts[shortcut] = componentName;
    } else {
      console.warn('The following shortcut is already defined: ' + shortcut + ' for the following block: ' + this.shortcuts[shortcut]);
    }
  }
};
