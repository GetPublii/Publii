<script>
export default {
  name: 'LinkConfig',
  data () {
    return {
      linkCreationMode: 'new'
    };
  },
  mounted () {
    this.$bus.$on('block-editor-save-link-popup', this.saveLinkConfig);
    this.$bus.$on('block-editor-hide-link-popup', this.removeHighlight);
  },
  methods: {
    saveLinkConfig (blockID, linkConfig) {
      if (
        blockID !== this.id ||
        this.$parent.blockType === 'publii-header' ||
        this.$parent.blockType === 'publii-image'
      ) {
        return;
      }

      this.config.link = JSON.parse(JSON.stringify(linkConfig));

      if (this.config.link.url !== '') {
        if (this.linkCreationMode === 'new') {
          this.createNewLinkFromSelection();
        } else if (this.linkCreationMode === 'edit') {
          this.editSelectedLink();
        }
      }

      this.save();
    },
    showLinkPopupWithoutHighlight () {
      this.$bus.$emit('block-editor-show-link-popup', this.id, this.config.link);
    },
    showLinkPopup () {
      this.addHighlight();

      if (this.config.link) {
        this.$bus.$emit('block-editor-show-link-popup', this.id, this.config.link);
      } else {
        let linkConfig = {
          url: '',
          noFollow: false,
          targetBlank: false,
          sponsored: false,
          ugc: false,
          download: false
        };

        this.$bus.$emit('block-editor-show-link-popup', this.id, linkConfig);
      }
    },
    setLink (blockID, linkConfig) {
      if (blockID !== this.id) {
        return;
      }

      this.config.link.url = linkConfig.url;
      this.config.link.noFollow = linkConfig.noFollow;
      this.config.link.targetBlank = linkConfig.targetBlank;
      this.config.link.sponsored = linkConfig.sponsored;
      this.config.link.ugc = linkConfig.ugc;
      this.config.link.download = linkConfig.download;
      this.save();
    },
    removeLink () {
      this.config.link = {
        url: '',
        noFollow: false,
        targetBlank: false,
        sponsored: false,
        ugc: false,
        download: false
      };

      this.save();
    },
    addHighlight () {
      let selection = document.getSelection();
      let linkInSelection = this.findFirstLinkInSelection(selection);

      if (linkInSelection) {
        this.linkCreationMode = 'edit';
        linkInSelection.classList.add('is-highlighted');
        this.selectElement(linkInSelection);
        linkInSelection.setAttribute('data-link-popup-id', this.id);

        this.config.link = {
          url: linkInSelection.getAttribute('href'),
          targetBlank: linkInSelection.getAttribute('target') === '_blank',
          noFollow: linkInSelection.getAttribute('rel') && linkInSelection.getAttribute('rel').indexOf('nofollow noopener') > -1,
          sponsored: linkInSelection.getAttribute('rel') && linkInSelection.getAttribute('rel').indexOf('sponsored') > -1,
          ugc: linkInSelection.getAttribute('rel') && linkInSelection.getAttribute('rel').indexOf('ugc') > -1,
          download: linkInSelection.getAttribute('download') !== null
        };
      } else {
        let wrapper = document.createElement('span');
        wrapper.setAttribute('class', 'is-highlighted');
        let range = selection.getRangeAt(0).cloneRange();
        range.surroundContents(wrapper);
        selection.removeAllRanges();
        selection.addRange(range);
        this.linkCreationMode = 'new';

        this.config.link = {
          url: '',
          noFollow: false,
          targetBlank: false,
          sponsored: false,
          ugc: false,
          download: false
        };
      }

      setTimeout(() => {
        this.updateInlineMenuPosition();
      }, 0);
    },
    removeHighlight () {
      setTimeout(() => {
        let highlightedText = document.querySelector('.is-highlighted');
        let selection = window.getSelection();
        let range = document.createRange();

        if (highlightedText) {
          range.setStartBefore(highlightedText);
          range.setEndAfter(highlightedText);

          setTimeout(() => {
            if (highlightedText.tagName === 'A') {
              highlightedText.classList.remove('is-highlighted');
              selection.removeAllRanges();
              selection.addRange(range);
              return;
            }

            let extractedContent = range.extractContents();
            let extractedContentChildren = extractedContent.children;

            if (extractedContentChildren[0]) {
              let nodesToInsert = extractedContentChildren[0].childNodes;
              let firstNode = nodesToInsert[0];
              let lastNode = nodesToInsert[nodesToInsert.length - 1];

              for (let i = nodesToInsert.length - 1; i >= 0; i--) {
                range.insertNode(nodesToInsert[i]);
              }

              setTimeout(() => {
                range.setStartBefore(firstNode);
                range.setEndAfter(lastNode);
                selection.removeAllRanges();
                selection.addRange(range);
              }, 0);
            }
          }, 0);
        }
      }, 100);
    },
    createNewLinkFromSelection () {
      let highlightedText = document.querySelector('.is-highlighted');
      let linkElement = document.createElement('a');
      let temporaryID = +new Date();
      let relAttr = [];
      linkElement.setAttribute('href', this.config.link.url);
      linkElement.setAttribute('data-temp-id', temporaryID);

      if (this.config.link.targetBlank) {
        linkElement.setAttribute('target', '_blank');
      }

      if (this.config.link.noFollow) {
        relAttr.push('nofollow noopener');
      }

      if (this.config.link.sponsored) {
        relAttr.push('sponsored');
      }

      if (this.config.link.ugc) {
        relAttr.push('ugc');
      }

      if (relAttr.length) {
        linkElement.setAttribute('rel', relAttr.join(' '));
      }

      if (this.config.link.download) {
        linkElement.setAttribute('download', 'download');
      }

      linkElement.innerHTML = highlightedText.innerHTML;
      highlightedText.parentNode.insertBefore(linkElement, highlightedText);
      highlightedText.parentNode.removeChild(highlightedText);

      setTimeout(() => {
        let element = document.querySelector('a[data-temp-id="' + temporaryID + '"]');
        element.removeAttribute('data-temp-id');
        this.selectElement(element);
      }, 0);

      this.selectedText.containedTags.a = true;
    },
    editSelectedLink () {
      if (this.config.link.url === '') {
        this.removeLink();
        return;
      }

      let selectedLink = document.querySelector('a[data-link-popup-id="' + this.id + '"]');
      selectedLink.setAttribute('href', this.config.link.url);
      let relAttr = [];

      if (this.config.link.targetBlank) {
        selectedLink.setAttribute('target', '_blank');
      }

      if (this.config.link.noFollow) {
        relAttr.push('nofollow noopener');
      }

      if (this.config.link.sponsored) {
        relAttr.push('sponsored');
      }

      if (this.config.link.ugc) {
        relAttr.push('ugc');
      }

      if (relAttr.length) {
        selectedLink.setAttribute('rel', relAttr.join(' '));
      }

      if (this.config.link.download) {
        selectedLink.setAttribute('download', 'download');
      }

      setTimeout(() => {
        let selectedLink = document.querySelector('a[data-link-popup-id="' + this.id + '"]');
        selectedLink.classList.remove('is-highlighted');
        this.selectElement(selectedLink);

        setTimeout(() => {
          let selectedLink = document.querySelector('a[data-link-popup-id="' + this.id + '"]');
          selectedLink.removeAttribute('data-link-popup-id');
        }, 0);
      }, 0);
    },
    selectElement (element) {
      let selection = window.getSelection();
      selection.removeAllRanges();
      let range = document.createRange();
      range.selectNodeContents(element);
      selection.addRange(range);

      setTimeout(() => {
        this.updateInlineMenuPosition();
      }, 0);
    }
  },
  beforeDestroy () {
    this.$bus.$off('block-editor-save-link-popup', this.saveLinkConfig);
    this.$bus.$off('block-editor-hide-link-popup', this.removeHighlight);
  }
};
</script>
