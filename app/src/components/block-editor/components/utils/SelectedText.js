import Vue from 'vue';

export default class SelectedText {
  constructor (inlineMenuContainer, blockType) {
    this.blockType = blockType;
    this.inlineMenuContainer = inlineMenuContainer;

    this.containedTags = {
      strong: false,
      em: false,
      u: false,
      s: false,
      code: false,
      mark: false,
      a: false
    };

    this.allowedOperations = {
      indent: true,
      outdent: true,
      clearFormatting: false
    };

    this.tagsToCheck = [
      'strong',
      'em',
      'u',
      's',
      'code',
      'mark',
      'a'
    ];
  }

  isInvalidTextSelection () {
    let selection = document.getSelection();
    return !selection || !selection.anchorNode || !selection.focusNode;
  }

  analyzeSelectedText () {
    if (this.isInvalidTextSelection()) {
      return;
    }

    let range = document.getSelection().getRangeAt(0);
    let commonAncestor = range.commonAncestorContainer;
    let tempElement = document.createElement('div');
    tempElement.appendChild(range.cloneContents());
    let htmlToCheck = tempElement.innerHTML;

    if (commonAncestor.nodeType === 3) {
      commonAncestor = commonAncestor.parentNode;
    }

    for (let i = 0; i < this.tagsToCheck.length; i++) {
      let tag = this.tagsToCheck[i];

      if (htmlToCheck.indexOf('<' + tag + ' ') > -1 || htmlToCheck.indexOf('</' + tag + '>') > -1) {
        Vue.set(this.containedTags, this.tagsToCheck[i], true);
      } else {
        if (commonAncestor.tagName === tag.toUpperCase() || commonAncestor.closest(tag) !== null) {
          Vue.set(this.containedTags, this.tagsToCheck[i], true);
        } else {
          Vue.set(this.containedTags, this.tagsToCheck[i], false);
        }
      }
    }

    tempElement.remove();

    if (this.blockType === 'publii-list') {
      Vue.set(this.allowedOperations, 'indent', this.checkIfElementCanBeNested());
      Vue.set(this.allowedOperations, 'outdent', this.checkIfElementCanBeFlattened());
    }
  }

  removeStyle (tag) {
    let range = document.getSelection().getRangeAt(0);
    let elementToWrap = null;

    if (range.startContainer.nodeType === 1 && range.startContainer.tagName === tag.toUpperCase()) {
      elementToWrap = range.startContainer;
    } else if (range.startContainer.nodeType === 3 && range.startContainer.parentNode.tagName === tag.toUpperCase()) {
      elementToWrap = range.startContainer.parentNode;
    } else if (range.startContainer.nodeType === 1 && range.startContainer.querySelector(tag)) {
      elementToWrap = range.startContainer.querySelector(tag);
    } else if (range.startContainer.nodeType === 3 && range.startContainer.parentNode.querySelector(tag)) {
      elementToWrap = range.startContainer.parentNode.querySelector(tag);
    } else if (range.startContainer.nodeType === 1 && range.startContainer.closest(tag)) {
      elementToWrap = range.startContainer.closest(tag);
    } else if (range.startContainer.nodeType === 3 && range.startContainer.parentNode.closest(tag)) {
      elementToWrap = range.startContainer.parentNode.closest(tag);
    } else if (range.endContainer.nodeType === 1 && range.endContainer.tagName === tag.toUpperCase()) {
      elementToWrap = range.endContainer;
    } else if (range.endContainer.nodeType === 3 && range.endContainer.parentNode.tagName === tag.toUpperCase()) {
      elementToWrap = range.endContainer.parentNode;
    } else if (range.startContainer.nodeType === 1 && range.endContainer.querySelector(tag)) {
      elementToWrap = range.endContainer.querySelector(tag);
    } else if (range.startContainer.nodeType === 3 && range.endContainer.parentNode.querySelector(tag)) {
      elementToWrap = range.endContainer.parentNode.querySelector(tag);
    } else if (range.endContainer.nodeType === 1 && range.endContainer.closest(tag)) {
      elementToWrap = range.endContainer.closest(tag);
    } else if (range.endContainer.nodeType === 3 && range.endContainer.parentNode.closest(tag)) {
      elementToWrap = range.endContainer.parentNode.closest(tag);
    }

    if (elementToWrap) {
      range.setStartBefore(elementToWrap);
      range.setEndAfter(elementToWrap);

      setTimeout(() => {
        let extractedContent = range.extractContents();
        let extractedContentChildren = extractedContent.children;
        let nodesToInsert = extractedContentChildren[0].childNodes;
        let firstNode = nodesToInsert[0];
        let lastNode = nodesToInsert[nodesToInsert.length - 1];

        for (let i = nodesToInsert.length - 1; i >= 0; i--) {
          range.insertNode(nodesToInsert[i]);
        }

        setTimeout(() => {
          range.setStartBefore(firstNode);
          range.setEndAfter(lastNode);
        }, 0);
      }, 0);
    }
  }

  checkIfElementCanBeNested () {
    let baseItem = document.getSelection().baseNode;
    let parentList;
    let listItem;

    if (document.getSelection().baseNode.nodeType === 3) {
      baseItem = document.getSelection().baseNode.parentNode;
    }

    parentList = baseItem.closest('ul,ol');

    if (document.getSelection().baseNode.tagName === 'LI') {
      listItem = baseItem;
    } else {
      listItem = baseItem.closest('li');
    }

    if (parentList.children.length <= 1 || parentList.children[0] === listItem) {
      return false;
    }

    return true;
  }

  checkIfElementCanBeFlattened () {
    let baseItem = document.getSelection().baseNode;
    let parentList;

    if (document.getSelection().baseNode.nodeType === 3) {
      baseItem = document.getSelection().baseNode.parentNode;
    }

    parentList = baseItem.closest('ul,ol');

    if (parentList !== null && parentList !== parentList.closest('.publii-block-list')) {
      return true;
    }

    return false;
  }
}
