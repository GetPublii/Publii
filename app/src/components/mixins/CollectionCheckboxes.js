export default {
    computed: {
        collectionSelectionIds () {
            return this.items.map(item => item.id);
        },
        collectionSelectedIds () {
            const selected = new Set(this.selectedItems);
            return this.collectionSelectionIds.filter(id => selected.has(id));
        },
        allVisibleSelected () {
            return this.collectionSelectionIds.length > 0 &&
                this.collectionSelectedIds.length === this.collectionSelectionIds.length;
        },
        someVisibleSelected () {
            return this.collectionSelectedIds.length > 0 && !this.allVisibleSelected;
        },
        anyCheckboxIsSelected () {
            return !!this.selectedItems.length;
        }
    },
    methods: {
        toggleAllCheckboxes () {
            this.selectedItems = this.allVisibleSelected ? [] : this.collectionSelectionIds.slice();
        },
        isChecked (id) {
            return this.selectedItems.indexOf(id) > -1;
        },
        toggleSelection (id) {
            let index = this.selectedItems.indexOf(id);

            if(index > -1) {
                this.selectedItems.splice(index, 1);
            } else {
                this.selectedItems.push(id);
            }
        },
        getSelectedItems (itemsCanBeFiltered = true) {
            let visibleIDs;
            let selectedItems;

            if(itemsCanBeFiltered) {
                visibleIDs = this.items.map(item => item.id);
                selectedItems = this.selectedItems.filter(id => visibleIDs.indexOf(id) > -1);
            } else {
                selectedItems = this.selectedItems;
            }

            return selectedItems;
        }
    }
};
