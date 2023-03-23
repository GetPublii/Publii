<template>
  <div
    class="wrapper-ui-top-menu"
    v-if="isVisible"
    @click="resetDeleteConfirmation">
    <span
      v-if="conversions.length"
      class="wrapper-ui-top-menu-title wrapper-ui-top-menu-conversions">
      {{ $t('editor.convertTo') }}
      <span
        v-for="(conversion, index) of conversions"
        :key="'conversion-' + index"
        class="wrapper-ui-top-menu-conversion has-tooltip"
        @click="makeConversion(conversion.type, conversion.convert); resetDeleteConfirmation();">
        <icon :name="conversion.icon" />
        <span class="ui-tooltip">
          {{ $t(conversion.name) }}
        </span>
      </span>
    </span>
    <div
      @click.stop
      class="wrapper-ui-top-menu-options">
      <template v-for="(uiElement, index) of filteredConfig">
        <template v-if="!uiElement.type || uiElement.type === 'button'">
          <button
            :key="'top-menu-element-' + index"
            :class="{ 'wrapper-ui-top-menu-button': true, 'is-active': uiElement.activeState.bind($parent)(), 'has-tooltip': true }"
            tabindex="-1"
            @click="uiElement.onClick.bind($parent)(); resetDeleteConfirmation();">
            <icon :name="uiElement.icon" />
            <span class="ui-tooltip has-bigger-space">
              {{ uiElement.tooltip }}
            </span>
          </button>
        </template>
        <template v-else-if="uiElement.type === 'select'">
          <label :key="'top-menu-element-label-' + index">
            {{ uiElement.label }}
          </label>
          <vue-select
            :key="'top-menu-element-' + index"
            :class="uiElement.cssClasses"
            :options="uiElement.options"
            :clearable="uiElement.clearable"
            :searchable="uiElement.searchable"
            v-model="$parent.config[uiElement.configKey]" />
        </template>
      </template>
      <button
        v-if="$parent.$parent.blockType !== 'publii-readmore'"
        :class="{ 'wrapper-ui-top-menu-button': true, 'is-active': settingsAreChanged, 'has-tooltip': true }"
        tabindex="-1"
        @click.stop="showAdvancedConfig(); resetDeleteConfirmation();">
        <icon name="gear" />
        <span class="ui-tooltip has-bigger-space">
          {{ $t('settings.advancedOptions') }}
        </span>
      </button>
      <button
        v-if="!confirmDelete"
        class="wrapper-ui-top-menu-button has-tooltip"
        tabindex="-1"
        @click.stop="deleteBlock">
        <icon name="trash" />
        <span class="ui-tooltip has-bigger-space">
          {{ $t('editor.deleteBlock') }}
        </span>
      </button>
      <button
        v-if="confirmDelete"
        class="wrapper-ui-top-menu-button top-menu-button-trash is-active has-tooltip"
        tabindex="-1"
        @click.stop="deleteBlock">
        <icon name="open-trash" />
        <span class="ui-tooltip has-bigger-space">
          {{ $t('editor.clickToConfirm') }}
        </span>
      </button>
    </div>
  </div>
</template>

<script>
import EditorIcon from './../elements/EditorIcon.vue';
import vSelect from 'vue-multiselect/dist/vue-multiselect.min.js';

export default {
  name: 'top-menu-ui',
  props: {
    'config': {
      type: Array,
      default: () => ([])
    },
    'advancedConfig': {
      type: [Array, Boolean],
      default: false
    },
    'conversions': {
      type: Array,
      default: () => ([])
    }
  },
  components: {
    'icon': EditorIcon,
    'vue-select': vSelect
  },
  computed: {
    filteredConfig () {
      return this.config.filter(uiElement => typeof uiElement.isVisible === 'undefined' || uiElement.isVisible());
    },
    isVisible () {
      return this.$parent.$parent.uiOpened;
    },
    settingsAreChanged () {
      if (!this.advancedConfig) {
        return false;
      }

      let settingsKeys = Object.keys(this.$parent.config.advanced);

      for (let i = 0; i < settingsKeys.length; i++) {
        let key = settingsKeys[i];

        if (this.advancedConfig.length && this.settingIsDisabled(key)) {
          return false;
        }

        if (this.$parent.config.advanced[key] !== this.getSettingDefaultValue(key)) {
          return true;
        }
      }

      return false;
    }
  },
  watch: {
    isVisible (newValue) {
      if (newValue) {
        this.confirmDelete = false;
      }
    }
  },
  data () {
    return {
      confirmDelete: false
    };
  },
  methods: {
    makeConversion (outputType, convertCallback) {
      let transformedData = convertCallback(this.$parent.config, this.$parent.content, this.$parent.editor, this.$parent.$refs['block']);
      this.$bus.$emit('block-editor-convert-block', this.$parent.id, outputType, transformedData);
    },
    deleteBlock () {
      if (!this.confirmDelete) {
        this.confirmDelete = true;
      } else {
        this.$bus.$emit('block-editor-delete-block', this.$parent.id);
      }
    },
    showAdvancedConfig () {
      this.$bus.$emit('block-editor-trigger-advanced-config', this.$parent.id);
    },
    resetDeleteConfirmation () {
      this.confirmDelete = false;
    },
    settingIsDisabled (fieldName) {
      let fieldDisabledRules = this.getSetting(fieldName).disabled;

      if (typeof fieldDisabledRules === 'undefined') {
        return false;
      }

      for (let rule of fieldDisabledRules) {
        if (this.$parent.config.advanced[rule.field] === rule.value) {
          return true;
        }
      }

      return false;
    },
    getSetting (fieldName) {
      let index = this.advancedConfig.findIndex(field => field.name === fieldName);
      return this.advancedConfig[index];
    },
    getSettingDefaultValue (fieldName) {
      let index = this.advancedConfig.findIndex(field => field.name === fieldName);
      return this.advancedConfig[index].defaultValue;
    }
  }
}
</script>

<style lang="scss">
@import '../../../../scss/variables.scss';

.wrapper-ui-top-menu {
  font-family: var(--font-base);
  
  svg {
    color: var(--icon-tertiary-color);
  }

  &-conversions {
    align-items: center;
    display: flex;
  }

  &-conversion {
    display: inline-flex;
    justify-content: center;
    padding: 0;
    position: relative;
    width: 38px;

    // hover effect
    &::before {
       content: "";
       background: var(--gray-6);
       border-radius: 3px;
       display: block;
       left: 50%;
       opacity: 0;
       position: absolute;
       height: 34px;
       top: 50%;
       transition: all .15s cubic-bezier(.4,0,.2,1);
       transform: scale(.5) translate(-50%, -50%);
       transform-origin: left top;
       width: 34px;
       z-index: -1;
    }

    &:hover {
      cursor: pointer;

      &::before {
         opacity: 1;
         transform: scale(1) translate(-50%, -50%);
      }

      & > svg {
         color: var(--icon-tertiary-color);
      }
    }
  }

  &-options {
    align-items: center;
    display: flex;

    label {
      font-size: 15px;
      padding-right: 10px;
    }
  }

  .top-menu-button-trash {
      &::before {
         background: var(--warning);
      }
         svg {
            color: var(--white);
      }
  }

  .multiselect {
    font-size: 13px;
    min-height: auto;
    margin-left: auto;
    margin-right: 6px;
    position: relative;
    top: 0;
    width: auto;

    &__tags {
      background: var(--bg-secondary);
      border: 2px solid var(--input-border-color);
      color: var(--text-primary-color);
      height: 34px;
      min-height: 100%;
      padding: 4px 40px 5px 14px;
      min-width: 34px;
    }

    &__placeholder {
      color: var(--text-light-color);
      display: block;
      font-size: $app-font-base;
      margin-bottom: 0;
      padding-top: 1px;
    }

    &__single {
      background: transparent;
      color: var(--text-primary-color);
      min-height: 20px;
      line-height: 20px;
      margin-bottom: 0;
      padding: 1px 0 0 0;
    }

    &__select {
      height: 28px;
      top: 3px;
      width: 34px;

      &::before {
          border-color: var(--gray-3) transparent transparent;
      }
    }

    &__content {
      margin-left: 0!important;
    }

    &__element {
      padding-left: 0!important;
    }

    &__content-wrapper {
      background: var(--bg-secondary);
      border: 2px solid var(--input-border-color);
      border-top: none;
      color: var(--text-primary-color);
      margin-top: -1px;

      & > ul {
        padding: 0 !important;
      }
    }

    &__option {
        font-size: 14px;
        padding: 8px 15px;
        min-height: 30px;

      &--highlight {
        background: var(--input-bg-light);
        color: var(--text-primary-color);

        &:after {
          display: none;
        }
      }

      &.multiselect__option--selected {
        background: var(--gray-1);
        color: var(--text-primary-color);

        &:after {
          display: none;
        }
      }
    }

    &__input {
      background: none !important;
      color: var(--text-primary-color);
      font-size: 14px;
      height: 21px;

      &::placeholder {
        color: var(--gray-4);
      }
    }

    &.is-narrow {
      .multiselect__select {
        display: none;
      }

      .multiselect__tags {
        padding: 4px 0 6px 0;
        text-align: center;
      }

      .multiselect__option {
        min-height: 30px;
        padding: 8px 0;
        text-align: center;
      }
    }
  }
}

.ui-tooltip {
  background: var(--input-bg-light);
  border-radius: var(--border-radius);
  box-shadow: 0 2px 6px rgba(0, 0, 0, .16);
  color: var(--text-primary-color);
  display: flex;
  flex-wrap: wrap;
  font-family: var(--font-base);
  font-size: 13px;
  font-weight: normal;
  justify-content: center;
  height: auto;
  left: 50%;
  min-width: 64px;
  opacity: 0;
  padding: 5px 8px;
  pointer-events: none;
  position: absolute;
  text-transform: none;
  top: 34px;
  white-space: nowrap;
  z-index: 10;

  &.has-bigger-space {
    top: 42px;
  }

  &:after {
    border: 6px solid var(--input-bg-light);
    border-left-color: transparent;
    border-right-color: transparent;
    border-top-color: transparent;
    content: "";
    filter: drop-shadow(0 -1px 1px rgba(0, 0, 0, .08));
    height: 14px;
    left: 50%;
    position: absolute;
    top: -10px;
    transform: scale(.5) translateX(-50%);
    transform-origin: center center;
    width: 14px;
  }
}

.has-tooltip {
  position: relative;

  &:hover {
    .ui-tooltip {
      opacity: 1;
      transform: scale(1) translateX(-50%);
    }
  }
}
</style>
