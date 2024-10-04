<template>
  <span
    :class="cssClasses"
    @click="toggle"></span>
</template>

<script>
export default {
  name: 'switcher',
  props: {
    value: {
      type: [Boolean, Number]
    },
    isMini: {
      default: false,
      type: Boolean
    },
    checked: {
      default: false,
      type: Boolean
    },
    onToggle: {
      default: () => false,
      type: Function
    },
    disabled: {
      default: false,
      type: Boolean
    },
    lowerZindex: {
      default: false,
      type: Boolean
    }
  },
  data () {
    return {
      isChecked: this.checked
    };
  },
  computed: {
    cssClasses () {
      return {
        'switcher': true,
        'is-checked': this.isChecked,
        'lower-zindex': this.lowerZindex,
        'is-disabled': this.disabled,
        'is-mini': this.isMini
      };
    }
  },
  watch: {
    value: function (newValue, oldValue) {
      this.isChecked = !!newValue;
    }
  },
  mounted () {
    if (this.value) {
      this.isChecked = !!this.value;
    }
  },
  methods: {
    toggle () {
      this.isChecked = !this.isChecked;
      this.$emit('input', this.isChecked);
      this.onToggle(this.isChecked);
    },
    getValue () {
      return !!this.isChecked;
    }
  }
}
</script>

<style lang="scss" scoped>
@import '../../../../scss/variables.scss';

.switcher {
  background: var(--input-border-dark);
  border-radius: 20px;
  cursor: pointer;
  display: inline-block;
  height: 18px;
  margin-right: .5rem;
  position: relative;
  top: 3px;
  transition: all .28s ease;
  width: 32px;
  z-index: 1;

  &.lower-zindex {
    z-index: 0;
  }

  &:after {
    position: absolute;
    left: 2px;
    top: 2px;
    display: block;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: var(--input-bg-lightest);
    content: '';
    transition: all .28s ease;
  }

  &:active:after {
    transform: scale(0.8);
  }

  &.is-checked {
    background: var(--input-border-focus);

    &:after {
      left: 16px;
      background: var(--input-bg-lightest);
    }
  }

  &.is-disabled {
    opacity: .5;
    pointer-events: none;
  }
}
</style>
