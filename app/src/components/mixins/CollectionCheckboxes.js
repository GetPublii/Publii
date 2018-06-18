export default {
    computed: {
        anyCheckboxIsSelected () {
            return !!this.selectedItems.length;
        }
    },
    methods: {
        toggleAllCheckboxes (useArrayIndexAsID = false) {
            if(this.selectedItems.length > 0 && this.selectedItems.length >= this.items.length) {
                this.selectedItems = [];
            } else {
                this.selectedItems = [];

                if (!useArrayIndexAsID) {
                    for (let item of this.items) {
                        this.selectedItems.push(item.id);
                    }
                } else {
                    for (let i = 0; i < this.items.length; i++) {
                        this.selectedItems.push(i);
                    }
                }
            }
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
