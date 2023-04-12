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
        case 'add': return 18;
        case 'headings': return 18;
        case 'image': return 18;
        case 'gallery': return 26;
        case 'unordered-list': return 18;
        case 'quote': return 16;
        case 'code': return 18;
        case 'table': return 18;
        case 'html': return 18;
        case 'separator': return 18;
        case 'readmore': return 18;
        case 'video': return 18;
        case 'toc': return 18;
        case 'menu': return 15;
        case 'tab': return 9;
        case 'bold': return 18;
        case 'italic': return 18;
        case 'underline': return 18;
        case 'strikethrough': return 18;
        case 'link': return 18;
        case 'unlink': return 18;
        case 'marker': return 18;
        case 'align-left': return 18;
        case 'align-right': return 18;
        case 'align-center': return 18;
        case 'paragraph': return 18;
        case 'h1': return 20;
        case 'h2': return 20;
        case 'h3': return 20;
        case 'h4': return 20;
        case 'h5': return 20;
        case 'h6': return 20;
        case 'ordered-list': return 18;
        case 'nesting': return 18;
        case 'flattening': return 18;
        case 'long-line': return 18;
        case 'dotted-line': return 18;
        case 'dot': return 18;
        case 'preview': return 19;
        case 'left': return 18;
        case 'center': return 18;
        case 'right': return 18;
        case 'wide': return 18;
        case 'full': return 18;
        case 'enter': return 11;
        case 'down': return 18;
        case 'up': return 18;
        case 'trash': return 18;
        case 'open-trash': return 18;
        case 'gear': return 18;
        case 'duplicate': return 18;
        case 'eraser': return 18;
        case 'open-bulk-edition': return 18;
      }

      return '16';
    },
    height () {
      if (this.customHeight !== '') {
        return this.customHeight;
      }

      switch (this.name) {
        case 'add': return 18;
        case 'headings': return 18;
        case 'image': return 18;
        case 'gallery': return 18;
        case 'unordered-list': return 18;
        case 'quote': return 16;
        case 'code': return 18;
        case 'table': return 14;
        case 'html': return 18;
        case 'separator': return 18;
        case 'readmore': return 18;
        case 'video': return 18;
        case 'toc': return 18;
        case 'menu': return 3;
        case 'tab': return 5;
        case 'bold': return 18;
        case 'italic': return 18;
        case 'underline': return 18;
        case 'strikethrough': return 18;
        case 'link': return 18;
        case 'unlink': return 18;
        case 'marker': return 18;
        case 'align-left': return 18;
        case 'align-right': return 18;
        case 'align-center': return 18;
        case 'paragraph': return 18;
        case 'h1': return 20;
        case 'h2': return 20;
        case 'h3': return 20;
        case 'h4': return 20;
        case 'h5': return 20;
        case 'h6': return 20;
        case 'ordered-list': return 18;
        case 'nesting': return 18;
        case 'flattening': return 18;
        case 'long-line': return 18;
        case 'dotted-line': return 18;
        case 'dot': return 18;
        case 'preview': return 12;
        case 'left': return 18;
        case 'center': return 18;
        case 'right': return 18;
        case 'wide': return 18;
        case 'full': return 18;
        case 'enter': return 13;
        case 'down': return 18;
        case 'up': return 18;
        case 'trash': return 18;
        case 'open-trash': return 18;
        case 'gear': return 18;
        case 'duplicate': return 18;
        case 'eraser': return 18;
        case 'open-bulk-edition': return 18;
      }

      return '16';
    },
    iconPath () {
        return `../src/assets/svg/svg-map-block-editor.svg#${this.name}`;
    }
  }
}
</script>
