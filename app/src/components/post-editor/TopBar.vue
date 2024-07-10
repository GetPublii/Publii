<template>
    <div class="post-editor-topbar">
        <label v-if="sourceCodeEditorVisible">
            {{ $t('editor.sourceCode') }}
        </label>
        
        <p-button
            v-if="!sourceCodeEditorVisible"
            id="post-back-to-posts-button"
            type="clean-invert icon"
            icon="arrow-left"
            @click.native="cancelItem">
            <template v-if="itemType === 'post'">
                {{ $t('ui.backToPosts') }}
            </template>
            <template v-else-if="itemType === 'page'">
                {{ $t('ui.backToPages') }}
            </template>
        </p-button>

        <p-button
            v-if="!sourceCodeEditorVisible"
            id="post-preview-button"
            type="clean-invert"
            :disabled="!themeConfigured"
            :title="themeConfigured ? $t('post.configureThemeBeforeGeneratingPreview') : ''"
            @click.native="generatePostPreview">
            {{ $t('ui.preview') }}
        </p-button>

        <div
            v-if="!sourceCodeEditorVisible"
            class="post-editor-actions">

            <btn-dropdown
                ref="dropdown-button"
                :items="dropdownItems"
                :defaultValue="retrieveCurrentAction()" />

            <p-button
                icon="settings"
                :type="$parent.sidebarVisible ? 'clean clean-invert icon only-icon-color' : 'clean clean-invert icon only-icon'"
                @click.native="$parent.toggleSidebar" />
        </div>

        <div
            v-if="sourceCodeEditorVisible"
            class="post-editor-source-code-actions">
            <p-button
                type="clean"
                @click.native="sourceCodeCancel">
                {{ $t('ui.goBack') }}
            </p-button>

            <p-button
                v-if="sourceCodeEditorVisible"
                type="secondary icon"
                icon="source-code"
                @click.native="$bus.$emit('source-code-editor-beautify-code')">
                {{ $t('ui.beautifyCode') }}
            </p-button>

            <p-button
                type="primary"
                @click.native="sourceCodeApply">
                {{ $t('ui.applyChanges') }}
            </p-button>

        </div>
    </div>
</template>

<script>
import ItemHelper from './ItemHelper';

export default {
    name: 'post-editor-top-bar',
    props: [
        'itemType'
    ],
    computed: {
        dropdownItems () {
            return [
                {
                    label: this.isDraft ? this.$t('ui.saveDraftAndClose') : this.$t('ui.saveAndClose'),
                    value: 'save-and-close',
                    isVisible: () => true,
                    onClick: this.dropdownSaveAndClose
                },
                {
                    label: this.isDraft ? this.$t('ui.saveDraft') : this.$t('ui.save'),
                    value: 'save',
                    isVisible: () => true,
                    onClick: this.dropdownSave
                },
                {
                    label: this.$t('ui.saveAsDraft'),
                    value: 'save-as-draft',
                    isVisible: () => !this.isDraft,
                    onClick: this.dropdownSaveAsDraft
                },
                {
                    label: this.$store.state.app.config.closeEditorOnSave ? this.$t('ui.publishAndClose') : this.$t('ui.publishPost'),
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
        cancelItem () {
            if (!this.$parent.possibleDataLoss) {
                this.$parent.closeEditor();
                return;
            }

            this.$bus.$emit('confirm-display', {
                message: this.$t('ui.cancelWarningMsg'),
                isDanger: true,
                okClick: this.cleanUpItem
            });
        },
        cleanUpItem () {
            // Get the text data
            let preparedText = this.$parent.postData.text;
            // Remove directory path from images src attribute
            let mediaPath = ItemHelper.getMediaPath(this.$store, this.$parent.postID, this.itemType);
            preparedText = preparedText.replace(/file:(\/){1,}/gmi, 'file:///');
            preparedText = preparedText.split(mediaPath).join('#DOMAIN_NAME#');
            preparedText = preparedText.replace(/file:(\/){1,}\#DOMAIN_NAME\#/gmi, '#DOMAIN_NAME#');
            // Send an event which will remove unused images from the post editor
            let eventToSend = 'app-post-cancel';

            if (this.itemType === 'page') {
                eventToSend = 'app-page-cancel';
            }

            mainProcessAPI.send(eventToSend, {
                'site': this.$store.state.currentSite.config.name,
                'id': this.$parent.postID,
                'text': preparedText,
                'featuredImageFilename': this.$parent.postData.featuredImage.path,
                'featuredImageData': {
                    alt: this.$parent.postData.featuredImage.alt,
                    caption: this.$parent.postData.featuredImage.caption,
                    credits: this.$parent.postData.featuredImage.credits
                }
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
            this.$parent.savePost('published', true);
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
        font-size: 1.4rem;
        display: flex;
        height: 5.6rem;
        justify-content: space-between;
        padding: 0 3.2rem;
        position: absolute;
        top: 3.6rem;
        width: 100%;
        z-index: 100001;
    }

    &-actions {
        display: flex;
        margin-left: auto;

        .button {
            text-align: center;

            &:nth-child(2) {
                margin-left: 1rem;
                margin-right: -1.7rem; // button padding
            }
        }
    }

    &-source-code-actions {
        margin-left: auto;
    }

    #post-preview-button {
        background: var(--bg-primary);
    }

    #post-back-to-posts-button {
        background: var(--bg-primary);
        margin-left: -2.1rem;
        margin-right: .625rem;
        padding-left: 3.4rem;
        padding-right: .625rem;
        position: relative;

        &::after {
            border-right: 1px solid var(--gray-2);
            content: "";
            height: 1.4rem;
            right: -.9375rem;
            @include centerXY(false, true);
        }
    }
}

/*
 * Windows & linux adjustments
 */

body[data-os="linux"] {
    .post-editor {
        &-topbar {
            top: 0;
        }
    }
}
</style>
