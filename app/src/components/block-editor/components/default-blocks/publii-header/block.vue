<template>
  <div>
    <component
      :is="'h' + config.headingLevel"
      contenteditable="true"
      @keyup="getFocusFromTab($event); handleCaret($event); debouncedSave()"
      @keydown="handleKeyboard"
      @focus="updateCurrentBlockID"
      @paste="pastePlainText"
      ref="block"
      :style="'text-align: ' + config.textAlign + ';'"
      :class="{ 'publii-block-header': true, 'is-link': config.link.url !== '' }"
      :title="config.link.url !== '' ? config.link.url : ''"
      v-initial-html="content"
      :data-translation="$t('editor.addHeading')" />

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
import LinkConfig from './../../mixins/LinkConfig.vue';
import TopMenuUI from './../../helpers/TopMenuUI.vue';

if (!mainProcessAPI) {
  mainProcessAPI = {
    slug: function (text) {
      return text.toLowerCase().replace(/[^a-zA-Z0-9\s]/gmi, '').replace(/\s/gmi, '-').trim();
    }
  };
}

export default {
  name: 'Header',
  mixins: [
    Block,
    ContentEditableImprovements,
    LinkConfig
  ],
  components: {
    'top-menu': TopMenuUI
  },
  data () {
    return {
      config: {
        headingLevel: 2,
        textAlign: 'left',
        link: {
          url: '',
          noFollow: false,
          targetBlank: false,
          sponsored: false,
          ugc: false
        },
        advanced: {
          cssClasses: this.getAdvancedConfigDefaultValue('cssClasses'),
          customId: this.getAdvancedConfigDefaultValue('customId'),
          id: this.getAdvancedConfigDefaultValue('id')
        }
      },
      content: '',
      conversions: AvailableConversions,
      topMenuConfig: [
        {
          activeState: function () { return this.config.headingLevel === 1; },
          onClick: function () { this.setHeadingLevel(1); },
          icon: 'h1',
          tooltip: this.$t('editor.heading1')
        },
        {
          activeState: function () { return this.config.headingLevel === 2; },
          onClick: function () { this.setHeadingLevel(2); },
          icon: 'h2',
          tooltip: this.$t('editor.heading2')
        },
        {
          activeState: function () { return this.config.headingLevel === 3; },
          onClick: function () { this.setHeadingLevel(3); },
          icon: 'h3',
          tooltip: this.$t('editor.heading3')
        },
        {
          activeState: function () { return this.config.headingLevel === 4; },
          onClick: function () { this.setHeadingLevel(4); },
          icon: 'h4',
          tooltip: this.$t('editor.heading4')
        },
        {
          activeState: function () { return this.config.headingLevel === 5; },
          onClick: function () { this.setHeadingLevel(5); },
          icon: 'h5',
          tooltip: this.$t('editor.heading5')
        },
        {
          activeState: function () { return this.config.headingLevel === 6; },
          onClick: function () { this.setHeadingLevel(6); },
          icon: 'h6',
          tooltip: this.$t('editor.heading6')
        },
        {
          activeState: function () { return this.config.textAlign === 'left'; },
          onClick: function () { this.alignText('left'); },
          icon: 'align-left',
          tooltip: this.$t('editor.alignTextLeft')
        },
        {
          activeState: function () { return this.config.textAlign === 'center'; },
          onClick: function () { this.alignText('center'); },
          icon: 'align-center',
          tooltip: this.$t('editor.alignTextCenter')
        },
        {
          activeState: function () { return this.config.textAlign === 'right'; },
          onClick: function () { this.alignText('right'); },
          icon: 'align-right',
          tooltip: this.$t('editor.alignTextRight')
        },
        {
          activeState: () => this.config.link.url !== '',
          onClick: this.showLinkPopupWithoutHighlight,
          icon: 'link',
          tooltip: this.$t('link.addLink')
        },
        {
          activeState: () => false,
          onClick: this.removeLink,
          isVisible: () => this.config.link.url !== '',
          icon: 'unlink',
          tooltip: this.$t('link.removeLink')
        }
      ]
    };
  },
  beforeCreate () {
    this.configForm = ConfigForm;
  },
  beforeMount () {
    this.content = this.inputContent;
  },
  mounted () {
    this.$bus.$on('block-editor-save-link-popup', this.setLink);
  },
  methods: {
    handleKeyboard (e) {
      if (e.code === 'Enter' && !e.isComposing && e.shiftKey === false) {
        document.execCommand('insertHTML', false, '<line-separator />');

        if (this.$refs['block'].innerHTML.substr(-33) === '<line-separator></line-separator>') {
          this.$bus.$emit('block-editor-add-block', 'publii-paragraph', this.id);
          this.$refs['block'].innerHTML = this.$refs['block'].innerHTML.replace('<line-separator></line-separator>', '');
        } else {
          let separatedContent = this.$refs['block'].innerHTML.split('<line-separator></line-separator>');
          let firstPart = separatedContent[0];
          let secondPart = separatedContent[1];

          if (secondPart.substr(0, 4) === '<br>') {
            secondPart = secondPart.substr(4);
          }

          this.$refs['block'].innerHTML = firstPart;
          this.$bus.$emit('block-editor-add-block', 'publii-paragraph', this.id, secondPart);
        }

        e.returnValue = false;
      }

      if (e.code === 'Backspace' && this.$refs['block'].innerHTML === '') {
        this.$bus.$emit('block-editor-delete-block', this.id);
        e.returnValue = false;
      }
    },
    alignText (position) {
      this.config.textAlign = position;
    },
    setHeadingLevel (level) {
      this.save();
      this.config.headingLevel = level;
      this.save();
    },
    async save () {
      if (!this.$refs['block'].innerHTML) {
        return;
      }

      this.content = this.$refs['block'].innerHTML.replace('<line-separator></line-separator>', '');

      if (!this.config.advanced.customId) {
        this.config.advanced.id = await mainProcessAPI.invoke('app-main-process-create-slug', this.content);
      }

      this.$bus.$emit('block-editor-save-block', {
        id: this.id,
        config: JSON.parse(JSON.stringify(this.config)),
        content: this.content
      });
    }
  },
  beforeDestroy () {
    this.$bus.$off('block-editor-save-link-popup', this.setLink);
  }
}
</script>

<style scoped lang="scss">
.publii-block-header {
  outline: none;
  width: 100%;

  &:empty {
    &:before {
      content: attr(data-translation);
      color: var(--gray-4);
    }
  }

  &.is-link {
    cursor: pointer;
    text-decoration: underline;
    text-decoration-color: rgba(var(--yellow), 1);  
    text-decoration-thickness: 3px;
  }
}
</style>
