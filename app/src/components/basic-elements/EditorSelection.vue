<template>
    <div class="editor-selection">
        <h1 :id="contentType + '-editor-selection-title'">
            {{ $t('ui.chooseEditor') }}
        </h1>

        <fields-group
            class="editor-selection-panel"
            :aria-labelledby="contentType + '-editor-selection-title'">
            <ul class="editor-selection-list">
                <li
                    v-for="editor in editors"
                    :key="editor.type">
                    <button
                        type="button"
                        class="editor-selection-option"
                        :aria-labelledby="contentType + '-' + editor.type + '-title'"
                        :aria-describedby="contentType + '-' + editor.type + '-description'"
                        @click="$emit('select', editor.type)">
                        <span class="editor-selection-icon">
                            <icon
                                :name="editor.icon"
                                size="m"
                                :non-interactive="true"
                                aria-hidden="true" />
                        </span>

                        <span class="editor-selection-copy">
                            <span
                                :id="contentType + '-' + editor.type + '-title'"
                                class="editor-selection-name">
                                {{ $t(contentType + '.' + editor.label) }}
                            </span>
                            <span
                                :id="contentType + '-' + editor.type + '-description'"
                                class="editor-selection-description">
                                {{ $t(contentType + '.' + editor.label + 'Info') }}
                            </span>
                        </span>

                        <icon
                            name="chevron-right"
                            size="xs"
                            class="editor-selection-chevron"
                            :non-interactive="true"
                            aria-hidden="true" />
                    </button>
                </li>
            </ul>
        </fields-group>
    </div>
</template>

<script>
export default {
    name: 'editor-selection',
    props: {
        contentType: {
            type: String,
            required: true,
            validator: value => ['post', 'page'].includes(value)
        }
    },
    data () {
        return {
            editors: [
                {
                    type: 'tinymce',
                    icon: 'wysiwyg',
                    label: 'editorWYSIWYG'
                },
                {
                    type: 'blockeditor',
                    icon: 'block',
                    label: 'editorBlock'
                },
                {
                    type: 'markdown',
                    icon: 'markdown',
                    label: 'editorMarkdown'
                }
            ]
        };
    }
};
</script>

<style scoped>
.editor-selection {
    display: flex;
    flex-direction: column;
    margin: 0 auto;
    max-width: 74rem;
    min-height: 100%;
    width: 100%;

    &::before,
    &::after {
        content: '';
        flex: 1 0 0;
    }

    &::after {
        flex-grow: 1.5;
    }

    h1 {
        flex-shrink: 0;
        margin: 0 0 var(--space-12);
    }
}

.editor-selection-panel {
    border-radius: calc(var(--radius-base) * 2);
    flex-shrink: 0;
    margin: 0;
    padding: var(--space-16) var(--space-12) var(--space-16);
}

.editor-selection-list {
    list-style: none;
    margin: 0;
    padding: 0;
}

.editor-selection-option {
    align-items: center;
    background: transparent;
    border: 0;
    border-radius: calc(var(--radius-base) * 2);
    color: var(--text-primary-color);
    cursor: pointer;
    display: grid;
    font-family: var(--font-family-sans);
    gap: var(--space-12);
    grid-template-columns: auto minmax(0, 1fr) auto;
    line-height: var(--line-height-base);
    padding: calc(7 * var(--space-unit)) var(--space-6);
    text-align: left;
    width: 100%;

    &:hover {
        background: var(--color-surface-subtle);
    }

    &:focus-visible {
        background: var(--color-surface-subtle);
        outline: 2px solid var(--input-border-focus);
        outline-offset: 2px;
    }

    &:active {
        background: var(--color-control-surface-hover);
    }
}

.editor-selection-icon {
    align-items: center;
    background: var(--color-surface-subtle);
    border-radius: calc(var(--radius-base) * 2);
    color: var(--icon-secondary-color);
    display: flex;
    height: 5.6rem;
    justify-content: center;
    width: 5.6rem;
}

.editor-selection-option,
.editor-selection-icon,
.editor-selection-chevron {
    transition: var(--transition-default);
    transition-property: background-color, color;
}

.editor-selection-option:hover .editor-selection-icon,
.editor-selection-option:focus-visible .editor-selection-icon {
    background: var(--bg-secondary);
    color: var(--link-invert-color);
}

.editor-selection-copy {
    max-width: 60ch;
    min-width: 0;
    overflow-wrap: anywhere;
}

.editor-selection-name {
    display: block;
    font-size: var(--font-size-ui-lg);
    font-weight: var(--font-weight-semibold);
    margin-bottom: var(--space-1);
}

.editor-selection-option:hover .editor-selection-chevron,
.editor-selection-option:focus-visible .editor-selection-chevron {
    color: var(--link-invert-color);
}

.editor-selection-description {
    color: var(--text-light-color);
    display: block;
    font-size: var(--font-size-ui-sm);
    font-weight: var(--font-weight-regular);
}

.editor-selection-chevron {
    color: var(--icon-secondary-color);
}

@media (max-width: 1100px) {
    .editor-selection-option {
        gap: var(--space-8);
        padding-inline: var(--space-2);
    }

    .editor-selection-icon {
        height: 4.8rem;
        width: 4.8rem;
    }
}

@media (prefers-reduced-motion: reduce) {
    .editor-selection-option,
    .editor-selection-icon,
    .editor-selection-chevron {
        transition: none;
    }
}
</style>
