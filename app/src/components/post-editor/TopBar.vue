<template>
    <div class="post-editor-topbar">
        <p-button
            v-if="!sourceCodeEditorVisible"
            id="post-preview-button"
            type="outline icon"
            icon="off-live-preview"
            :disabled="!themeConfigured"
            :title="themeConfigured ? 'You have to configure theme for this website before generating preview of this post.' : ''"
            @click.native="generatePostPreview">
            Preview
        </p-button>

        <div
            v-if="!sourceCodeEditorVisible"
            class="post-editor-actions">
            
            <btn-dropdown
                ref="dropdown-button"
                :items="dropdownItems"
                :min-width="210"
                :defaultValue="retrieveCurrentAction()" />

            <p-button
                type="outline"
                @click.native="cancelPost">
                <template v-if="!$parent.possibleDataLoss">Close</template>
                <template v-if="$parent.possibleDataLoss">Cancel</template>
            </p-button>

            <p-button 
                icon="settings"
                type="outline icon only-icon"
                @click.native="$parent.toggleSidebar" />
        </div>

        <div
            v-if="sourceCodeEditorVisible"
            class="post-editor-source-code-actions">
            <p-button
                type="primary"
                @click.native="sourceCodeApply">
                Apply changes
            </p-button>

            <p-button
                type="outline"
                @click.native="sourceCodeCancel">
                Cancel
            </p-button>
        </div>
    </div>
</template>

<script>
import PostHelper from './PostHelper';
import { ipcRenderer } from 'electron';

export default {
    name: 'post-editor-top-bar',
    computed: {
        dropdownItems () {
            return [
                {
                    label: 'Save and close',
                    value: 'save-and-close',
                    isVisible: () => true,
                    onClick: this.dropdownSaveAndClose
                },
                {
                    label: 'Save',
                    value: 'save',
                    isVisible: () => true,
                    onClick: this.dropdownSave
                },
                {
                    label: 'Save as draft',
                    value: 'save-as-draft',
                    isVisible: () => !this.isDraft,
                    onClick: this.dropdownSaveAsDraft
                },
                {
                    label: this.$store.state.app.config.closeEditorOnSave ? 'Publish and close' : 'Publish post',
                    value: 'publish-post',
                    isVisible: () => this.isDraft,
                    onClick: this.dropdownPublish
                }
            ]
        },
        isDraft () {
            return this.$parent.postData.status.indexOf('draft') > -1;
        },
        themeConfigured () {
            return !!this.$store.state.currentSite.config.theme;
        }
    },
    data () {
        return {
            sourceCodeEditorVisible: false
        };
    },
    mounted () {
        this.$bus.$on('source-code-editor-show', () => {
            this.sourceCodeEditorVisible = true;
        });

        this.$bus.$on('source-code-editor-close', () => {
            this.sourceCodeEditorVisible = false;
        });

        this.$bus.$on('document-body-clicked', this.closeDropdownButton);
        this.$bus.$on('update-inline-editor', this.closeDropdownButton);
    },
    methods: {
        dropdownSave () {
            let status = this.$parent.postData.status.indexOf('draft') > -1 ? 'draft' : 'published';
            this.$parent.savePost(status, false, false);
            localStorage.setItem('publii-post-editor-current-action', 'save');
        },
        dropdownSaveAndClose () {
            let status = this.$parent.postData.status.indexOf('draft') > -1 ? 'draft' : 'published';
            this.$parent.savePost(status, false, true);
            localStorage.setItem('publii-post-editor-current-action', 'save-and-close');
        },
        dropdownSaveAsDraft () {
            this.$parent.savePost('draft');
            this.retrieveCurrentAction();
        },
        dropdownPublish () {
            this.$parent.savePost('published', false, this.$store.state.app.config.closeEditorOnSave);
            this.retrieveCurrentAction();
        },
        retrieveCurrentAction () {
            let currentAction = localStorage.getItem('publii-post-editor-current-action');

            if (!currentAction) {
                if (this.$store.state.app.config.closeEditorOnSave) {
                    currentAction = 'save-and-close';
                } else {
                    currentAction = 'save';
                }
            }

            if (this.$refs['dropdown-button']) {
                this.$refs['dropdown-button'].setValue(currentAction);
            }

            return currentAction;
        },
        closeDropdownButton () {
            if (this.$refs['dropdown-button']) {
                this.$refs['dropdown-button'].hideDropdown();
            }
        },
        cancelPost () {
            if(!this.$parent.possibleDataLoss) {
                this.$parent.closeEditor();
                return;
            }

            this.$bus.$emit('confirm-display', {
                message: 'You will lose all unsaved changes - do you want to continue?',
                okClick: this.cleanUpPost
            });
        },
        cleanUpPost () {
            // Get the text data
            let preparedText = this.$parent.postData.text;
            // Remove directory path from images src attribute
            let mediaPath = PostHelper.getMediaPath(this.$store, this.$parent.postID);
            preparedText = preparedText.split(mediaPath).join('#DOMAIN_NAME#');
            // Send an event which will remove unused images from the post editor
            ipcRenderer.send('app-post-cancel', {
                'site': this.$store.state.currentSite.config.name,
                'id': this.$parent.postID,
                'text': preparedText,
                'featuredImageFilename': this.$parent.postData.featuredImage.path,
                'featuredImageData': {
                    alt: this.$parent.postData.featuredImage.alt,
                    caption: this.$parent.postData.featuredImage.caption,
                    credits: this.$parent.postData.featuredImage.credits
                },
            });

            this.$parent.closeEditor();
        },
        sourceCodeApply () {
            this.$parent.$refs['source-code-editor'].applyChanges();
        },
        sourceCodeCancel () {
            this.$parent.$refs['source-code-editor'].cancelChanges();
        },
        generatePostPreview () {
            let postData = this.$parent.savePost('published', true);

            if (postData) {
                this.$bus.$emit('rendering-popup-display', {
                    postID: this.postID,
                    postData: postData
                });
            }
        }
    },
    beforeDestroy () {
        this.$bus.$off('source-code-editor-show');
        this.$bus.$off('source-code-editor-close');
        this.$bus.$off('document-body-clicked', this.closeDropdownButton);
        this.$bus.$off('update-inline-editor', this.closeDropdownButton);
    }
};
</script>

<style lang="scss">
@import '../../scss/variables.scss';
@import '../../scss/mixins.scss';

.post-editor {
    &-topbar {
        align-items: center;
        background: transparent;
        font-size: 2.4rem;
        display: flex;
        height: 5.6rem;
        justify-content: space-between;
        padding: 0 3.2rem;
        position: absolute;
        top: 4.5rem;
        width: 100%;
        z-index: 100001;
    }

    &-actions {
        display: flex;

        .button {
            text-align: center;

            &:nth-child(2) {
                margin-left: 1rem;
                width: 94px;
            }

            &:nth-child(3) {
                margin-left: 1rem;
            }
        }
    }

    &-source-code-actions {
        margin-left: auto;
        margin-top: -2.6rem;
    }

    #post-preview-button {
        padding-left: 2.4rem;
        text-align: center;
        width: 122px;
    }
}

/*
 * Windows & linux adjustments
 */
body[data-os="win"] {
    .post-editor {
        &-topbar {
            top: 3.6rem;
        }
    }
}

body[data-os="linux"] {
    .post-editor {
        &-topbar {
            top: 0;
        }
    }
}

@media (max-width: 1400px) {
    .post-editor-topbar {
        padding: 0 3.6rem 0 4rem;
    }
}
</style>
