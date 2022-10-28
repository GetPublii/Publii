<template>
  <div :class="{ 'is-empty': isEmpty }">
    <div
      class="publii-block-separator"
      contenteditable="true"
      @keyup="getFocusFromTab($event); handleCaret($event)"
      @paste="pastePlainText"
      ref="block">
      <hr :class="config.type" />
    </div>

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
import TopMenuUI from './../../helpers/TopMenuUI.vue';

export default {
  name: 'Separator',
  mixins: [
    Block
  ],
  components: {
    'top-menu': TopMenuUI
  },
  data () {
    return {
      config: {
        type: 'dots',
        advanced: {
          cssClasses: this.getAdvancedConfigDefaultValue('cssClasses'),
          id: this.getAdvancedConfigDefaultValue('id')
        }
      },
      content: false,
      topMenuConfig: [
        {
          activeState: function () { return this.config.type === 'long-line'; },
          onClick: function () { this.setType('long-line'); },
          icon: 'long-line',
          tooltip: this.$t('editor.wideLine')
        },
        {
          activeState: function () { return this.config.type === 'dots'; },
          onClick: function () { this.setType('dots'); },
          icon: 'dotted-line',
          tooltip: this.$t('editor.dots')
        },
        {
          activeState: function () { return this.config.type === 'dot'; },
          onClick: function () { this.setType('dot'); },
          icon: 'dot',
          tooltip: this.$t('editor.dot')
        }
      ],
      conversions: AvailableConversions
    };
  },
  beforeCreate () {
    this.configForm = ConfigForm;
  },
  mounted () {
    this.$refs['block'].addEventListener('keydown', this.handleKeyboard);
  },
  methods: {
    handleKeyboard (e) {
      if (e.code === 'Enter' && !e.isComposing) {
        this.$bus.$emit('block-editor-add-block', 'publii-paragraph', this.id);
        e.returnValue = false;
      }

      if (e.code === 'Backspace') {
        this.$bus.$emit('block-editor-delete-block', this.id);
        e.returnValue = false;
      }

      if (e.code !== 'Tab') {
        e.returnValue = false;
      }
    },
    setType (type) {
      this.config.type = type;
    },
    save () {
      this.$bus.$emit('block-editor-save-block', {
        id: this.id,
        config: JSON.parse(JSON.stringify(this.config)),
        content: this.content
      });
    }
  },
  beforeDestroy () {
    this.$refs['block'].removeEventListener('keydown', this.handleKeyboard);
  }
}
</script>

<style lang="scss">
@import '../../../../../scss/vendor/modularscale';
@import '../../../../../scss/variables.scss';
@import '../../../../../scss/mixins.scss';

.publii-block-separator {
  caret-color: transparent;
  margin: baseline(2,em) 0;
  outline: none;
  width: 100%;

  hr {
    border: none;
    height: auto;
    line-height: 100%;
    position: relative;
  }

  hr.long-line {

      &::after {
          border-bottom: 1px solid var(--input-border-color);
          content: " ";
          display: block;
          margin-top: -1px;
          position: relative;
          transform: translateY(-50%);
          width: 100%;
          white-space: pre;
      }
  }

  hr.medium {
    width: 50%;
  }

  hr.short {
    width: 25%;
  }

  hr.dots,
  hr.dot {
    margin: 0 auto;

    &:before {
      content: "* * *";
      display: block;
      text-align: center;
      transform: scale(1.5);
    }
  }

  hr.dot {
    &:before {
      content: "*";
    }
  }
}
</style>
