<template>
  <div
    @click.stop="hide()"
    :class="{ 'block-advanced-config-overlay': true, 'is-visible': isVisible }">
    <div
      @click.prevent.stop
      class="block-advanced-config"
      ref="form">
      <div
        v-for="(field, index) of configForm"
        :key="'field-' + index"
        class="block-advanced-config-field">
        <label
          :for="'advanced-config-field-' + index"
          :title="field.tooltip !== '' ? $t(field.tooltip) : ''">
          {{ $t(field.label) }}
          <span
            v-if="field.tooltip !== ''"
            class="block-advanced-config-field-help">?</span>
        </label>
        <input
          v-if="field.type === 'text'"
          :id="'advanced-config-field-' + index"
          :key="'field-input-' + index"
          type="text"
          :disabled="getDisabledState(field.disabled)"
          :spellcheck="field.spellcheck || false"
          v-model="config[field.name]" />
        <switcher
          v-if="field.type === 'checkbox'"
          :id="'advanced-config-field-' + index"
          :key="'field-input-' + index"
          :disabled="getDisabledState(field.disabled)"
          v-model="config[field.name]" />
        <select
          v-if="field.type === 'select'"
          :id="'advanced-config-field-' + index"
          :key="'field-input-' + index"
          blockData.config.advanced.style
          v-model="config[field.name]">
          <option value="">{{ $t('editor.defaultSelect') }}</option>
          <option
            v-for="(option, index) of field.values"
            :key="'option-' + index"
            :value="option.value">
            {{ $t(option.label) }}
          </option>
        </select>
      </div>

      <div class="block-advanced-config-buttons">
        <button @click="save()">
          {{ $t('ui.save') }}
        </button>
        <button @click="hide()" class="outline">
          {{ $t('ui.cancel') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import Switcher from './elements/Switcher.vue';

export default {
  name: 'block-advanced-config',
  components: {
    'switcher': Switcher
  },
  data () {
    return {
      isVisible: false,
      currentBlockID: '',
      config: {},
      configForm: []
    };
  },
  mounted () {
    this.$bus.$on('block-editor-show-advanced-config', this.show);
  },
  methods: {
    show (blockID, config, configForm) {
      this.isVisible = true;
      this.currentBlockID = blockID;
      this.config = JSON.parse(JSON.stringify(config));
      this.configForm = configForm;

      setTimeout(() => {
        this.$refs['form'].querySelector('.block-advanced-config-field').querySelector('input').focus();
      }, 100);
    },
    hide () {
      this.isVisible = false;

      setTimeout(() => {
        this.currentBlockID = '';
        this.config = {};
        this.configForm = [];
      }, 500);
    },
    save () {
      this.$bus.$emit('block-editor-save-advanced-config', this.currentBlockID, this.config);
      this.hide();
    },
    getDisabledState (fieldDisabledRules) {
      if (typeof fieldDisabledRules === 'undefined') {
        return false;
      }

      for (let rule of fieldDisabledRules) {
        if (this.config[rule.field] === rule.value) {
          return true;
        }
      }

      return false;
    }
  },
  beforeDestroy () {
    this.$bus.$off('block-editor-show-advanced-config', this.show);
  }
};
</script>

<style lang="scss">
@import '../../../scss/variables.scss';

.block-advanced-config {
   background: var(--popup-bg);
  border-radius: 6px;
  box-shadow: 0 0 32px var(--shadow);
  padding: 4rem;
  transform: scale(.5);
  transition: all .24s cubic-bezier(0, 0, 0.25, 0.99);
  user-select: none;
  width: 580px;

  &-overlay {
    align-items: center;
    background: var(--overlay);
    display: flex;
    height: 100%;
    justify-content: center;
    left: 0;
    opacity: 0;
    pointer-events: none;
    position: fixed;
    top: 0;
    transition: all .3s ease-out;
    width: 100%;
    z-index: 999991;

    &.is-visible {
      opacity: 1;
      pointer-events: auto;

      .block-advanced-config {
        transform: scale(1);
      }
    }
  }

  &-field {
    margin: 0 0 16px 0;

    &-help {
      align-items: center;
      background: var(--color-primary);
      border-radius: 50%;
      color: var(--white);
      cursor: help;
      display: inline-flex;
      font-size: 10px;
      font-weight: var(--font-weight-bold);
      height: 14px;
      justify-content: center;
      position: relative;
      top: -1px;
      width: 14px;
    }

    label {
      color: var(--label-color);
      display: block;
      font-size: 14px;
      padding-bottom: 8px;
    }

    input,
    select {  
      display: block;
      width: 100%;

      &[disabled] {
        opacity: .5;
        pointer-events: none;
      }
    }

    select {
      appearance: none;
      max-width: 100%;
      margin: 0;
    }
  }

  &-buttons {
    display: flex;
    margin: 3rem -4rem -4rem;

    button {
      background: var(--button-bg);
      border: none;
      box-shadow: none;
      border-bottom-left-radius: 6px;
      border-top: 1px solid var(--button-bg);
      color: var(--white);
      cursor: pointer;
      font-size: 15px;
      font-weight: var(--font-weight-semibold);
      line-height: 1;
      width: 50%;
      padding: 18px;
      transition: all .25s ease-out;

      &:hover {
        background: var(--button-bg-hover);
        border-color: var(--button-bg-hover);
      }

      &.outline {
        background: var(--popup-btn-cancel-bg);
        border: none;
        border-top: 1px solid var(--input-border-color);
        border-bottom-right-radius: 6px;
        color: var(--popup-btn-cancel-color);

        &:hover {
           background: var(--popup-btn-cancel-bg-hover);
           color: var(--popup-btn-cancel-hover-color);
        }
      }
    }
  }
}
</style>
