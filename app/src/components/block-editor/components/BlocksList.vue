<template>
  <aside 
    :class="{ 'blocks-list': true, 'is-opened': isOpened }"
    @click="deactivateItem()">
    <button 
      v-if="!isOpened"
      class="clean-invert icon small blocks-list-open"
      @click.prevent="openList">
      <icon name="open-bulk-edition" /> 
      {{ $t('editor.viewBulkEdit') }}
    </button>

    <button 
      v-if="isOpened"
      class="clean-invert icon small blocks-list-close"
      @click.prevent="closeList">
      <icon name="open-bulk-edition" /> 
      {{ $t('editor.hideBulkEdit') }}
    </button>
    

    <ol class="blocks-list-items">
      <li 
        v-for="(item, index) of preparedContent"
        :class="{
          'blocks-list-item': true, 
          'is-active': activeItem === item.id
        }"
        :key="'blocks-list-item-' + item.id"
        @click.stop="activateItem(item.id)">
        <div>
          <span class="blocks-list-item-icon"><icon :name="item.icon" /></span>
          <span>{{ item.label }}</span>

          <button
            class="blocks-list-item-bulk-duplicate"
            tabindex="-1"
            :disabled="item.type === 'publii-readmore'"
            @click.stop="duplicateBlock(item.id)">
            <icon name="duplicate" customWidth="16" customHeight="16"/>
          </button>

          <button
            class="blocks-list-item-bulk-delete"
            tabindex="-1"
            @click.stop="deleteBlock(item.id)">
            <icon name="trash" customWidth="16" customHeight="16"/>
          </button>
        </div>
      </li>
    </ol>
  </aside>
</template>

<script>
import AvailableBlocks from '../available-blocks.json';
import Icon from '../components/elements/EditorIcon.vue';

export default {
  name: 'BlocksList',
  props: [
    'content'
  ],
  components: {
    'icon': Icon
  },
  computed: {
    availableBlocks () {
      let blocks = {};

      for (let i = 0; i < AvailableBlocks.length; i++) {
        let keyValue = AvailableBlocks[i].blockName;

        blocks[keyValue] = {
          icon: AvailableBlocks[i].icon,
          label: this.$t(AvailableBlocks[i].label)
        };
      }

      return blocks;
    },
    preparedContent () {
      return this.content.map(item => ({
        id: item.id,
        label: this.availableBlocks[item.type].label,
        icon: this.availableBlocks[item.type].icon
      }));
    }
  },
  data () {
    return {
      activeItem: false,
      isOpened: false
    };
  },
  methods: {
    openList () {
      this.isOpened = true;
    },
    closeList () {
      this.isOpened = false;
    },
    activateItem (id) {
      this.activeItem = id;
      this.$bus.$emit('block-editor-list-deactivate-item');

      setTimeout(() => {
        this.$bus.$emit('block-editor-list-activate-item', id);

        document.querySelector('.post-editor-form div[data-id="' + id + '"]').scrollIntoView({
            behavior: 'smooth',
            block: 'center',
            inline: 'center'
        });
      }, 0);
    },
    deactivateItem () {
      this.activeItem = false;
      this.$bus.$emit('block-editor-list-deactivate-item');
    },
    /*
    moveDown (id) {
      let startBlockTop = document.querySelector('.post-editor-form div[data-id="' + id + '"]').getBoundingClientRect().top;
      this.$bus.$emit('block-editor-move-block-down', id, startBlockTop);

      setTimeout(() => {
        document.querySelector('.post-editor-form div[data-id="' + id + '"]').scrollIntoView({
            behavior: 'smooth',
            block: 'center',
            inline: 'center'
        });
      }, 0);
    },
    */
    deleteBlock (id) {
      this.$bus.$emit('block-editor-delete-block', id);

      if (this.activeItem === id) {
        this.deactivateItem();
      }
    },
    duplicateBlock (id) {
      this.$bus.$emit('block-editor-duplicate-block', id);
    }
  }
}
</script>

<style lang="scss">

.blocks-list {
  bottom: .4rem;
  height: 4.6rem;
  left: 1.8rem;
  position: fixed;
  z-index: 1;

  &.is-opened {
    background: var(--option-sidebar-bg);
    bottom: 0;
    border-right: 1px solid var(--input-border-color);
    height: calc(100vh - var(--topbar-height));
    left: 0;
    overflow: auto;
    position: fixed;
    top: var(--topbar-height);
    width: 300px;
    z-index: 1000000;

    &::before {
      background: linear-gradient(to top, var(--option-sidebar-bg) 0%,var(--option-sidebar-bg) 75%,transparent 100%);
      content: "";
      bottom: 0;
      left: -1px;
      height: 6rem;
      position: fixed;
      width: inherit;
      z-index: 1;
    }
  }

  &-open,
  &-close {
    align-items: center;
    background: transparent;
    border: none;
    border-radius: 0 var(--border-radius) 0 0;
    color: var(--link-primary-color-hover);
    cursor: pointer;
    display: flex;
    font-size: 1.4rem;
    font-weight: var(--font-weight-semibold);
    height: 4.6rem;
    line-height: 4.5rem;
    padding: 0 1.3rem 0 3.8rem;
    transition: var(--transition);
    user-select: none;
    white-space: nowrap;
    z-index: 2;

    & > svg {
      left: 0.9rem;
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
    }

    &:hover {
      color: var(--link-primary-color);
    }
  }

  &-close {
    bottom: .4rem;
    left: 1.8rem;
    position: fixed;
    text-align: center; 
  }

  &-items {
    list-style-type: none;
    margin: 2rem 2rem 6rem;
    padding: 0;
  }

  &-item {
    border-radius: calc(var(--border-radius) / 2);
    cursor: pointer;
    font-size: 14px;
    font-weight: var(--font-weight-semibold);
    margin: 6px 0;
    padding: 0;

    &.is-active {
      box-shadow: 0 0 0 1px var(--color-primary);
      position: relative;
      z-index: 1;

      & > div {
        background-color: var(--button-secondary-bg);
      }
    }

    & > div {
      align-items: center;
      background-color: var(--gray-1);
      display: grid;
      border-radius: var(--border-radius);
      grid-template-columns: auto 1fr auto auto 6px;
      transition: var(--transition);

      &:hover {
        background-color: var(--button-secondary-bg);
        color: var(--headings-color);

        .blocks-list-item-icon {
            color: var(--icon-tertiary-color);
        }
      }
    }

    &-icon {
      align-items: center;
      border-radius: var(--border-radius);
      display: inline-flex;
      color: var(--icon-primary-color);
      height: 38px;
      justify-content: center;
      margin-right: 1px;
      transition: var(--transition);
      width: 38px;
    }

    &-bulk-delete, 
    &-bulk-duplicate {
      background: var(--bg-primary);
      border: none;
      border-radius: 50%;
      cursor: pointer;
      display: inline-block;
      height: 2.8rem;
      padding: 0;
      text-align: center;
      transition: all .3s ease-out;
      width: 2.8rem;

      &:active,
      &:focus,
      &:hover {
        color: var(--headings-color)
      }

      &:hover {
        & > svg {
            color: currentColor;
            transform: scale(1);
        }
      }

      svg {
        color: var(--icon-secondary-color);
        pointer-events: none;
        transform: scale(.9);
        transition: var(--transition);
        vertical-align: middle;
      }
    }
    &-bulk-delete {
      margin-left: 3px;
      &:hover {
        & > svg {
          color: var(--warning);
        }
      }
    }
  }
}
</style>
