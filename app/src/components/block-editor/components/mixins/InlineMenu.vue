<script>
import EditorIcon from './../elements/EditorIcon.vue';
import LinkConfig from './../mixins/LinkConfig.vue';
import SelectedText from './../utils/SelectedText.js';
import Vue from 'vue';

export default {
  name: 'InlineMenu',
  mixins: [
    LinkConfig
  ],
  components: {
    'icon': EditorIcon
  },
  data () {
    return {
      inlineMenuContainer: 'block',
      selectedText: {
        containedTags: {},
        allowedOperations: {}
      }
    };
  },
  methods: {
    handleMouseUp (e) {
      setTimeout(() => {
        let sel = document.getSelection();

        if (sel.isCollapsed) {
          this.textIsHighlighted = false;
        } else {
          this.textIsHighlighted = !sel.isCollapsed || (sel.anchorNode === sel.focusNode && sel.anchorOffset === sel.focusOffset);
        }

        if (this.textIsHighlighted) {
          setTimeout(() => {
            this.showInlineMenu();
          }, 0);
        }
      }, 0);
    },
    showInlineMenu () {
      let sel = document.getSelection();
      this.selectedText = new SelectedText(this.$refs[this.inlineMenuContainer], this.$parent.blockType);
      this.selectedText.analyzeSelectedText();
      let oRange = sel.getRangeAt(0);
      let oRect = oRange.getBoundingClientRect();
      let wrapperRect = this.$refs[this.inlineMenuContainer].getBoundingClientRect();
      let inlineMenuOffsets = this.getInlineMenuOffsets();
      let inlineMenuLeft = (((oRect.left - wrapperRect.left) + (oRect.width / 2)) + inlineMenuOffsets.x) + 'px';
      let inlineMenuTop = ((oRect.top - wrapperRect.top) + oRect.height + inlineMenuOffsets.y) + 'px';
      this.$refs['inline-menu'].setPosition(inlineMenuLeft, inlineMenuTop);
    },
    updateInlineMenuPosition () {
      let sel = document.getSelection();

      if (sel.toString() === '') {
        this.closeInlineMenu();
        return;
      }

      let oRange = sel.getRangeAt(0);
      let oRect = oRange.getBoundingClientRect();
      let wrapperRect = this.$refs[this.inlineMenuContainer].getBoundingClientRect();
      let inlineMenuOffsets = this.getInlineMenuOffsets();
      let inlineMenuLeft = (((oRect.left - wrapperRect.left) + (oRect.width / 2)) + inlineMenuOffsets.x) + 'px';
      let inlineMenuTop = ((oRect.top - wrapperRect.top) + oRect.height + inlineMenuOffsets.y) + 'px';
      this.$refs['inline-menu'].setPosition(inlineMenuLeft, inlineMenuTop);
    },
    closeInlineMenu () {
      this.textIsHighlighted = false;
    },
    getInlineMenuOffsets () {
      let x = 30;
      let y = -50;

      if (this.$parent.blockType === 'publii-quote') {
        y = -40;
      }

      if (this.$parent.blockType === 'publii-list') {
        x = 65;
      }

      return { x, y };
    },
    doInlineOperation (operationType) {
      switch (operationType) {
        case 'strong': this.execCommand('strong'); break;
        case 'em': this.execCommand('em'); break;
        case 's': this.execCommand('s'); break;
        case 'u': this.execCommand('u'); break;
        case 'code': this.execCommand('code'); break;
        case 'mark': this.execCommand('mark'); break;
        case 'unlink': this.removeLink(); break;
        case 'indent': this.indentList(); break;
        case 'outdent': this.outdentList(); break;
      }

      this.selectedText = new SelectedText(this.$refs[this.inlineMenuContainer], this.$parent.blockType);
      this.selectedText.analyzeSelectedText();

      Vue.nextTick(() => {
        this.$parent.saveChangesHistory();
      });
    },
    execCommand (tagToUse) {
      if (this.selectedText.containedTags[tagToUse]) {
        this.selectedText.removeStyle(tagToUse);
        setTimeout(() => {
          Vue.set(this.selectedText.containedTags, tagToUse, false);
        }, 0);
      } else {
        let range = window.getSelection().getRangeAt(0);
        let newTag = document.createElement(tagToUse);
        newTag.appendChild(range.extractContents());
        range.insertNode(newTag);
      }
    },
    indentList () {
      document.execCommand('indent', false, null);
      setTimeout(() => {
        this.updateInlineMenuPosition();
      }, 100);
    },
    outdentList () {
      document.execCommand('outdent', false, null);
      setTimeout(() => {
        this.updateInlineMenuPosition();
      }, 100);
    },
    removeLink () {
      let selection = document.getSelection();
      let linkToRemove = this.findFirstLinkInSelection(selection);

      if (linkToRemove) {
        let selection = window.getSelection();
        selection.removeAllRanges();
        let range = document.createRange();
        range.selectNodeContents(linkToRemove);
        selection.addRange(range);
        let firstChild = linkToRemove.firstChild;
        let lastChild = linkToRemove.firstChild;

        while (linkToRemove.firstChild) {
          lastChild = linkToRemove.firstChild;
          linkToRemove.parentNode.insertBefore(linkToRemove.firstChild, linkToRemove);
        }

        linkToRemove.parentNode.removeChild(linkToRemove);
        range.setStartBefore(firstChild);
        range.setEndAfter(lastChild);
      }
    },
    findFirstLinkInSelection (selection) {
      let anchorNode = selection.anchorNode;
      let focusNode = selection.focusNode;
      let range = selection.getRangeAt(0);

      if (
        anchorNode.previousElementSibling &&
        anchorNode.previousElementSibling.tagName === 'A' &&
        range.intersectsNode(anchorNode.previousElementSibling)
      ) {
        return anchorNode.previousElementSibling;
      }

      if (
        anchorNode.nextElementSibling &&
        anchorNode.nextElementSibling.tagName === 'A' &&
        range.intersectsNode(anchorNode.nextElementSibling)
      ) {
        return anchorNode.nextElementSibling;
      }

      if (anchorNode.parentNode.tagName === 'A') {
        return anchorNode.parentNode;
      }

      if (anchorNode.nodeType === 1 && anchorNode.closest('a')) {
        return anchorNode.closest('a');
      }

      if (
        focusNode.previousElementSibling &&
        focusNode.previousElementSibling.tagName === 'A' &&
        range.intersectsNode(focusNode.previousElementSibling)
      ) {
        return focusNode.previousElementSibling;
      }

      if (
        focusNode.nextElementSibling &&
        focusNode.nextElementSibling.tagName === 'A' &&
        range.intersectsNode(focusNode.nextElementSibling)
      ) {
        return focusNode.nextElementSibling;
      }

      if (focusNode.parentNode.tagName === 'A') {
        return focusNode.parentNode;
      }

      if (focusNode.nodeType === 1 && focusNode.closest('a')) {
        return focusNode.closest('a');
      }

      return null;
    }
  }
}
</script>
