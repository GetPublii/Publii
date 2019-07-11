<template>
    <div class="post-editor-button">
        <span 
            class="post-editor-button-trigger"
            @click.stop="doCurrentAction()">
            {{ getLabel }}
        </span>

        <span 
            class="post-editor-button-toggle"
            @click.stop="toggleDropdown()">
        </span>

        <div 
            v-if="dropdownVisible"
            class="post-editor-button-dropdown">
            <div
                class="post-editor-button-dropdown-item" 
                @click="setCurrentAction('save-and-close')">
                Save and close
            </div>
            <div 
                class="post-editor-button-dropdown-item" 
                @click="setCurrentAction('save')">
                Save
            </div>
            <div 
                class="post-editor-button-dropdown-item" 
                @click="setCurrentAction('save-as-draft')"
                v-if="!isDraft">
                Save as draft
            </div>
            <div 
                class="post-editor-button-dropdown-item" 
                @click="setCurrentAction('publish-post')"
                v-if="isDraft">
                <template v-if="!this.$store.state.app.config.closeEditorOnSave">Publish post</template>
                <template v-else>Publish and close</template>
            </div>
        </div>
    </div>
</template>

<script>
export default {
    name: 'btn-dropdown',
    props: {
        'items': {
            default: '',
            type: String
        },
        'localStorage': {
            defalt: '',
            type: String
        }
    },
    computed: {
        currentActionName () {
            switch (this.currentAction) {
                case 'save': return 'Save';
                case 'save-and-close': return 'Save and close';
                case 'save-as-draft': return 'Save as draft';
                case 'publish-post': return 'Publish post';
            }

            return '';
        }
    },
    data () {
        return {
            value: '',
            dropdownVisible: false
        };
    },
    methods: {
        getLabel () {

        },
        setCurrentAction (actionName) {
            if (actionName !== 'publish-post' && actionName !== 'save-as-draft') {
                localStorage.setItem('publii-post-editor-current-action', actionName);
            }

            this.value = actionName;
            this.dropdownVisible = false;
            this.doCurrentAction();
        },
        doCurrentAction () {
            this.dropdownVisible = false;

            if (this.value === 'save-and-close' || this.value === 'save') {
                if (this.postData.status.indexOf('draft') > -1) {
                    this.savePost('draft', false, this.value === 'save-and-close');
                } else {
                    this.savePost('published', false, this.value === 'save-and-close');
                }
            }

            if (this.value === 'save-as-draft') {
                this.savePost('draft');
                this.retrieveCurrentAction();
            }

            if (this.value === 'publish-post') {
                this.savePost('published', false, this.$store.state.app.config.closeEditorOnSave);
                this.retrieveCurrentAction();
            }
        },
        toggleDropdown () {
            this.dropdownVisible = !this.dropdownVisible;
        },
        hideDropdown () {
            this.dropdownVisible = false;
        },
        setValue (newValue) {
            this.value = newValue;
        },
        getValue () {
            return this.value;
        }
    }
}
</script>

<style lang="scss" scoped>
@import '../../scss/variables.scss';

</style>
