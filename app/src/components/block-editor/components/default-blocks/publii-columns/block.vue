<template>
  <div @click="updateCurrentBlockID()">
    <div 
      ref="block"
      class="columns">
      <div 
        v-for="(column, index) of config.columns"
        :key="'columns-column-' + index"
        :style="'flex-basis: ' + column.width + '%;'">
        Column {{ index + 1 }}<br>
        WIDTH: {{ column.width }}
      </div>
      {{ config.columns.length }}
    </div>

    <top-menu
      ref="top-menu"
      :config="topMenuConfig"
      :advancedConfig="configForm" />
  </div>
</template>

<script>
/**
 * Todo
 * - remember about debouncedSave()
 * - add option to specify gap size
 * - add option to specify columns vertical align
 * - add option to specify in each column vertical align
 * - add code to handle RWD for columns
 * - notice before removing non-empty columns
 * - UI to move columns
 * - UI to remove specific columns
 * 
 * Everything in CSS with variables:
 * --publii-block-editor-columns-small-gap (10px)
 * --publii-block-editor-columns-medium-gap (25px)
 * --publii-block-editor-columns-big-gap (50px)
 */

import Block from './../../Block.vue';
import ConfigForm from './config-form.json';
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
    Block
  ],
  components: {
    'top-menu': TopMenuUI
  },
  data () {
    return {
      config: {
        columns: [{
          width: 50,
          align: 'top'
        }, {
          width: 50,
          align: 'top'
        }],
        advanced: {
          cssClasses: this.getAdvancedConfigDefaultValue('cssClasses'),
          customId: this.getAdvancedConfigDefaultValue('customId'),
          id: this.getAdvancedConfigDefaultValue('id')
        }
      },
      content: [[], []],
      topMenuConfig: [
        {
          activeState: function () { 
            return this.config.columns.length === 1; 
          },
          onClick: function () { 
            this.setColumnsCount(1); 
          },
          icon: 'h1',
          tooltip: this.$t('editor.columns1')
        },
        {
          activeState: function () { 
            return this.config.columns.length === 2; 
          },
          onClick: function () { 
            this.setColumnsCount(2); 
          },
          icon: 'h2',
          tooltip: this.$t('editor.columns2')
        },
        {
          activeState: function () { 
            return this.config.columns.length === 3; 
          },
          onClick: function () { 
            this.setColumnsCount(3); 
          },
          icon: 'h3',
          tooltip: this.$t('editor.columns3')
        },
        {
          activeState: function () { 
            return this.config.columns.length === 4; 
          },
          onClick: function () { 
            this.setColumnsCount(4); 
          },
          icon: 'h4',
          tooltip: this.$t('editor.columns4')
        },
        {
          activeState: function () { 
            return this.config.columns.length === 5; 
          },
          onClick: function () { 
            this.setColumnsCount(5); 
          },
          icon: 'h5',
          tooltip: this.$t('editor.columns5')
        },
        {
          activeState: function () { 
            return this.config.columns.length === 6; 
          },
          onClick: function () { 
            this.setColumnsCount(6); 
          },
          icon: 'h6',
          tooltip: this.$t('editor.columns6')
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
  methods: {
    handleKeyboard (e) {
      // no action required
    },
    setColumnsCount (level) {
      this.save();
      
      if (level < this.config.columns.length) {
        let columnsToRemove = level - this.config.columns.length;
        this.config.columns.splice(columnsToRemove);
        this.config.columns.map(column => column.width = 100 / this.config.columns.length);
      } else if (level > this.config.columns.length) {
        let columnsToAdd = level - this.config.columns.length;

        for (let i = 0; i < columnsToAdd; i++) {
          let newColumnWidth = this.calculateNewColumnsWidth();

          this.config.columns.push({
            width: newColumnWidth,
            align: 'top'
          });
        }
      }

      this.save();
    },
    calculateNewColumnsWidth () {
      let newColumnWidth = 100 / (this.config.columns.length + 1);
      let decreasedSpace = newColumnWidth / this.config.columns.length;
      this.config.columns.map(column => {
        column.width -= decreasedSpace;
        return column;
      });
      return newColumnWidth;
    },
    async save () {
      this.$bus.$emit('block-editor-save-block', {
        id: this.id,
        config: JSON.parse(JSON.stringify(this.config)),
        content: this.content
      });
    }
  }
}
</script>

<style scoped lang="scss">
.columns {
  display: flex;
  width: 100%;
}
</style>
  