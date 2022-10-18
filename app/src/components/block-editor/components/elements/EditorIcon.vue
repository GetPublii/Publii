<template>
  <svg
    :width="width"
    :height="height">
    <use :xlink:href="iconPath" />
  </svg>
</template>

<script>
export default {
  name: 'editor-icon',
  props: {
    'name': {
      default: '',
      type: String
    },
    'customWidth': {
      default: '',
      type: [String, Number]
    },
    'customHeight': {
      default: '',
      type: [String, Number]
    }
  },
  computed: {
    width () {
      if (this.customWidth !== '') {
        return this.customWidth;
      }

      switch (this.name) {
        case 'add': return 12;
        case 'headings': return 9;
        case 'image': return 16;
        case 'gallery': return 26;
        case 'unordered-list': return 16;
        case 'quote': return 13;
        case 'code': return 14;
        case 'table': return 18;
        case 'html': return 16;
        case 'separator': return 16;
        case 'readmore': return 16;
        case 'video': return 18;
        case 'toc': return 16;
        case 'menu': return 15;
        case 'tab': return 9;
        case 'bold': return 11;
        case 'italic': return 10;
        case 'underline': return 10;
        case 'strikethrough': return 12;
        case 'link': return 13;
        case 'unlink': return 15;
        case 'marker': return 16;
        case 'align-left': return 14;
        case 'align-right': return 14;
        case 'align-center': return 14;
        case 'paragraph': return 14;
        case 'h1': return 16;
        case 'h2': return 19;
        case 'h3': return 20;
        case 'h4': return 20;
        case 'h5': return 18;
        case 'h6': return 18;
        case 'ordered-list': return 17;
        case 'nesting': return 17;
        case 'flattening': return 17;
        case 'long-line': return 20;
        case 'shorter-line': return 16;
        case 'short-line': return 8;
        case 'dotted-line': return 16;
        case 'dot': return 3;
        case 'preview': return 19;
        case 'left': return 14;
        case 'center': return 14;
        case 'right': return 14;
        case 'wide': return 14;
        case 'full': return 14;
        case 'enter': return 11;
        case 'down': return 10;
        case 'up': return 10;
        case 'trash': return 12;
        case 'open-trash': return 12;
        case 'gear': return 13;
        case 'duplicate': return 14;
        case 'cancel': return 13;
        case 'save': return 19;
        case 'undo': return 13;
        case 'eraser': return 14;
      }

      return '16';
    },
    height () {
      if (this.customHeight !== '') {
        return this.customHeight;
      }

      switch (this.name) {
        case 'add': return 12;
        case 'headings': return 13;
        case 'image': return 12;
        case 'gallery': return 14;
        case 'unordered-list': return 12;
        case 'quote': return 11;
        case 'code': return 12;
        case 'table': return 14;
        case 'html': return 10;
        case 'separator': return 2;
        case 'readmore': return 12;
        case 'video': return 14;
        case 'toc': return 12;
        case 'menu': return 3;
        case 'tab': return 5;
        case 'bold': return 13;
        case 'italic': return 13;
        case 'underline': return 14;
        case 'strikethrough': return 14;
        case 'link': return 13;
        case 'unlink': return 15;
        case 'marker': return 13;
        case 'align-left': return 12;
        case 'align-right': return 12;
        case 'align-center': return 12;
        case 'paragraph': return 14;
        case 'h1': return 12;
        case 'h2': return 12;
        case 'h3': return 12;
        case 'h4': return 12;
        case 'h5': return 12;
        case 'h6': return 12;
        case 'ordered-list': return 14;
        case 'nesting': return 12;
        case 'flattening': return 12;
        case 'long-line': return 2;
        case 'shorter-line': return 2;
        case 'short-line': return 2;
        case 'dotted-line': return 16;
        case 'dot': return 3;
        case 'preview': return 12;
        case 'left': return 13;
        case 'center': return 13;
        case 'right': return 13;
        case 'wide': return 13;
        case 'full': return 13;
        case 'enter': return 13;
        case 'down': return 6;
        case 'up': return 6;
        case 'trash': return 12;
        case 'open-trash': return 14;
        case 'gear': return 13;
        case 'duplicate': return 14;
        case 'cancel': return 13;
        case 'save': return 15;
        case 'undo': return 16;
        case 'eraser': return 14;
      }

      return '16';
    },
    iconPath () {
        return `../src/assets/svg/svg-map-block-editor.svg#${this.name}`;
    }
  }
}
</script>
