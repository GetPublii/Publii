<template>
  <div :class="{ 'is-empty': isEmpty }">
    <div
      :class="{ 
        'publii-block-table-wrapper': true, 
        'is-resizing': isResizing 
      }"
      ref="block">
      <table
        class="publii-block-table"
        ref="table">
        <colgroup v-if="content.colWidths">
          <col
            v-for="(width, colIndex) in content.colWidths"
            :key="'col-' + tableVersion + '-' + colIndex"
            :style="{ width: width + '%' }" />
        </colgroup>
        <thead v-if="content.hasHeader">
          <tr>
            <th
              v-for="(cell, colIndex) in content.headers"
              :key="'th-' + tableVersion + '-' + colIndex"
              :class="{ 'is-delete-highlight': highlightDeleteColumn && colIndex === currentCol }"
              contenteditable="true"
              @focus="cellFocus(-1, colIndex)"
              @keydown="handleCellKeydown($event, -1, colIndex)"
              @keyup="handleCellCaret($event, -1, colIndex); handleKeyUp($event); debouncedSave()"
              @paste="pastePlainText"
              @mouseup="handleMouseUp"
              v-initial-html="cell"></th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(row, rowIndex) in content.rows"
            :key="'tr-' + tableVersion + '-' + rowIndex">
            <component
              :is="content.hasHeaderCol && colIndex === 0 ? 'th' : 'td'"
              v-for="(cell, colIndex) in row"
              :key="'td-' + tableVersion + '-' + rowIndex + '-' + colIndex"
              :class="{ 'is-delete-highlight': (highlightDeleteRow && !currentIsHeader && rowIndex === currentRow) || (highlightDeleteColumn && colIndex === currentCol) }"
              contenteditable="true"
              @focus="cellFocus(rowIndex, colIndex)"
              @keydown="handleCellKeydown($event, rowIndex, colIndex)"
              @keyup="handleCellCaret($event, rowIndex, colIndex); handleKeyUp($event); debouncedSave()"
              @paste="pastePlainText"
              @mouseup="handleMouseUp"
              v-initial-html="cell"></component>
          </tr>
        </tbody>
      </table>

      <div
        v-for="handle in resizeHandles"
        :key="'resize-handle-' + handle.index"
        :class="{ 'publii-block-table-resizer': true, 'is-active': activeResizeBoundary === handle.index }"
        :style="{ left: handle.left + 'px', top: tableTop + 'px', height: tableHeight + 'px' }"
        @mousedown.prevent.stop="startColumnResize($event, handle.index)"></div>

      <button
        v-for="handle in visibleRowHandles"
        :key="'row-handle-' + handle.index"
        class="publii-block-table-handle publii-block-table-handle-row"
        :style="{ top: handle.top + 'px' }"
        :title="$t('editor.tableAddRow')"
        tabindex="-1"
        @click.stop="insertRowAt(handle.index)">
        <icon
          name="add"
          customWidth="12"
          customHeight="12" />
      </button>

      <button
        v-for="handle in visibleColHandles"
        :key="'col-handle-' + handle.index"
        class="publii-block-table-handle publii-block-table-handle-col"
        :style="{ left: handle.left + 'px' }"
        :title="$t('editor.tableAddColumn')"
        tabindex="-1"
        @click.stop="insertColumnAt(handle.index)">
        <icon
          name="add"
          customWidth="12"
          customHeight="12" />
      </button>

      <button
        v-if="hasActiveCell && !currentIsHeader"
        :class="{ 
            'publii-block-table-delete publii-block-table-delete-row has-tooltip': true, 
            'is-confirm': confirmDeleteRow 
        }"
        :style="{ top: activeRowCenter + 'px' }"
        tabindex="-1"
        @mouseenter="highlightDeleteRow = true"
        @mouseleave="highlightDeleteRow = false"
        @click.stop="deleteRowClick">
        <icon
          :name="confirmDeleteRow ? 'open-trash' : 'trash'"
          customWidth="14"
          customHeight="14" />
        <span class="ui-tooltip">
          {{ confirmDeleteRow ? $t('editor.clickToConfirm') : $t('editor.tableDeleteRow') }}
        </span>
      </button>

      <button
        v-if="hasActiveCell"
        :class="{ 
            'publii-block-table-delete publii-block-table-delete-col has-tooltip': true, 
            'is-confirm': confirmDeleteColumn 
        }"
        :style="{ left: activeColCenter + 'px', top: deleteColTop + 'px' }"
        tabindex="-1"
        @mouseenter="highlightDeleteColumn = true"
        @mouseleave="highlightDeleteColumn = false"
        @click.stop="deleteColumnClick">
        <icon
          :name="confirmDeleteColumn ? 'open-trash' : 'trash'"
          customWidth="14"
          customHeight="14" />
        <span class="ui-tooltip">
          {{ confirmDeleteColumn ? $t('editor.clickToConfirm') : $t('editor.tableDeleteColumn') }}
        </span>
      </button>
    </div>

    <inline-menu ref="inline-menu" />

    <top-menu
      ref="top-menu"
      :conversions="conversions"
      :config="topMenuConfig"
      :advancedConfig="configForm" />
  </div>
</template>

<script>
import Block from './../../Block.vue';
import ConfigForm from './config-form.json';
import EditorIcon from './../../elements/EditorIcon.vue';
import InlineMenu from './../../mixins/InlineMenu.vue';
import InlineMenuUI from './../../helpers/InlineMenuUI.vue';
import TopMenuUI from './../../helpers/TopMenuUI.vue';

export default {
  name: 'Table',
  mixins: [
    Block,
    InlineMenu
  ],
  components: {
    'icon': EditorIcon,
    'inline-menu': InlineMenuUI,
    'top-menu': TopMenuUI
  },
  computed: {
    isEmpty () {
      let cells = [
        ...(this.content.headers || []),
        ...[].concat(...(this.content.rows || []))
      ];

      return cells.every(cell => cell === '' || cell === '<br>');
    },
    columnsCount () {
      if (this.content.rows.length) {
        return this.content.rows[0].length;
      }

      return this.content.headers.length;
    },
    resizeHandles () {
      return this.colHandles.filter(handle => handle.index > 0 && handle.index < this.columnsCount);
    },
    visibleRowHandles () {
      if (!this.hasActiveCell) {
        return [];
      }

      if (this.currentIsHeader) {
        return this.rowHandles.filter(handle => handle.index === 0);
      }

      return this.rowHandles.filter(handle => handle.index === this.currentRow || handle.index === this.currentRow + 1);
    },
    visibleColHandles () {
      if (!this.hasActiveCell) {
        return [];
      }

      return this.colHandles.filter(handle => handle.index === this.currentCol || handle.index === this.currentCol + 1);
    }
  },
  data () {
    return {
      config: {
        advanced: {
          cssClasses: this.getAdvancedConfigDefaultValue('cssClasses'),
          id: this.getAdvancedConfigDefaultValue('id')
        }
      },
      content: {
        hasHeader: true,
        hasHeaderCol: false,
        headers: ['', ''],
        rows: [
          ['', ''],
          ['', '']
        ],
        colWidths: null
      },
      conversions: [],
      currentRow: 0,
      currentCol: 0,
      currentIsHeader: false,
      hasActiveCell: false,
      confirmDeleteRow: false,
      confirmDeleteColumn: false,
      highlightDeleteRow: false,
      highlightDeleteColumn: false,
      isResizing: false,
      activeResizeBoundary: null,
      tableVersion: 0,
      rowHandles: [],
      colHandles: [],
      activeRowCenter: 0,
      activeColCenter: 0,
      deleteColTop: 0,
      tableTop: 0,
      tableHeight: 0,
      topMenuConfig: [
        {
          activeState: function () { 
            return this.content.hasHeader; 
          },
          onClick: function () { 
            this.toggleHeader(); 
          },
          icon: 'table-header',
          tooltip: this.$t('editor.tableToggleHeader')
        },
        {
          activeState: function () { 
            return this.content.hasHeaderCol; 
          },
          onClick: function () { 
            this.toggleHeaderCol(); 
          },
          icon: 'table-header-column',
          tooltip: this.$t('editor.tableToggleHeaderCol')
        }
      ]
    };
  },
  beforeCreate () {
    this.configForm = ConfigForm;
  },
  beforeMount () {
    if (
      this.inputContent &&
      typeof this.inputContent === 'object' &&
      this.inputContent.rows
    ) {
      let loadedContent = JSON.parse(JSON.stringify(this.inputContent));

      if (typeof loadedContent.hasHeaderCol === 'undefined') {
        loadedContent.hasHeaderCol = false;
      }

      if (typeof loadedContent.colWidths === 'undefined') {
        loadedContent.colWidths = null;
      }

      this.content = loadedContent;
    }
  },
  mounted () {
    this.updateUIHandles();
  },
  methods: {
    focus (cursorPosition = 'end') {
      let rowIndex = this.content.hasHeader ? -1 : 0;
      this.focusCell(rowIndex, 0, cursorPosition !== 'none');
    },
    cellFocus (rowIndex, colIndex) {
      this.currentIsHeader = rowIndex === -1;
      this.currentRow = rowIndex === -1 ? 0 : rowIndex;
      this.currentCol = colIndex;
      this.hasActiveCell = true;
      this.confirmDeleteRow = false;
      this.confirmDeleteColumn = false;
      this.highlightDeleteRow = false;
      this.highlightDeleteColumn = false;
      this.updateUIHandles();
      this.updateCurrentBlockID();
    },
    getCellElement (rowIndex, colIndex) {
      if (rowIndex === -1) {
        return this.$refs['block'].querySelectorAll('thead th')[colIndex];
      }

      let row = this.$refs['block'].querySelectorAll('tbody tr')[rowIndex];
      return row ? row.children[colIndex] : null;
    },
    focusCell (rowIndex, colIndex, setCaretAtEnd = true) {
      this.$nextTick(() => {
        setTimeout(() => {
          let cell = this.getCellElement(rowIndex, colIndex);

          if (!cell) {
            return;
          }

          cell.focus();

          if (setCaretAtEnd) {
            let range = document.createRange();
            range.selectNodeContents(cell);
            range.collapse(false);
            let sel = document.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);
          }
        }, 0);
      });
    },
    handleKeyUp (e) {
      this.textIsHighlighted = false;

      if (e.code === 'Backspace') {
        e.preventDefault();
        let range = document.getSelection().getRangeAt(0);
        range.deleteContents();
      }
    },
    handleCellKeydown (e, rowIndex, colIndex) {
      if (e.code === 'Tab') {
        e.preventDefault();
        e.stopPropagation();
        this.moveToSiblingCell(e.shiftKey ? -1 : 1, rowIndex, colIndex);
        return;
      }

      if (e.code === 'Enter' && !e.isComposing) {
        e.preventDefault();

        if (e.shiftKey) {
          document.execCommand('insertLineBreak');
        } else {
          this.insertRowAt(rowIndex === -1 ? 0 : rowIndex + 1, colIndex);
        }
      }
    },
    handleCellCaret (e, rowIndex, colIndex) {
      if (e.code !== 'ArrowUp' && e.code !== 'ArrowDown') {
        this.caretIsAtStart = false;
        this.caretIsAtEnd = false;
        return;
      }

      let cell = this.getCellElement(rowIndex, colIndex);

      if (!cell) {
        return;
      }

      if (e.code === 'ArrowUp' && this.getCaretPosition(cell) === 0) {
        if (!this.caretIsAtStart) {
          this.caretIsAtStart = true;
          return;
        }

        this.caretIsAtStart = false;

        if (rowIndex === -1 || (rowIndex === 0 && !this.content.hasHeader)) {
          let previousBlockID = this.findPreviousBlockID();

          if (previousBlockID) {
            this.editor.$refs['block-wrapper-' + previousBlockID][0].blockClick();
            this.editor.$refs['block-' + previousBlockID][0].focus();
          }
        } else {
          this.focusCell(rowIndex === 0 ? -1 : rowIndex - 1, colIndex);
        }
      }

      if (e.code === 'ArrowDown' && this.getCaretPosition(cell) >= cell.innerHTML.length) {
        if (!this.caretIsAtEnd) {
          this.caretIsAtEnd = true;
          return;
        }

        this.caretIsAtEnd = false;

        if (rowIndex === this.content.rows.length - 1) {
          let nextBlockID = this.findNextBlockID();

          if (nextBlockID) {
            this.editor.$refs['block-wrapper-' + nextBlockID][0].blockClick();
            this.editor.$refs['block-' + nextBlockID][0].focus('none');
          }
        } else {
          this.focusCell(rowIndex + 1, colIndex);
        }
      }
    },
    moveToSiblingCell (direction, rowIndex, colIndex) {
      let cols = this.columnsCount;
      let headerOffset = this.content.hasHeader ? cols : 0;
      let linearIndex = rowIndex === -1 ? colIndex : headerOffset + (rowIndex * cols) + colIndex;
      let totalCells = headerOffset + (this.content.rows.length * cols);
      linearIndex += direction;

      if (linearIndex < 0) {
        return;
      }

      if (linearIndex >= totalCells) {
        return;
      }

      if (this.content.hasHeader && linearIndex < cols) {
        this.focusCell(-1, linearIndex);
        return;
      }

      let bodyIndex = linearIndex - headerOffset;
      this.focusCell(Math.floor(bodyIndex / cols), bodyIndex % cols);
    },
    createEmptyRow () {
      return Array(this.columnsCount).fill('');
    },
    toggleHeader () {
      this.syncCellsFromDOM();
      this.content.hasHeader = !this.content.hasHeader;

      if (this.content.hasHeader) {
        while (this.content.headers.length < this.columnsCount) {
          this.content.headers.push('');
        }

        this.content.headers = this.content.headers.slice(0, this.columnsCount);
      }

      this.refreshTable();
      this.focusCell(this.content.hasHeader ? -1 : 0, this.currentCol);
    },
    toggleHeaderCol () {
      this.syncCellsFromDOM();
      this.content.hasHeaderCol = !this.content.hasHeaderCol;
      this.refreshTable();
      this.focusCell(this.currentIsHeader ? -1 : this.currentRow, this.currentCol);
    },
    insertRowAt (index, colToFocus = 0) {
      this.syncCellsFromDOM();
      this.content.rows.splice(index, 0, this.createEmptyRow());
      this.refreshTable();
      this.focusCell(index, colToFocus);
    },
    insertColumnAt (index) {
      this.syncCellsFromDOM();

      if (this.content.colWidths) {
        let newWidth = 100 / (this.columnsCount + 1);
        this.content.colWidths = this.content.colWidths.map(width => width * (100 - newWidth) / 100);
        this.content.colWidths.splice(index, 0, newWidth);
      }

      this.content.headers.splice(index, 0, '');

      for (let row of this.content.rows) {
        row.splice(index, 0, '');
      }

      this.refreshTable();
      this.focusCell(this.currentIsHeader ? -1 : this.currentRow, index);
    },
    deleteRowClick () {
      if (!this.confirmDeleteRow) {
        this.confirmDeleteRow = true;
        this.confirmDeleteColumn = false;
        return;
      }

      this.confirmDeleteRow = false;
      this.highlightDeleteRow = false;
      this.deleteRow();
    },
    deleteColumnClick () {
      if (!this.confirmDeleteColumn) {
        this.confirmDeleteColumn = true;
        this.confirmDeleteRow = false;
        return;
      }

      this.confirmDeleteColumn = false;
      this.highlightDeleteColumn = false;
      this.deleteColumn();
    },
    deleteRow () {
      if (this.content.rows.length === 1) {
        this.$bus.$emit('block-editor-delete-block', this.id);
        return;
      }

      this.syncCellsFromDOM();
      this.content.rows.splice(this.currentRow, 1);
      this.refreshTable();
      let rowToFocus = Math.min(this.currentRow, this.content.rows.length - 1);
      this.focusCell(rowToFocus, this.currentCol);
    },
    deleteColumn () {
      if (this.columnsCount === 1) {
        this.$bus.$emit('block-editor-delete-block', this.id);
        return;
      }

      this.syncCellsFromDOM();

      if (this.content.colWidths) {
        this.content.colWidths.splice(this.currentCol, 1);
        let widthsSum = this.content.colWidths.reduce((sum, width) => sum + width, 0);
        this.content.colWidths = this.content.colWidths.map(width => (width / widthsSum) * 100);
      }

      this.content.headers.splice(this.currentCol, 1);

      for (let row of this.content.rows) {
        row.splice(this.currentCol, 1);
      }

      this.refreshTable();
      let colToFocus = Math.min(this.currentCol, this.columnsCount - 1);
      this.focusCell(this.currentIsHeader ? -1 : this.currentRow, colToFocus);
    },
    startColumnResize (e, boundaryIndex) {
      let table = this.$refs['table'];
      let tableWidth = table.getBoundingClientRect().width;

      if (!this.content.colWidths || this.content.colWidths.length !== this.columnsCount) {
        let firstRow = table.querySelector('tr');

        if (!firstRow) {
          return;
        }

        this.content.colWidths = Array.from(firstRow.children).map(
          cell => (cell.getBoundingClientRect().width / tableWidth) * 100
        );
      }

      this.isResizing = true;
      this.activeResizeBoundary = boundaryIndex;
      this.resizeState = {
        boundary: boundaryIndex,
        startX: e.clientX,
        tableWidth: tableWidth,
        leftStart: this.content.colWidths[boundaryIndex - 1],
        rightStart: this.content.colWidths[boundaryIndex]
      };

      document.addEventListener('mousemove', this.onColumnResize);
      document.addEventListener('mouseup', this.stopColumnResize);
    },
    onColumnResize (e) {
      if (!this.resizeState) {
        return;
      }

      let deltaPercent = ((e.clientX - this.resizeState.startX) / this.resizeState.tableWidth) * 100;
      let minWidth = 5;
      let leftWidth = this.resizeState.leftStart + deltaPercent;
      let rightWidth = this.resizeState.rightStart - deltaPercent;

      if (leftWidth < minWidth) {
        rightWidth -= minWidth - leftWidth;
        leftWidth = minWidth;
      }

      if (rightWidth < minWidth) {
        leftWidth -= minWidth - rightWidth;
        rightWidth = minWidth;
      }

      this.$set(this.content.colWidths, this.resizeState.boundary - 1, leftWidth);
      this.$set(this.content.colWidths, this.resizeState.boundary, rightWidth);
      this.updateUIHandles();
    },
    stopColumnResize () {
      document.removeEventListener('mousemove', this.onColumnResize);
      document.removeEventListener('mouseup', this.stopColumnResize);
      this.resizeState = null;
      this.isResizing = false;
      this.activeResizeBoundary = null;
      this.emitSave();
      this.updateUIHandles();
    },
    refreshTable () {
      this.tableVersion++;
      this.emitSave();
      this.updateUIHandles();
    },
    updateUIHandles () {
      this.$nextTick(() => {
        let wrapper = this.$refs['block'];
        let table = this.$refs['table'];

        if (!wrapper || !table) {
          return;
        }

        let wrapperRect = wrapper.getBoundingClientRect();
        let tableRect = table.getBoundingClientRect();
        this.tableTop = tableRect.top - wrapperRect.top;
        this.tableHeight = tableRect.height;
        let bodyRows = table.querySelectorAll('tbody tr');
        let rowHandles = [];

        for (let i = 0; i < bodyRows.length; i++) {
          rowHandles.push({
            index: i,
            top: bodyRows[i].getBoundingClientRect().top - wrapperRect.top
          });
        }

        if (bodyRows.length) {
          rowHandles.push({
            index: bodyRows.length,
            top: bodyRows[bodyRows.length - 1].getBoundingClientRect().bottom - wrapperRect.top
          });
        }

        this.rowHandles = rowHandles;

        let firstRow = table.querySelector('tr');
        let firstRowCells = firstRow ? firstRow.children : [];
        let colHandles = [];

        for (let j = 0; j < firstRowCells.length; j++) {
          colHandles.push({
            index: j,
            left: firstRowCells[j].getBoundingClientRect().left - wrapperRect.left
          });
        }

        if (firstRowCells.length) {
          colHandles.push({
            index: firstRowCells.length,
            left: firstRowCells[firstRowCells.length - 1].getBoundingClientRect().right - wrapperRect.left
          });
        }

        this.colHandles = colHandles;
        this.updateActiveCellUI();
      });
    },
    updateActiveCellUI () {
      if (!this.hasActiveCell) {
        return;
      }

      let cell = this.getCellElement(this.currentIsHeader ? -1 : this.currentRow, this.currentCol);

      if (!cell) {
        this.hasActiveCell = false;
        return;
      }

      let wrapperRect = this.$refs['block'].getBoundingClientRect();
      let tableRect = this.$refs['table'].getBoundingClientRect();
      let cellRect = cell.getBoundingClientRect();
      this.activeRowCenter = cellRect.top - wrapperRect.top + (cellRect.height / 2);
      this.activeColCenter = cellRect.left - wrapperRect.left + (cellRect.width / 2);
      this.deleteColTop = tableRect.bottom - wrapperRect.top + 14;
    },
    syncCellsFromDOM () {
      let table = this.$refs['block'];

      if (!table) {
        return;
      }

      if (this.content.hasHeader) {
        this.content.headers = Array.from(table.querySelectorAll('thead th')).map(th => th.innerHTML);
      }

      this.content.rows = Array.from(table.querySelectorAll('tbody tr')).map(
        tr => Array.from(tr.children).map(cell => cell.innerHTML)
      );
    },
    save () {
      this.syncCellsFromDOM();
      this.emitSave();
      this.updateUIHandles();
    },
    emitSave () {
      this.$bus.$emit('block-editor-save-block', {
        id: this.id,
        config: JSON.parse(JSON.stringify(this.config)),
        content: JSON.parse(JSON.stringify(this.content))
      });
    },
    setContent (newContent) {
      this.content = JSON.parse(JSON.stringify(newContent));
      this.tableVersion++;
      this.emitSave();
      this.updateUIHandles();
    },
    saveChangesHistory () {
      this.syncCellsFromDOM();
      this.$bus.$emit('undomanager-save-history', this.id, JSON.parse(JSON.stringify(this.content)));
    }
  },
  beforeDestroy () {
    document.removeEventListener('mousemove', this.onColumnResize);
    document.removeEventListener('mouseup', this.stopColumnResize);
  }
}
</script>

<style>
.publii-block-table-wrapper {
  margin: -26px -34px -44px -30px;
  padding: 26px 34px 44px 30px;
  position: relative;

  &:hover {
    .publii-block-table-handle,
    .publii-block-table-delete {
      opacity: 1;
      pointer-events: auto;
    }
  }

  &.is-resizing {
    cursor: col-resize;
    user-select: none;

    .publii-block-table-handle,
    .publii-block-table-delete {
      opacity: 0 !important;
      pointer-events: none !important;
    }
  }

  .publii-block-table {
    border-collapse: collapse;
    display: table;
    table-layout: fixed;
    width: 100%;

    thead {
      display: table-header-group;
    }

    tbody {
      display: table-row-group;
    }

    tr {
      display: table-row;
    }

    th,
    td {
      border: 1px solid var(--input-border-color);
      display: table-cell;
      outline: none;
      overflow-wrap: break-word;
      padding: 8px 12px;
      transition: box-shadow .15s ease-out;
      vertical-align: top;

      &:focus {
        box-shadow: inset 0 0 0 1px var(--color-primary);
      }

      &.is-delete-highlight {
        background: rgba(var(--color-danger-rgb), .12);
      }
    }

    th {
      background: var(--color-surface-subtle);
      text-align: left;
    }
  }

  .publii-block-table-resizer {
    cursor: col-resize;
    position: absolute;
    transform: translateX(-50%);
    width: 9px;
    z-index: 3;

    &::after {
      border-left: 1px dashed var(--color-primary);
      content: "";
      height: 100%;
      left: 4px;
      opacity: 0;
      position: absolute;
      top: 0;
      transition: opacity .15s ease-out;
      width: 0;
    }

    &:hover::after,
    &:active::after,
    &.is-active::after {
      opacity: 1;
    }
  }

  .publii-block-table-handle,
  .publii-block-table-delete {
    align-items: center;
    background: var(--color-surface-subtle);
    border: none;
    border-radius: 50%;
    color: var(--icon-primary-color);
    cursor: pointer;
    display: flex;
    height: 18px;
    justify-content: center;
    opacity: 0;
    padding: 0;
    pointer-events: none;
    position: absolute;
    transition: opacity .15s ease-out, background .15s ease-out, color .15s ease-out;
    width: 18px;
    z-index: 2;

    &:hover {
      background: var(--button-secondary-bg);
      color: var(--icon-tertiary-color);
    }

    svg {
      pointer-events: none;
    }
  }

  .publii-block-table-handle-row {
    left: 4px;
    transform: translateY(-50%);
  }

  .publii-block-table-handle-col {
    top: 4px;
    transform: translateX(-50%);
  }

  .publii-block-table-delete {
    border-radius: 3px;
    height: 22px;
    width: 22px;

    &.is-confirm,
    &:hover {
      background: var(--color-danger);
      color: var(--white);
    }

    .ui-tooltip {
      white-space: nowrap;
    }
  }

  .publii-block-table-delete-row {
    right: 6px;
    transform: translateY(-50%);

    .ui-tooltip {
      left: auto;
      right: 0;
      transform: none !important;

      &::after {
        left: auto;
        right: 5px;
        transform: scale(.5);
      }
    }
  }

  .publii-block-table-delete-col {
    transform: translateX(-50%);
  }
}
</style>
