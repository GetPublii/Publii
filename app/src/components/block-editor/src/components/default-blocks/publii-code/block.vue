<template>
  <div :class="{ 'is-empty': isEmpty }">
    <prism-editor
      :class="{ 'publii-block-code': true }"
      ref="block"
      @paste="pastePlainText"
      @focus="updateCurrentBlockID"
      @keyup="handleKeyboard($event); debouncedSave()"
      :code="content"
      :emitEvents="true"
      v-model="content"
      :lineNumbers="true"
      :language="config.language">
    </prism-editor>

    <top-menu
      ref="top-menu"
      :conversions="conversions"
      :config="topMenuConfig"
      :advancedConfig="configForm" />
  </div>
</template>

<script>
import AvailableConversions from './conversions.js';
import Block from './../../Block.vue';
import ConfigForm from './config-form.json';
import ContentEditableImprovements from './../../helpers/ContentEditableImprovements.vue';
import TopMenuUI from './../../helpers/TopMenuUI.vue';

export default {
  name: 'Code',
  mixins: [
    Block,
    ContentEditableImprovements
  ],
  components: {
    'top-menu': TopMenuUI
  },
  data () {
    return {
      config: {
        language: this.getLastSelectedLanguage(),
        advanced: {
          cssClasses: this.getAdvancedConfigDefaultValue('cssClasses'),
          id: this.getAdvancedConfigDefaultValue('id')
        }
      },
      content: '',
      conversions: AvailableConversions,
      lastSelectedLanguage: null,
      topMenuConfig: [
        {
          type: 'select',
          label: 'Language:',
          configKey: 'language',
          clearable: true,
          searchable: true,
          options: []
        }
      ]
    };
  },
  watch: {
    'config.language': function (newValue) {
      localStorage.setItem('block-editor-last-selected-language', newValue);
    }
  },
  computed: {
    availableLanguages () {
      return [
        'apacheconf',
        'aspnet',
        'bash',
        'basic',
        'batch',
        'c',
        'cpp',
        'csharp',
        'css',
        'dart',
        'docker',
        'elm',
        'git',
        'glsl',
        'go',
        'graphql',
        'haml',
        'handlebars',
        'haskell',
        'html',
        'http',
        'ini',
        'java',
        'javascript',
        'json',
        'jsonp',
        'jsx',
        'kotlin',
        'latex',
        'less',
        'lisp',
        'lua',
        'makefile',
        'markdown',
        'matlab',
        'nasm',
        'nginx',
        'objectivec',
        'pascal',
        'perl',
        'php',
        'pug',
        'python',
        'r',
        'regex',
        'ruby',
        'sass',
        'scss',
        'scala',
        'sql',
        'swift',
        'twig',
        'typescript',
        'vbnet',
        'visual-basic',
        'yaml'
      ]
    }
  },
  beforeCreate () {
    this.configForm = ConfigForm;
  },
  mounted () {
    this.content = this.inputContent;
    this.topMenuConfig[0].options = this.availableLanguages;
  },
  methods: {
    focus () {
      this.$refs['block'].$el.querySelector('pre').focus();
    },
    handleKeyboard (e) {
      if (e.code === 'Enter' && !e.isComposing && e.shiftKey === true) {
        this.$bus.$emit('block-editor-add-block', 'publii-paragraph', this.id);
        e.returnValue = false;
      }

      if (e.code === 'Tab' && e.shiftKey === false) {
        e.preventDefault();
        // eslint-disable-next-line
        document.execCommand('insertHTML', false, "  ");
        e.returnValue = false;
      }

      if (e.code === 'Backspace' && this.$refs['block'].code === '') {
        this.$bus.$emit('block-editor-delete-block', this.id);
        e.returnValue = false;
      }
    },
    save () {
      this.content = this.$refs['block'].code;

      this.$bus.$emit('block-editor-save-block', {
        id: this.id,
        config: JSON.parse(JSON.stringify(this.config)),
        content: this.content
      });
    },
    getLastSelectedLanguage () {
      let value = localStorage.getItem('block-editor-last-selected-language');

      if (value !== null) {
        value = value.replace(/[^a-z0-9-]/gmi, '');
      } else {
        value = 'html';
      }

      return value;
    }
  }
}
</script>

<style lang="scss">
@import '../../../vendors/modularscale';
@import '../../../assets/functions.scss';
@import '../../../assets/variables.scss';
@import '../../../assets/mixins.scss';

.publii-block-code {
    border-radius: var(--eb-border-radius);
    background: var(--eb-gray-8);
    border-radius: var(--eb-border-radius);
    box-shadow: 2px 4px 26px var(--eb-shadow);
    outline: none;
    width: 100%;

    &:empty {
        &:before {
            content: 'Enter code';
            color: var(--eb-gray-4);
        }
    }

    & > .prism-editor__line-numbers {
        background: var(--eb-gray-8) !important;
        display: block;
    }

    & > pre {
        background: var(--eb-gray-8) !important;
        display: block;

        &:empty {
            &:before {
                content: 'Enter HTML code';
                color: var(--eb-gray-4);
            }
        }

        code {
            background: transparent !important;
            padding: 0 !important;
        }
    }

    &-lang {
        position: absolute;
        right: 40px;
        top: baseline(6);

        .multiselect__content {
            margin: 0 !important;
        }

        .multiselect__element {
            padding: 0 !important;
        }

        .multiselect__option:after {
            display: none;
        }
    }
}

</style>
