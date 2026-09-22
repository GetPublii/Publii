<template>
  <div :class="{ 'is-empty': isEmpty }">
    <prism-editor
      :class="{ 'publii-block-code': true }"
      ref="block"
      @focus="updateCurrentBlockID"
      @keyup="handleKeyboard($event); debouncedSave()"
      :code="content"
      :emitEvents="true"
      v-model="content"
      :lineNumbers="true"
      :language="config.language || 'none'">
    </prism-editor>

    <top-menu
      ref="top-menu"
      :conversions="conversions"
      :config="topMenuConfig"
      :advancedConfig="configForm" />
  </div>
</template>

<script>
import codeLanguages from '../../../../../../shared/code-languages';
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
          id: 'code-language-' + this.id,
          label: this.$t('langs.language'),
          configKey: 'language',
          cssClasses: 'code-language-select',
          clearable: false,
          allowEmpty: false,
          customLabel: this.getLanguageLabel,
          internalSearch: false,
          onSearchChange: this.filterLanguages,
          showSelectedIcon: true,
          optionHeight: 36,
          searchable: true,
          options: []
        }
      ]
    };
  },
  computed: {
    availableLanguages () {
      return codeLanguages.map(language => language.value === 'markup' ? 'xml' : language.value);
    }
  },
  watch: {
    'config.language': function (newValue) {
      if (!newValue) {
        this.config.language = 'none';
        return;
      }

      localStorage.setItem('block-editor-last-selected-language', newValue);
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
    getLanguageLabel (language) {
      if (language === 'none') {
        return this.$t('editor.blocks.code.plainText');
      }

      const value = language === 'xml' ? 'markup' : language;
      const definition = codeLanguages.find(option => option.value === value);
      return definition ? definition.text : language || '';
    },
    filterLanguages (search) {
      const query = (search || '').trim().toLowerCase();

      this.topMenuConfig[0].options = this.availableLanguages.filter(language => {
        const value = language === 'xml' ? 'markup' : language;
        const definition = codeLanguages.find(option => option.value === value);
        const terms = [language, value, definition.text, this.getLanguageLabel(language)];
        return terms.some(term => term.toLowerCase().includes(query));
      });
    },
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
        value = 'none';
      }

      return value === 'xml' || codeLanguages.some(language => language.value === value) ? value : 'none';
    }
  }
}
</script>

<style>

.wrapper-ui-top-menu .multiselect.code-language-select {
    flex: 0 0 240px;
    width: 240px;

    &.multiselect--active .multiselect__tags {
        border-color: var(--input-border-focus);
        box-shadow: var(--input-shadow-focus);
    }

    .multiselect__element .multiselect__option {
        white-space: nowrap;
    }

    .top-menu-select-option {
        align-items: center;
        display: flex;
        gap: var(--space-2);
        justify-content: space-between;
        min-height: 20px;
    }

    .top-menu-select-check {
        color: var(--text-primary-color);
        flex: 0 0 16px;
        height: 16px;
        width: 16px;
    }
}

.publii-block-code {
    border-radius: calc(var(--radius-base) * 1.5);
    background: var(--pre-bg);
    border-radius: var(--radius-base);
    outline: none;
    width: 100%;

    &:empty {
        &:before {
            content: attr(data-translation);
            color: var(--color-text-muted);
        }
    }

    & > .prism-editor__line-numbers {
        background: var(--pre-bg) !important;
        display: block;
    }

    & > pre {
        background: var(--pre-bg) !important;
        display: block;

        code {
            background: transparent !important;
            padding: 0 !important;
        }
    }
}

.publii-block-code-lang {
    position: absolute;
    right: 40px;
    top: 1.3714em;

    .multiselect__content {
        margin: 0 !important;
        padding: 0 !important;
    }

    .multiselect__element {
        padding: 0 !important;
    }

    .multiselect__option:after {
        display: none;
    }
}

</style>
