<template>
  <aside 
    :class="{ 'blocks-list': true, 'is-opened': isOpened }"
    @click="deactivateItem()">
    <button 
      v-if="!isOpened"
      class="blocks-list-open"
      @click.prevent="openList">
      Otwórz
    </button>

    <button 
      v-if="isOpened"
      class="blocks-list-close"
      @click.prevent="closeList">
      Zamknij
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
        <icon :name="item.icon" />
        <span>{{ item.label }}</span>

        <button
          class="wrapper-ui-bulk-delete"
          tabindex="-1"
          @click.stop="deleteBlock(item.id)">
          <icon name="trash" />
        </button>
        <button
          class="wrapper-ui-bulk-duplicate"
          tabindex="-1"
          :disabled="item.type === 'publii-readmore'"
          @click.stop="duplicateBlock(item.id)">
          <icon name="duplicate" />
        </button>
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
  bottom: 20px;
  height: 60px;
  left: 20px;
  position: fixed;
  width: 60px;

  &.is-opened {
    background: #fff;
    bottom: 0;
    box-shadow: 0 0 5px rgba(0, 0, 0, .25);
    height: 100vh;
    left: 0;
    overflow: auto;
    position: fixed;
    top: 0;
    width: 320px;
    z-index: 1000000;
  }

  &-close {
    position: absolute;
    right: 20px;
    top: 20px;
  }

  &-open {
    height: 60px;
    width: 60px;
  }

  &-items {
    list-style-type: none;
    margin: 30px 20px;
    padding: 0;
  }

  &-item {
    &.is-active {
      border: 2px solid blue;
    }
  }
}
</style>
